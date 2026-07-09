import type { CoachEvaluation } from '../context/types';
import type { EvaluationProvider } from './types';

/**
 * The Phase-1 EvaluationProvider: serves evaluations the existing Stockfish
 * pipeline already produced (e.g. per-FEN results from move_analysis or a
 * live-eval session), keyed by FEN. It wraps stored output — it never runs
 * an engine.
 */
export class PrecomputedEvaluationProvider implements EvaluationProvider {
  readonly id = 'precomputed';

  private readonly byFen: ReadonlyMap<string, CoachEvaluation>;

  constructor(evaluations: ReadonlyMap<string, CoachEvaluation>) {
    this.byFen = evaluations;
  }

  async evaluate(fen: string): Promise<CoachEvaluation | null> {
    return this.byFen.get(fen) ?? null;
  }
}
