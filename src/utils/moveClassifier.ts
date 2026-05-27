/**
 * Move classification utilities — thresholds mirror Lichess / chess.com conventions.
 * All evaluations are in centipawns from White's perspective.
 */

export type MoveClassification =
  | 'best'
  | 'excellent'
  | 'good'
  | 'inaccuracy'
  | 'mistake'
  | 'blunder';

export interface ClassInfo {
  label: string;
  symbol: string;  // shown next to move
  color: string;
  dim: string;     // background tint
}

export const CLASSIFICATION: Record<MoveClassification, ClassInfo> = {
  best:       { label: 'Best',       symbol: '★',  color: '#4ade80', dim: 'rgba(74,222,128,0.18)' },
  excellent:  { label: 'Excellent',  symbol: '!',  color: '#a3e635', dim: 'rgba(163,230,53,0.15)' },
  good:       { label: 'Good',       symbol: '',   color: '#94a3b8', dim: 'transparent' },
  inaccuracy: { label: 'Inaccuracy', symbol: '?!', color: '#fbbf24', dim: 'rgba(251,191,36,0.18)' },
  mistake:    { label: 'Mistake',    symbol: '?',  color: '#f97316', dim: 'rgba(249,115,22,0.18)' },
  blunder:    { label: 'Blunder',    symbol: '??', color: '#ef4444', dim: 'rgba(239,68,68,0.18)' },
};

/**
 * Classify a single move.
 *
 * @param evalBefore  - Engine eval at the position BEFORE the move (cp, White's perspective)
 * @param evalAfter   - Engine eval at the position AFTER the move (cp, White's perspective)
 * @param isWhiteMove - Whether White is the side that moved
 * @param isBestMove  - Whether the move matched the engine's top choice
 */
export function classifyMove(
  evalBefore: number,
  evalAfter: number,
  isWhiteMove: boolean,
  isBestMove = false,
): MoveClassification {
  if (isBestMove) return 'best';

  // Centipawn loss from the mover's perspective
  const cpLoss = isWhiteMove
    ? evalBefore - evalAfter   // White wants eval to rise
    : evalAfter - evalBefore;  // Black wants eval to fall

  if (cpLoss <= 10)  return 'best';
  if (cpLoss <= 25)  return 'excellent';
  if (cpLoss <= 50)  return 'good';
  if (cpLoss <= 100) return 'inaccuracy';
  if (cpLoss <= 200) return 'mistake';
  return 'blunder';
}

/** Classification counts summary used in the eval graph overlay. */
export interface ClassificationSummary {
  best: number;
  excellent: number;
  good: number;
  inaccuracy: number;
  mistake: number;
  blunder: number;
}

export function summariseClassifications(
  map: Map<number, MoveClassification>,
): ClassificationSummary {
  const summary: ClassificationSummary = {
    best: 0, excellent: 0, good: 0,
    inaccuracy: 0, mistake: 0, blunder: 0,
  };
  for (const c of map.values()) summary[c]++;
  return summary;
}
