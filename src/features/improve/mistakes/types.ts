import type { MoveQuality } from '../../../components/ui/iv';
import type { Phase } from '../../../lib/moveAnalysis';

/** A motif tag for display (key for filtering, label for humans). */
export interface MistakeMotifVM {
  key: string;
  label: string;
}

/**
 * A mistake as shown in Improve → Review Mistakes (Phase 7).
 * Derived from the B-4 engine (`lib/mistakeReview`) + the Send-to-Improve queue,
 * with the legacy classification mapped to the Ivory move-quality taxonomy.
 */
export interface ReviewMistakeVM {
  id: string;
  gameId: string;
  ply: number;               // for "Open in Analysis"
  moveNumber: number;        // for display ("move 24")
  fen: string;               // position BEFORE the move (the board to study)
  playedSan: string | null;  // the move actually played
  bestSan: string | null;    // engine's best, in SAN
  quality: MoveQuality;      // brilliant·best·good·inaccuracy·mistake·blunder
  phase: Phase;
  motifs: MistakeMotifVM[];
  cpLoss: number;            // centipawns lost (for "lost N.N")
  lesson: string;            // coaching copy (motif definition)
  priority: number;          // severity + motif + recurrence (B-4)
  source: 'detected' | 'send-to-improve';
}

export interface MistakeFilterVM {
  phase: Phase | 'all';
  motif: string | 'all';
}
