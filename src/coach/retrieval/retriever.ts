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
  /** Free-form theme or game phase ('endgame', 'initiative', 'pin', …). */
  theme?: string;
  /** Move classification ('mistake' | 'blunder' | …). */
  mistake?: string;
  /** Motif ids from lib/motifs (e.g. 'hung_piece'). */
  motifs?: string[];
}

/** Default budget: the whole prompt must fit the provider's ~4000-char cap. */
const DEFAULT_LIMIT = 2;

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * A doc matches when one of its tags equals the term or appears in it as a
 * whole word ("sicilian" in "sicilian defense"). Deliberately NOT raw
 * substring in either direction: needle-in-tag would let a short term match
 * unrelated long tags ("material" → "missed_material_gain"), and fragment
 * matches would fire on accidents ("pins" → "Pinsk"). Whole-word only keeps
 * retrieval deterministic by design as the corpus grows.
 */
function matches(doc: KnowledgeDoc, term: string): boolean {
  const needle = term.trim().toLowerCase();
  if (!needle) return false;
  return doc.tags.some(
    (tag) => tag === needle || new RegExp(`\\b${escapeRegExp(tag)}\\b`).test(needle),
  );
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
    if (!term) return;
    for (const doc of docs) {
      if (picked.length >= limit) return;
      if (!picked.includes(doc) && matches(doc, term)) picked.push(doc);
    }
  };

  take(query.opening);
  take(query.theme);
  for (const motif of query.motifs ?? []) take(motif);
  take(query.mistake);

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
  return {
    // For an opening lesson the opening doc is the strongest signal; otherwise
    // it still leads when the position is IN the opening phase.
    opening:
      task === 'opening' || move?.phase === 'opening' || !move?.phase
        ? context.game?.opening?.name
        : undefined,
    // Only the endgame is specific enough to retrieve by phase; "middlegame"
    // would match generic strategy docs ahead of the concrete mistake/motif.
    theme: move?.phase === 'endgame' ? 'endgame' : undefined,
    mistake: isError ? move?.classification : undefined,
    motifs: (move?.motifs ?? []).map(String),
  };
}
