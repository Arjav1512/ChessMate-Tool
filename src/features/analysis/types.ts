/** Analysis Workspace view-models (System Design §8, Architecture §8). Shaped
 *  to the future Move/Analysis API so the sample adapter swaps mechanically. */
import type { MoveQuality } from '../../lib/analysis/moveQuality';

export type Phase = 'opening' | 'middlegame' | 'endgame';
export type InsightVariant = 'turning-point' | 'blunder' | 'missed-opportunity' | 'recommendation';

export interface GameVM {
  id: string;
  pgn: string;
  white: string;
  black: string;
  whiteRating: number | null;
  blackRating: number | null;
  result: string;            // '1-0' | '0-1' | '1/2-1/2'
  eco: string;
  opening: string;
  userColor: 'w' | 'b';
}

export interface AnalysisMoveVM {
  ply: number;               // 1-based half-move index
  moveNumber: number;        // 1-based full move
  color: 'w' | 'b';
  san: string;
  from: string;              // origin square (for last-move tint)
  to: string;                // destination square
  fenBefore: string;         // position the move was played from (drillable)
  fenAfter: string;
  evalCp: number | null;     // after the move, White POV
  mate: number | null;
  cpLoss: number | null;     // vs best, side-relative
  quality: MoveQuality | null;
  bestSan: string | null;
  bestEvalCp: number | null;
  phase: Phase;
  motifs: string[];
}

export interface AnalysisVM {
  status: 'analyzing' | 'analyzed' | 'failed';
  /** How many plies have results so far (progressive population). */
  analyzedPlies: number;
  totalPlies: number;
  accuracyUser: number | null;
  accuracyOpponent: number | null;
  turningPoints: number[];   // plies of biggest eval swings
}
