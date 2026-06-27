/**
 * B4 — real Dashboard data. Maps the user's read-only WeaknessProfile into the
 * three rendered dashboard regions (empty-state gate, Weekly Focus, "Your plan"
 * top weaknesses), reusing the same composePlan/learning catalog as Improve.
 *
 * Honesty: only the Weekly Focus + top weaknesses have a real source. The
 * "improvement score" (streak/delta/verdict) and the roadmap have NO real backing
 * yet, so their hooks return no data for authenticated users — the cards hide
 * rather than show a fabricated rating, streak, or percentage.
 */
import { composePlan, type QueuedImport } from '../../lib/improve/composePlan';
import { CATEGORY_META, mapCategory, severityBand } from '../../lib/improve/mapping';
import { objectiveFor, sessionTitle } from '../../lib/learning/objectives';
import { weekOfYear } from '../improve/realData';
import type { Weakness, WeaknessProfile } from '../../lib/weaknessProfile';
import type { RawWeakness } from '../../lib/improve/types';
import type { WeaknessCompactVM, WeaknessTrend, WeeklyFocusVM } from './types';

function phaseOf(w: Weakness): RawWeakness['phase'] | undefined {
  if (w.category !== 'phase') return undefined;
  const p = w.id.split(':')[1];
  return p === 'opening' || p === 'middlegame' || p === 'endgame' ? p : undefined;
}

function toRaw(w: Weakness): RawWeakness {
  return {
    key: w.id, name: w.title, legacyCategory: w.category, phase: phaseOf(w),
    score: w.severity, frequencyPct: w.frequencyPct,
    trend: w.trend === 'improving' ? 'improving' : w.trend === 'worsening' ? 'worsening' : 'steady',
    phaseAccuracy: w.phaseAccuracy,
  };
}

const trendOf = (t: Weakness['trend']): WeaknessTrend =>
  t === 'improving' ? 'improving' : t === 'worsening' ? 'worsening' : 'steady';

export interface RealDashboard {
  hasData: boolean;
  focus: WeeklyFocusVM | null;
  weaknesses: WeaknessCompactVM[];
}

/** Compact weakness rows for the dashboard "Your plan" strip — real `detail` as
 *  the why, real frequency, real severity band. */
export function profileToCompactWeaknesses(profile: WeaknessProfile): WeaknessCompactVM[] {
  return profile.weaknesses.slice(0, 3).map((w) => {
    const category = mapCategory({ legacyCategory: w.category, phase: phaseOf(w) });
    const obj = objectiveFor(w.id, category);
    return {
      key: w.id,
      icon: CATEGORY_META[category].icon,
      name: w.title,
      frequencyPct: w.frequencyPct,
      trend: trendOf(w.trend),
      impact: severityBand(w.severity),
      why: w.detail,
      action: sessionTitle(obj.sessionTypes[0], w.title),
    };
  });
}

/** Build the rendered dashboard regions from a real profile. `hasData` is false
 *  (→ onboarding) when the user has no real plan yet. */
export function profileToDashboard(profile: WeaknessProfile, queue: QueuedImport[]): RealDashboard {
  const composed = composePlan(profile.weaknesses.map(toRaw), {
    week: weekOfYear(), sessionsDone: 0, phaseDeltaPct: 0, queue,
  });
  if (!composed) return { hasData: false, focus: null, weaknesses: [] };

  const top = composed.weaknesses[0];
  const obj = objectiveFor(top.key, top.category);
  const focus: WeeklyFocusVM = {
    week: composed.focus.week,
    title: composed.focus.title,
    rationale: composed.focus.rationale,
    sessionsDone: composed.focus.sessionsDone,
    sessionsTotal: composed.focus.sessionsTotal,
    phaseDeltaPct: 0, // no real week-over-week delta is tracked — never fabricate one
    estMinutes: obj.estMinutes[obj.sessionTypes[0]] ?? 8,
  };
  return { hasData: true, focus, weaknesses: profileToCompactWeaknesses(profile) };
}
