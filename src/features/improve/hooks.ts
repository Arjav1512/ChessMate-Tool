import { useMemo } from 'react';
import { composePlan } from '../../lib/improve/composePlan';
import type { ImproveData } from '../../lib/improve/types';
import { useAuth } from '../../contexts/AuthContext';
import { useWeaknessProfile } from '../../hooks/useWeaknessProfile';
import {
  SAMPLE_ANALYZED_GAMES, sampleFocusMeta, sampleMilestones, sampleRawWeaknesses, sampleSkills,
} from './sampleImprove';
import { readImproveQueue } from './queue';
import { profileToImproveData, weekOfYear } from './realData';

/**
 * Improve Hub data (System Design §9).
 *
 * B3 (real-data): for an authenticated user the plan is built from their real
 * read-only WeaknessProfile (`useWeaknessProfile` → `buildWeaknessProfile`) via
 * the pure `profileToImproveData`. No weaknesses yet → `hasData: false` →
 * onboarding (never fabricated numbers). The rich sample plan is used ONLY in the
 * unauthenticated DEV preview (parity with Games/Analysis) so `?shell` and the
 * a11y suite stay populated; production never shows it.
 */
const EMPTY_FOCUS = {
  week: 0, title: '', rationale: '', sessionsDone: 0, sessionsTotal: 0,
  phaseDeltaPct: 0, nextSessionN: 0, weaknessKey: '',
};

const EMPTY_DATA: ImproveData = {
  analyzedGames: 0, hasData: false,
  focus: EMPTY_FOCUS, skills: [], categories: [], plan: [], milestones: [],
};

/** The rich sample plan — DEV preview only (keeps screenshots + a11y populated). */
function sampleImproveData(): ImproveData {
  const composed = composePlan(sampleRawWeaknesses, {
    week: sampleFocusMeta.week,
    sessionsDone: sampleFocusMeta.sessionsDone,
    phaseDeltaPct: sampleFocusMeta.phaseDeltaPct,
    queue: readImproveQueue(),
  });
  if (!composed) return { ...EMPTY_DATA, analyzedGames: SAMPLE_ANALYZED_GAMES };
  return {
    analyzedGames: SAMPLE_ANALYZED_GAMES,
    hasData: true,
    focus: composed.focus,
    skills: sampleSkills,
    categories: composed.categories,
    plan: composed.plan,
    milestones: sampleMilestones,
  };
}

export function useImproveData(): { data: ImproveData; isLoading: boolean } {
  const { user } = useAuth();
  const useReal = !!user;
  const { profile, loading } = useWeaknessProfile(useReal);

  const data = useMemo<ImproveData>(() => {
    if (useReal) {
      if (!profile) return EMPTY_DATA; // loading or no data → onboarding shape
      return profileToImproveData(profile, { week: weekOfYear(), queue: readImproveQueue() });
    }
    // Unauthenticated DEV preview → sample; production-unauth → empty (unreachable).
    return import.meta.env.DEV ? sampleImproveData() : EMPTY_DATA;
  }, [useReal, profile]);

  return { data, isLoading: useReal ? loading : false };
}
