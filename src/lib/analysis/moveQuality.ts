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

/** Convert mean centipawn loss to an accuracy % (Lichess-style curve). */
export function accuracyFromAvgCpLoss(avgCpLoss: number): number {
  // 103.1668 * exp(-0.04354 * acpl) - 3.1669, clamped 0–100.
  const acc = 103.1668 * Math.exp(-0.04354 * Math.max(0, avgCpLoss)) - 3.1669;
  return Math.max(0, Math.min(100, Math.round(acc)));
}
