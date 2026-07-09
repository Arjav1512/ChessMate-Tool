import type { CoachContext } from '../context/types';
import { KNOWLEDGE_BASE, type KnowledgeDoc } from '../knowledge';
import type { CoachTask } from '../prompts/templates';
import type { KnowledgeRetriever } from './types';

// ─────────────────────────────────────────────────────────────────────────────
// Structured retrieval (Coach Foundation, Deliverable 6) — Phase-1 RAG.
//
// Deterministic tag matching, in a fixed priority order:
//   opening → theme/phase → motif → mistake classification
// Motifs outrank the bare classification because they are more specific: a
// hung-piece blunder should surface the hanging-pieces doc before generic
// calculation advice — with rich Phase-2 docs the prompt budget often fits
// only the first doc, so priority is selection. No embeddings, no vector
// search, no scoring model — the same query always returns the same
// documents, which makes retrieval unit-testable and the prompt reproducible.
// ─────────────────────────────────────────────────────────────────────────────

export interface RetrievalQuery {
  opening?: string;
  /** Free-form theme or game phase ('endgame', 'opening', …). */
  theme?: string;
  /** Move classification ('mistake' | 'blunder' | …). */
  mistake?: string;
  /** Motif ids from lib/motifs (e.g. 'hung_piece'). */
  motifs?: string[];
  /** Rating-band needle ('under 1200' | 'intermediate' | 'advanced') — taken
   *  LAST so personalized guidance fills a spare slot, never displaces a
   *  position-specific doc (R3). */
  ratingBand?: string;
}

/** Deterministic rating → band needle (matches the rating/ doc tags). */
export function ratingBandOf(rating: number | null | undefined): string | undefined {
  if (rating == null || rating <= 0) return undefined;
  if (rating < 1200) return 'under 1200';
  if (rating <= 1800) return 'intermediate';
  return 'advanced';
}

// ─────────────────────────────────────────────────────────────────────────────
// Endgame family detection (Phase 3B / R4).
//
// The generic 'endgame' needle was material-blind: a queens-only ending
// retrieved rook-endgame doctrine (PHASE_3A_VALIDATION_REPORT §1, worst
// scenario). Classify the FEN's material into a deterministic family — the
// same cheap placement scan derivePhase uses, no chess engine — and retrieve
// family-specific doctrine instead.
// ─────────────────────────────────────────────────────────────────────────────

export type EndgameFamily =
  | 'king-pawn'
  | 'rook'
  | 'rook-pawn'
  | 'queen'
  | 'queen-pawn'
  | 'minor-piece'
  | 'opposite-colored-bishops'
  | 'same-colored-bishops'
  | 'mixed';

/** Family → needle matching the existing endgames/ doc tags. Families that
 *  share doctrine share a doc: ±pawns changes nothing about whose doctrine
 *  applies, and both bishop endings live in the minor-piece doc today. */
const ENDGAME_FAMILY_NEEDLE: Record<EndgameFamily, string> = {
  'king-pawn': 'pawn endgame',
  rook: 'rook endgame',
  'rook-pawn': 'rook endgame',
  queen: 'queen endgame',
  'queen-pawn': 'queen endgame',
  'minor-piece': 'minor piece endgame',
  'opposite-colored-bishops': 'bishop endgame',
  'same-colored-bishops': 'bishop endgame',
  mixed: 'endgame',
};

/** Classify a FEN's combined material into an endgame family. Pure and
 *  deterministic; returns 'mixed' when the material fits no pure family. */
export function endgameFamilyOf(fen: string): EndgameFamily {
  const placement = fen.split(' ')[0] ?? '';
  let queens = 0;
  let rooks = 0;
  let knights = 0;
  let pawns = 0;
  const bishopColors: { white: number[]; black: number[] } = { white: [], black: [] };

  let rank = 0;
  let file = 0;
  for (const ch of placement) {
    if (ch === '/') {
      rank++;
      file = 0;
      continue;
    }
    if (ch >= '1' && ch <= '8') {
      file += Number(ch);
      continue;
    }
    const lower = ch.toLowerCase();
    if (lower === 'q') queens++;
    else if (lower === 'r') rooks++;
    else if (lower === 'n') knights++;
    else if (lower === 'p') pawns++;
    else if (lower === 'b') bishopColors[ch === 'B' ? 'white' : 'black'].push((rank + file) % 2);
    file++;
  }
  const bishops = bishopColors.white.length + bishopColors.black.length;
  const minors = bishops + knights;

  if (queens > 0 && rooks === 0 && minors === 0) return pawns > 0 ? 'queen-pawn' : 'queen';
  if (rooks > 0 && queens === 0 && minors === 0) return pawns > 0 ? 'rook-pawn' : 'rook';
  if (queens === 0 && rooks === 0 && minors > 0) {
    if (knights === 0 && bishopColors.white.length === 1 && bishopColors.black.length === 1) {
      return bishopColors.white[0] === bishopColors.black[0]
        ? 'same-colored-bishops'
        : 'opposite-colored-bishops';
    }
    return 'minor-piece';
  }
  if (queens === 0 && rooks === 0 && minors === 0) return 'king-pawn';
  return 'mixed';
}

/** The endgame theme needle: family-specific when the FEN tells us, generic
 *  'endgame' when there is no FEN or the material is mixed. */
export function endgameThemeOf(fen: string | undefined): string {
  return fen ? ENDGAME_FAMILY_NEEDLE[endgameFamilyOf(fen)] : 'endgame';
}

/** Default budget: the whole prompt must fit the provider's ~4000-char cap. */
const DEFAULT_LIMIT = 2;

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Match strength of a doc for a term: the length of the LONGEST tag that
 * equals the term or appears in it as a whole word; 0 when nothing matches.
 * Deliberately NOT raw substring in either direction: needle-in-tag would let
 * a short term match unrelated long tags ("material" → "missed_material_gain"),
 * and fragment matches would fire on accidents ("pins" → "Pinsk").
 *
 * Length-as-strength makes specific tags beat generic ones within one needle
 * ('queen endgame' picks the queen doc over docs carrying the bare 'endgame'
 * tag) while equal-specificity matches keep deterministic array order.
 */
function matchStrength(doc: KnowledgeDoc, needle: string): number {
  let strength = 0;
  for (const tag of doc.tags) {
    if (tag.length > strength && (tag === needle || new RegExp(`\\b${escapeRegExp(tag)}\\b`).test(needle))) {
      strength = tag.length;
    }
  }
  return strength;
}

/**
 * Return the knowledge documents relevant to the query, strongest signal
 * first, deduplicated, capped at `limit`.
 */
export function retrieveKnowledge(
  query: RetrievalQuery,
  docs: KnowledgeDoc[] = KNOWLEDGE_BASE,
  limit: number = DEFAULT_LIMIT,
): KnowledgeDoc[] {
  const picked: KnowledgeDoc[] = [];
  const take = (term: string | undefined) => {
    const needle = term?.trim().toLowerCase();
    if (!needle) return;
    const candidates = docs
      .map((doc, index) => ({ doc, index, strength: matchStrength(doc, needle) }))
      .filter((c) => c.strength > 0 && !picked.includes(c.doc))
      .sort((a, b) => b.strength - a.strength || a.index - b.index);
    // A needle admits only its MOST specific match tier: 'queen endgame' takes
    // the queen doc alone (not every doc with the bare 'endgame' tag), leaving
    // the remaining slot for the next signal. Equal-specificity ties keep
    // array order, so generic needles behave exactly as before.
    for (const { doc, strength } of candidates) {
      if (picked.length >= limit || strength < candidates[0].strength) return;
      picked.push(doc);
    }
  };

  take(query.opening);
  take(query.theme);
  for (const motif of query.motifs ?? []) take(motif);
  take(query.mistake);
  take(query.ratingBand);

  return picked;
}

/**
 * The Phase-1 KnowledgeRetriever: deterministic tag matching over an injected
 * corpus. Kept as a thin class over the pure functions above so the strategy
 * stays unit-testable while the pipeline depends only on the interface.
 */
export class StructuredRetriever implements KnowledgeRetriever {
  readonly id = 'structured';

  private readonly docs: KnowledgeDoc[];
  private readonly limit: number;

  constructor(docs: KnowledgeDoc[] = KNOWLEDGE_BASE, limit: number = DEFAULT_LIMIT) {
    this.docs = docs;
    this.limit = limit;
  }

  async retrieve(context: CoachContext, task: CoachTask): Promise<KnowledgeDoc[]> {
    return retrieveKnowledge(queryFromContext(context, task), this.docs, this.limit);
  }
}

/** Derive the retrieval query from an assembled coach context + task. */
export function queryFromContext(context: CoachContext, task: CoachTask): RetrievalQuery {
  const move = context.move;
  const isError = move?.classification === 'mistake' || move?.classification === 'blunder';
  // For an opening lesson the opening doc is the strongest signal; otherwise
  // it still leads when the position is IN the opening phase.
  const openingRelevant = task === 'opening' || move?.phase === 'opening' || !move?.phase;
  return {
    opening: openingRelevant ? context.game?.opening?.name : undefined,
    // Theme by phase: 'endgame' as before; 'opening' is the R2 fallback so
    // openings WITHOUT a dedicated doc (Philidor, Petrov, Dutch, …) still
    // retrieve general opening principles instead of nothing. "middlegame"
    // stays excluded — it would match generic docs ahead of the concrete
    // mistake/motif.
    theme:
      move?.phase === 'endgame'
        ? endgameThemeOf(context.fen)
        : openingRelevant && (context.game?.opening || move?.phase === 'opening')
          ? 'opening'
          : undefined,
    mistake: isError ? move?.classification : undefined,
    motifs: (move?.motifs ?? []).map(String),
    ratingBand: ratingBandOf(context.player?.rating),
  };
}
