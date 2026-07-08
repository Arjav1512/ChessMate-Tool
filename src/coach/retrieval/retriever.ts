import type { CoachContext } from '../context/types';
import { KNOWLEDGE_BASE, type KnowledgeDoc } from '../knowledge';
import type { CoachTask } from '../prompts/templates';

// ─────────────────────────────────────────────────────────────────────────────
// Structured retrieval (Coach Foundation, Deliverable 6) — Phase-1 RAG.
//
// Deterministic tag matching, in a fixed priority order:
//   opening → theme/phase → mistake classification → motif
// No embeddings, no vector search, no scoring model — the same query always
// returns the same documents, which makes retrieval unit-testable and the
// prompt reproducible.
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

function matches(doc: KnowledgeDoc, term: string): boolean {
  const needle = term.trim().toLowerCase();
  if (!needle) return false;
  return (
    doc.title.toLowerCase().includes(needle) ||
    doc.tags.some((tag) => needle.includes(tag) || tag.includes(needle))
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
  take(query.mistake);
  for (const motif of query.motifs ?? []) take(motif);

  return picked;
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
