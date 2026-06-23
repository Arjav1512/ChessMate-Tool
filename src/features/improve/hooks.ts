import { useMemo } from 'react';
import { composePlan } from '../../lib/improve/composePlan';
import type { ImproveData } from '../../lib/improve/types';
import {
  SAMPLE_ANALYZED_GAMES, sampleFocusMeta, sampleMilestones, sampleRawWeaknesses, sampleSkills,
} from './sampleImprove';
import { readImproveQueue } from './queue';

/**
 * Improve Hub data (Phase 6). The plan is computed by the real pure
 * `composePlan` from sample raw weaknesses + the live Send-to-Improve queue, so
 * tagged items from Analysis appear here (decision #4). Swap to live data =
 * replace the sample inputs only.
 */
export function useImproveData(): { data: ImproveData; isLoading: boolean } {
  const data = useMemo<ImproveData>(() => {
    const queue = readImproveQueue();
    const { focus, categories, plan } = composePlan(sampleRawWeaknesses, {
      week: sampleFocusMeta.week,
      sessionsDone: sampleFocusMeta.sessionsDone,
      phaseDeltaPct: sampleFocusMeta.phaseDeltaPct,
      queue,
    });
    return {
      analyzedGames: SAMPLE_ANALYZED_GAMES,
      hasData: sampleRawWeaknesses.length > 0,
      focus,
      skills: sampleSkills,
      categories,
      plan,
      milestones: sampleMilestones,
    };
  }, []);
  return { data, isLoading: false };
}
