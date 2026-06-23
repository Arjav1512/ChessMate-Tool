import { useCallback, useEffect, useState } from 'react';
import { readImproveQueue, QUEUE_EVENT, IMPROVE_QUEUE_KEY } from '../queue';
import { buildReviewFeed } from './adapter';
import { sampleDetectedMistakes } from './sampleMistakes';
import type { ReviewMistakeVM } from './types';
import type { MistakeInput } from '../../../lib/mistakeReview';

/**
 * Review-Mistakes data (Phase 7). The full priority-ordered feed = detected
 * mistakes (sample/derived v1) ∪ the live Send-to-Improve queue, so a mistake
 * flagged in Analysis appears here. Live swap = replace `detected` with the real
 * `useMistakeReview` hook. `detectedOverride` exists only for tests/scalability.
 */
export function useReviewMistakes(
  detectedOverride?: MistakeInput[],
): { feed: ReviewMistakeVM[]; isLoading: boolean; error: string | null } {
  const compute = useCallback(
    () => buildReviewFeed(detectedOverride ?? sampleDetectedMistakes, readImproveQueue()),
    [detectedOverride],
  );
  const [feed, setFeed] = useState<ReviewMistakeVM[]>(compute);

  // Recompute when the Send-to-Improve queue changes (same-tab custom event or
  // cross-tab `storage`), so a mistake flagged in Analysis appears without reload.
  useEffect(() => {
    setFeed(compute());
    const refresh = () => setFeed(compute());
    const onStorage = (e: StorageEvent) => { if (e.key === IMPROVE_QUEUE_KEY) refresh(); };
    window.addEventListener(QUEUE_EVENT, refresh);
    window.addEventListener('storage', onStorage);
    return () => { window.removeEventListener(QUEUE_EVENT, refresh); window.removeEventListener('storage', onStorage); };
  }, [compute]);

  // Sample/derived v1 resolves synchronously; the live `useMistakeReview` swap
  // (Phase 11) drives real loading/error through this same contract.
  return { feed, isLoading: false, error: null };
}
