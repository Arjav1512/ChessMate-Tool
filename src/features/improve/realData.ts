/**
 * B3 — real Improve data. Maps the user's read-only WeaknessProfile (built by the
 * existing `buildWeaknessProfile` from their games + analysis) into the Improve
 * Hub view-model, reusing the existing pure `composePlan`. No fabricated numbers:
 * every value comes from the profile (or an honest neutral) — when there are no
 * weaknesses yet, `hasData` is false and the page shows its onboarding state.
 */
import { composePlan, type QueuedImport } from '../../lib/improve/composePlan';
import type { Weakness, WeaknessProfile } from '../../lib/weaknessProfile';
import type { ImproveData, RawWeakness, SkillAxisVM, Trend } from '../../lib/improve/types';

const EMPTY_FOCUS = {
  week: 0, title: '', rationale: '', sessionsDone: 0, sessionsTotal: 0,
  phaseDeltaPct: 0, nextSessionN: 0, weaknessKey: '',
};

/** WeaknessProfile trend → Improve trend ('stable'/'unknown' fold to 'steady'). */
function mapTrend(t: Weakness['trend']): Trend {
  return t === 'improving' ? 'improving' : t === 'worsening' ? 'worsening' : 'steady';
}

/** Phase weaknesses carry their phase in the id (`phase:endgame`). */
function phaseOf(w: Weakness): RawWeakness['phase'] | undefined {
  if (w.category !== 'phase') return undefined;
  const p = w.id.split(':')[1];
  return p === 'opening' || p === 'middlegame' || p === 'endgame' ? p : undefined;
}

/** Weakness (legacy taxonomy) → RawWeakness consumed by composePlan/mapCategory. */
function toRaw(w: Weakness): RawWeakness {
  return {
    key: w.id,
    name: w.title,
    legacyCategory: w.category, // 'opening'|'recurring'|'phase'|'color'|'motif' — all valid
    phase: phaseOf(w),
    score: w.severity,
    frequencyPct: w.frequencyPct,
    trend: mapTrend(w.trend),
    phaseAccuracy: w.phaseAccuracy,
  };
}

/** Real skill radar from per-phase strengths (empty until games carry phase data). */
export function profileToSkills(profile: WeaknessProfile): SkillAxisVM[] {
  const axes: SkillAxisVM[] = [];
  const order: Array<['opening' | 'middlegame' | 'endgame', string]> = [
    ['opening', 'Openings'], ['middlegame', 'Middlegame'], ['endgame', 'Endgame'],
  ];
  for (const [phase, axis] of order) {
    const s = profile.phaseStrengths[phase];
    if (s) axes.push({ axis, you: s.strength, peers: 0 });
  }
  return axes;
}

/** ISO-ish week number for the "week N" label (real, not a sample constant). */
export function weekOfYear(d = new Date()): number {
  const start = new Date(d.getFullYear(), 0, 1);
  return Math.ceil(((d.getTime() - start.getTime()) / 86400000 + start.getDay() + 1) / 7);
}

export interface RealImproveOpts {
  week: number;
  queue: QueuedImport[];
}

/**
 * Build the Improve view-model from a real WeaknessProfile + the live
 * Send-to-Improve queue. `phaseDeltaPct` is 0 (no week-over-week signal is
 * tracked yet — we never invent one) and `milestones` is empty (no fabricated
 * goals). Returns the onboarding shape when there are no weaknesses.
 */
export function profileToImproveData(profile: WeaknessProfile, opts: RealImproveOpts): ImproveData {
  const composed = composePlan(profile.weaknesses.map(toRaw), {
    week: opts.week,
    sessionsDone: 0,   // no session-completion tracking exists yet — honest zero
    phaseDeltaPct: 0,  // no real week-over-week delta — never fabricate one
    queue: opts.queue,
  });

  if (!composed) {
    return {
      analyzedGames: profile.analyzedGames, hasData: false,
      focus: EMPTY_FOCUS, skills: [], categories: [], plan: [], milestones: [],
    };
  }

  return {
    analyzedGames: profile.analyzedGames,
    hasData: true,
    focus: composed.focus,
    skills: profileToSkills(profile),
    categories: composed.categories,
    plan: composed.plan,
    milestones: [], // real goal-tracking not built yet — show nothing rather than fake goals
  };
}
