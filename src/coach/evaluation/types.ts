import type { CoachEvaluation } from '../context/types';

// ─────────────────────────────────────────────────────────────────────────────
// Evaluation abstraction (Refinement goal 6).
//
// Where engine truth comes from is a strategy: today every evaluation is
// precomputed by the existing Stockfish analysis pipeline and arrives with
// the request context; future strategies may consult a live worker, a cloud
// engine, or a cache. The orchestrator uses this interface only to FILL A GAP
// (a position with no evaluation in context) — it never re-runs analysis, and
// the current analysis pipeline is untouched.
// ─────────────────────────────────────────────────────────────────────────────

export interface EvaluationProvider {
  readonly id: string;
  /** Evaluation for a FEN, or null when this strategy has none. */
  evaluate(fen: string): Promise<CoachEvaluation | null>;
}
