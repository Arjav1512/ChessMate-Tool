import { useIvToast } from '../../components/ui/iv';
import type { AnalysisMoveVM } from './types';

const STORAGE_KEY = 'cm.improveQueue';

/** Tagged motif queued from Analysis → Improve (sample/derived plan, decision #5). */
export interface ImproveQueueItem {
  gameId: string;
  ply: number;
  motif: string;
  san: string;
  addedAt: string;
}

function readQueue(): ImproveQueueItem[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '[]'); } catch { return []; }
}

/**
 * Send-to-Improve (§8/§9, decision #5). For v1 this tags the move's motif into a
 * sample/derived plan queue (localStorage) and confirms via toast; when the real
 * learning engine exists, only this writer changes.
 */
export function useSendToImprove(gameId: string) {
  const { toast } = useIvToast();
  return (move: AnalysisMoveVM | null) => {
    if (!move) return;
    const motif = move.motifs[0] ?? (move.quality ?? 'review');
    const item: ImproveQueueItem = { gameId, ply: move.ply, motif, san: move.san, addedAt: new Date().toISOString() };
    const label = motif.replace(/-/g, ' ');
    try {
      const q = readQueue();
      q.push(item);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(q));
    } catch {
      // Don't claim success when the write failed.
      toast('Couldn’t save to your improvement plan — try again', 'error');
      return;
    }
    toast(`Added “${label}” to your improvement plan`, 'success');
  };
}
