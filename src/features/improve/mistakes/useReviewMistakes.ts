import { useMemo } from 'react';
import { readImproveQueue } from '../queue';
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
  const feed = useMemo<ReviewMistakeVM[]>(() => {
    const queue = readImproveQueue();
    return buildReviewFeed(detectedOverride ?? sampleDetectedMistakes, queue);
  }, [detectedOverride]);
  // Sample/derived v1 resolves synchronously; the live `useMistakeReview` swap
  // (Phase 11) drives real loading/error through this same contract.
  return { feed, isLoading: false, error: null };
}
