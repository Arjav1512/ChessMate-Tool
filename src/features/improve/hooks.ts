import { useEffect, useMemo, useState } from 'react';
import { composePlan, type QueuedImport } from '../../lib/improve/composePlan';
import type { ImproveData } from '../../lib/improve/types';
import { useAuth } from '../../contexts/AuthContext';
import { useWeaknessProfile } from '../../hooks/useWeaknessProfile';
import {
  SAMPLE_ANALYZED_GAMES, sampleFocusMeta, sampleMilestones, sampleRawWeaknesses, sampleSkills,
} from './sampleImprove';
import { readImproveQueue, QUEUE_EVENT, IMPROVE_QUEUE_KEY } from './queue';
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
function sampleImproveData(queue: QueuedImport[]): ImproveData {
  const composed = composePlan(sampleRawWeaknesses, {
    week: sampleFocusMeta.week,
    sessionsDone: sampleFocusMeta.sessionsDone,
    phaseDeltaPct: sampleFocusMeta.phaseDeltaPct,
    queue,
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

/**
 * The Send-to-Improve queue, kept live: re-reads when Analysis / Review Mistakes
 * add an item in this tab (QUEUE_EVENT) or another tab writes it (storage).
 * Without this, "Send to Improve" looked like it did nothing until a reload.
 */
function useImproveQueue(): QueuedImport[] {
  const [queue, setQueue] = useState<QueuedImport[]>(() => readImproveQueue());
  useEffect(() => {
    const refresh = () => setQueue(readImproveQueue());
    const onStorage = (e: StorageEvent) => { if (e.key === IMPROVE_QUEUE_KEY) refresh(); };
    window.addEventListener(QUEUE_EVENT, refresh);
    window.addEventListener('storage', onStorage);
    return () => { window.removeEventListener(QUEUE_EVENT, refresh); window.removeEventListener('storage', onStorage); };
  }, []);
  return queue;
}

export function useImproveData(): { data: ImproveData; isLoading: boolean; error: string | null } {
  const { user } = useAuth();
  const useReal = !!user;
  const { profile, loading, error } = useWeaknessProfile(useReal);
  const queue = useImproveQueue();

  const data = useMemo<ImproveData>(() => {
    if (useReal) {
      if (!profile) return EMPTY_DATA; // loading/error/no data — callers branch on isLoading/error first
      return profileToImproveData(profile, { week: weekOfYear(), queue });
    }
    // Unauthenticated DEV preview → sample; production-unauth → empty (unreachable).
    return import.meta.env.DEV ? sampleImproveData(queue) : EMPTY_DATA;
  }, [useReal, profile, queue]);

  return { data, isLoading: useReal ? loading : false, error: useReal ? error : null };
}
