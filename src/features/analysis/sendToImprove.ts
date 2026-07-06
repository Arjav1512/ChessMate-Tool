import { useIvToast } from '../../components/ui/iv';
import { addToImproveQueue } from '../improve/queue';
import type { AnalysisMoveVM } from './types';

/**
 * Send-to-Improve (§8/§9, decision #5). Tags the move's motif into the study
 * plan and confirms via toast.
 *
 * Routes through the shared `addToImproveQueue` writer so Analysis and Review
 * Mistakes share one source of truth: it dedupes by game+ply and dispatches the
 * `cm:improveQueue` event, so an open Improve screen updates live. (Previously
 * this wrote localStorage directly — no dedupe, no event, so the plan didn't
 * refresh, which read as "it does nothing".)
 */
export function useSendToImprove(gameId: string) {
  const { toast } = useIvToast();
  return (move: AnalysisMoveVM | null) => {
    // Nothing actionable at the start position — never silently no-op.
    if (!move) {
      toast('Step to a move first, then send it to your plan', 'info');
      return;
    }
    const motif = move.motifs[0] ?? (move.quality ?? 'review');
    const label = motif.replace(/-/g, ' ');
    const added = addToImproveQueue({
      gameId, ply: move.ply, motif, san: move.san,
      // Real position context, so Review Mistakes shows THIS position, not a placeholder.
      fen: move.fenBefore, quality: move.quality ?? undefined,
      cpLoss: move.cpLoss ?? undefined, bestSan: move.bestSan, phase: move.phase,
    });
    toast(
      added
        ? `Added “${label}” to your plan — find it under Improve → Review mistakes`
        : `“${label}” is already in your plan (Improve → Review mistakes)`,
      added ? 'success' : 'info',
    );
  };
}
