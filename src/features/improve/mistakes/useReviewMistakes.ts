import { useCallback, useEffect, useState } from 'react';
import { readImproveQueue, QUEUE_EVENT, IMPROVE_QUEUE_KEY } from '../queue';
import { buildReviewFeed } from './adapter';
import { sampleDetectedMistakes } from './sampleMistakes';
import { useAuth } from '../../../contexts/AuthContext';
import { useMistakeReview } from '../../../hooks/useMistakeReview';
import type { ReviewMistakeVM } from './types';
import type { MistakeInput } from '../../../lib/mistakeReview';

const EMPTY: MistakeInput[] = [];

/**
 * Review-Mistakes data. The full priority-ordered feed = detected mistakes ∪ the
 * live Send-to-Improve queue, so a mistake flagged in Analysis appears here.
 *
 * B2 (real-data): an authenticated user's detected mistakes come from the real
 * `useMistakeReview` hook (their own `move_analysis` mistake/blunder moves).
 * Sample mistakes are used ONLY in the unauthenticated DEV preview (parity with
 * Games/Analysis) so `?shell` screenshots and the a11y suite stay populated;
 * production never shows them. `detectedOverride` injects deterministically in tests.
 */
export function useReviewMistakes(
  detectedOverride?: MistakeInput[],
): { feed: ReviewMistakeVM[]; isLoading: boolean; error: string | null } {
  const { user } = useAuth();
  const useReal = detectedOverride === undefined && !!user;
  const { mistakes, loading, error } = useMistakeReview(useReal);

  const detected = detectedOverride
    ?? (useReal ? mistakes : (import.meta.env.DEV ? sampleDetectedMistakes : EMPTY));

  const compute = useCallback(
    () => buildReviewFeed(detected, readImproveQueue()),
    [detected],
  );
  const [feed, setFeed] = useState<ReviewMistakeVM[]>(compute);

  // Recompute when the detected set loads/changes OR the Send-to-Improve queue
  // changes (same-tab custom event or cross-tab `storage`), so a mistake flagged
  // in Analysis appears without a reload.
  useEffect(() => {
    setFeed(compute());
    const refresh = () => setFeed(compute());
    const onStorage = (e: StorageEvent) => { if (e.key === IMPROVE_QUEUE_KEY) refresh(); };
    window.addEventListener(QUEUE_EVENT, refresh);
    window.addEventListener('storage', onStorage);
    return () => { window.removeEventListener(QUEUE_EVENT, refresh); window.removeEventListener('storage', onStorage); };
  }, [compute]);

  return {
    feed,
    isLoading: useReal ? loading : false,
    error: useReal ? error : null,
  };
}
