import type { CoachContext } from '../context/types';
import type { KnowledgeDoc } from '../knowledge';
import type { CoachTask } from '../prompts/templates';

// ─────────────────────────────────────────────────────────────────────────────
// Retrieval abstraction (Refinement goal 3).
//
// The pipeline depends on this interface, never on a strategy. The interface
// takes the assembled context — not a pre-derived query — because each
// strategy derives relevance differently: the structured retriever matches
// tags deterministically; a future VectorRetriever would embed the rendered
// context; a HybridRetriever would combine both. It is async for the same
// reason: tag matching is sync today, embedding lookups will not be.
// ─────────────────────────────────────────────────────────────────────────────

export interface KnowledgeRetriever {
  readonly id: string;
  retrieve(context: CoachContext, task: CoachTask): Promise<KnowledgeDoc[]>;
}
