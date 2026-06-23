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
const EMPTY_FOCUS = {
  week: 0, title: '', rationale: '', sessionsDone: 0, sessionsTotal: 0,
  phaseDeltaPct: 0, nextSessionN: 0, weaknessKey: '',
};

export function useImproveData(): { data: ImproveData; isLoading: boolean } {
  const data = useMemo<ImproveData>(() => {
    const queue = readImproveQueue();
    const composed = composePlan(sampleRawWeaknesses, {
      week: sampleFocusMeta.week,
      sessionsDone: sampleFocusMeta.sessionsDone,
      phaseDeltaPct: sampleFocusMeta.phaseDeltaPct,
      queue,
    });
    // No weaknesses yet → safe empty shape; the page renders the onboarding state.
    if (!composed) {
      return {
        analyzedGames: SAMPLE_ANALYZED_GAMES, hasData: false,
        focus: EMPTY_FOCUS, skills: [], categories: [], plan: [], milestones: [],
      };
    }
    return {
      analyzedGames: SAMPLE_ANALYZED_GAMES,
      hasData: true,
      focus: composed.focus,
      skills: sampleSkills,
      categories: composed.categories,
      plan: composed.plan,
      milestones: sampleMilestones,
    };
  }, []);
  return { data, isLoading: false };
}
