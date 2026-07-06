/**
 * Move-quality taxonomy for the Ivory Analysis Workspace (System Design §5.1,
 * Architecture §8/§10). The canonical taxonomy is:
 *
 *   brilliant · best · good · inaccuracy · mistake · blunder
 *
 * NOTE: the legacy `utils/moveClassifier.ts` (used by the legacy GameViewer)
 * uses `best · excellent · good · inaccuracy · mistake · blunder`. This module
 * is the NEW, spec-aligned classifier; legacy is left untouched (strangler).
 * Decision (approved): legacy `excellent` → `best`.
 */
import type { MoveQuality } from '../../components/ui/iv';

export type { MoveQuality };

/** Ordering for summaries / counts (best-to-worst, brilliant first). */
export const MQ_ORDER: MoveQuality[] = ['brilliant', 'best', 'good', 'inaccuracy', 'mistake', 'blunder'];

/** Chess-convention symbols (paired with label/color — never color-only, §11). */
export const MQ_SYMBOL: Record<MoveQuality, string> = {
  brilliant: '!!', best: '!', good: '', inaccuracy: '?!', mistake: '?', blunder: '??',
};

export const MQ_LABEL: Record<MoveQuality, string> = {
  brilliant: 'Brilliant', best: 'Best', good: 'Good',
  inaccuracy: 'Inaccuracy', mistake: 'Mistake', blunder: 'Blunder',
};

/** Map a legacy classification string to the spec taxonomy (excellent → best). */
export function mapLegacyClassification(legacy: string): MoveQuality {
  switch (legacy) {
    case 'brilliant': return 'brilliant';
    case 'best': return 'best';
    case 'excellent': return 'best';   // approved mapping
    case 'good': return 'good';
    case 'inaccuracy': return 'inaccuracy';
    case 'mistake': return 'mistake';
    case 'blunder': return 'blunder';
    default: return 'good';
  }
}

export interface ClassifyInput {
  /** Centipawn loss vs the engine's best move (>= 0). */
  cpLoss: number;
  /** True when the played move equals the engine's top move. */
  isTopMove: boolean;
  /** True when the top move is a non-obvious material sacrifice. */
  isSacrifice?: boolean;
}

/**
 * Deterministic classification by centipawn loss (Architecture §10 thresholds):
 *   brilliant = best move that is a non-obvious sacrifice
 *   best      = matches engine top move
 *   good      ≤ 50cp · inaccuracy 50–100 · mistake 100–250 · blunder > 250
 */
export function classifyMoveQuality({ cpLoss, isTopMove, isSacrifice = false }: ClassifyInput): MoveQuality {
  if (isTopMove && isSacrifice) return 'brilliant';
  if (isTopMove || cpLoss <= 10) return 'best';
  if (cpLoss <= 50) return 'good';
  if (cpLoss <= 100) return 'inaccuracy';
  if (cpLoss <= 250) return 'mistake';
  return 'blunder';
}

export type MoveCounts = Record<MoveQuality, number>;

export function emptyCounts(): MoveCounts {
  return { brilliant: 0, best: 0, good: 0, inaccuracy: 0, mistake: 0, blunder: 0 };
}

/**
 * Win probability (0–100, from WHITE's perspective) for a White-POV centipawn
 * eval — the logistic model Lichess uses (k = 0.00368208). Mate-ish evals
 * saturate near 0/100. This is the conversion the accuracy curve actually needs:
 * accuracy must be computed from the drop in *win %*, not from raw centipawns.
 */
export function winPercentFromCp(cp: number): number {
  const c = Math.max(-2000, Math.min(2000, cp));
  return 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * c)) - 1);
}

/** A played move, as needed to score its accuracy. */
export interface AccuracyMove {
  color: 'white' | 'black';
  /** Engine eval AFTER the move, centipawns, White POV. */
  evalCpAfter: number;
  /** The mover's centipawn loss vs the engine best (>= 0). */
  cpLoss: number;
}

/**
 * Accuracy % for a single move: the Lichess curve applied to the drop in the
 * MOVER's win percentage.
 *   acc = 103.1668 * exp(-0.04354 * winPctLost) - 3.1669, clamped 0–100.
 *
 * The eval before the move is reconstructed exactly from `evalCpAfter` + the
 * signed `cpLoss` (so a move that loses nothing scores ~100%). Both evals are
 * converted to the mover's win% first — feeding raw centipawns into the curve
 * (the previous bug) collapsed every real game to ~0%.
 */
export function moveAccuracyPercent({ color, evalCpAfter, cpLoss }: AccuracyMove): number {
  const evalCpBefore = color === 'white' ? evalCpAfter + cpLoss : evalCpAfter - cpLoss;
  const winBefore = color === 'white' ? winPercentFromCp(evalCpBefore) : 100 - winPercentFromCp(evalCpBefore);
  const winAfter = color === 'white' ? winPercentFromCp(evalCpAfter) : 100 - winPercentFromCp(evalCpAfter);
  const winPctLost = Math.max(0, winBefore - winAfter);
  const acc = 103.1668 * Math.exp(-0.04354 * winPctLost) - 3.1669;
  return Math.max(0, Math.min(100, acc));
}

/** Mean accuracy % (0–100) over a set of moves; null when the set is empty. */
export function meanAccuracy(moves: AccuracyMove[]): number | null {
  if (!moves.length) return null;
  return moves.reduce((sum, m) => sum + moveAccuracyPercent(m), 0) / moves.length;
}
