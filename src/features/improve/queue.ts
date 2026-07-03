import type { QueuedImport } from '../../lib/improve/composePlan';

const STORAGE_KEY = 'cm.improveQueue';

/** Event fired when the queue changes in the current tab (the DOM `storage`
 *  event only fires cross-tab). Listeners re-read the queue. */
export const QUEUE_EVENT = 'cm:improveQueue';
export { STORAGE_KEY as IMPROVE_QUEUE_KEY };

/**
 * Reader for the Send-to-Improve queue written by the Analysis Workspace
 * (Phase 5, `features/analysis/sendToImprove.ts`). This closes the loop: items
 * the user tagged in Analysis are ingested into the study plan (decision #4).
 * Same localStorage key/shape; swaps to the server plan in Phase 11.
 */
export function readImproveQueue(): QueuedImport[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '[]');
    if (!Array.isArray(raw)) return [];
    return raw
      .filter((x) => x && typeof x.motif === 'string' && typeof x.gameId === 'string')
      .map((x) => ({ gameId: x.gameId, ply: Number(x.ply) || 0, motif: x.motif, san: String(x.san ?? '') }));
  } catch {
    return [];
  }
}

/**
 * Append a mistake to the same Send-to-Improve queue the Study Plan ingests, so
 * "Add to study plan" (Review Mistakes) and Analysis "Send to Improve" share one
 * source of truth. Deduped by gameId+ply. Returns true if newly added.
 */
export function addToImproveQueue(item: QueuedImport): boolean {
  if (typeof window === 'undefined') return false;
  const queue = readImproveQueue();
  if (queue.some((q) => q.gameId === item.gameId && q.ply === item.ply)) return false;
  queue.push(item);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
    // Notify same-tab listeners (the `storage` event only fires cross-tab).
    window.dispatchEvent(new Event(QUEUE_EVENT));
    return true;
  } catch {
    return false;
  }
}
