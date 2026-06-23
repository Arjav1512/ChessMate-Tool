/**
 * Plan composition (Architecture §12, System Design §9 insight→action path).
 * Pure: ranks weaknesses by rating-impact, makes the top one the Weekly Focus,
 * expands its objective into an ordered study plan, queues secondary weaknesses,
 * and ingests imported Send-to-Improve items. Unit-testable; no I/O.
 */
import { objectiveFor, sessionTitle } from '../learning/objectives';
import { CATEGORY_META, impactScore, mapCategory, severityBand, worstSeverity } from './mapping';
import type {
  ImproveCategory, RawWeakness, StudyItemVM, WeaknessCategoryVM, WeaknessVM, WeeklyFocusVM,
} from './types';

export interface QueuedImport {
  gameId: string;
  ply: number;
  motif: string;
  san: string;
}

export interface ComposeOptions {
  week: number;
  sessionsDone: number;     // sessions completed on the focus this week
  phaseDeltaPct: number;    // focus phase-accuracy delta (sample/derived)
  queue: QueuedImport[];    // imported from Analysis Send-to-Improve
}

function toWeaknessVM(w: RawWeakness): WeaknessVM {
  const category = mapCategory(w);
  const obj = objectiveFor(w.key, category);
  const actionType = obj.sessionTypes[0];
  return {
    key: w.key,
    name: w.name,
    category,
    severity: severityBand(w.score),
    score: w.score,
    impact: impactScore(w),
    frequencyPct: w.frequencyPct,
    trend: w.trend,
    phaseAccuracy: w.phaseAccuracy,
    recommendation: sessionTitle(actionType, w.name),
    actionType,
  };
}

function groupCategories(ws: WeaknessVM[]): WeaknessCategoryVM[] {
  const order: ImproveCategory[] = ['tactical', 'opening', 'endgame', 'positional'];
  return order
    .map((category) => {
      const inCat = ws.filter((w) => w.category === category);
      if (inCat.length === 0) return null;
      const phaseAccuracy = Math.round(inCat.reduce((a, w) => a + w.phaseAccuracy, 0) / inCat.length);
      return {
        category,
        label: CATEGORY_META[category].label,
        icon: CATEGORY_META[category].icon,
        phaseAccuracy,
        severity: worstSeverity(inCat.map((w) => w.severity)),
        weaknesses: inCat.sort((a, b) => b.impact - a.impact),
      } satisfies WeaknessCategoryVM;
    })
    .filter((c): c is WeaknessCategoryVM => c !== null);
}

export interface ComposedPlan {
  weaknesses: WeaknessVM[];
  categories: WeaknessCategoryVM[];
  focus: WeeklyFocusVM;
  plan: StudyItemVM[];
}

export function composePlan(raw: RawWeakness[], opts: ComposeOptions): ComposedPlan {
  const weaknesses = raw.map(toWeaknessVM).sort((a, b) => b.impact - a.impact);
  const categories = groupCategories(weaknesses);
  const top = weaknesses[0];
  const obj = objectiveFor(top.key, top.category);
  const sessionTypes = obj.sessionTypes.slice(0, 5);
  const sessionsTotal = sessionTypes.length;
  const sessionsDone = Math.min(opts.sessionsDone, sessionsTotal);

  const focus: WeeklyFocusVM = {
    week: opts.week,
    title: obj.objective,
    rationale: obj.rationaleTemplate
      .replace('{pct}', String(top.frequencyPct))
      .replace('{n}', '4').replace('{converted}', '1'),
    sessionsDone,
    sessionsTotal,
    phaseDeltaPct: opts.phaseDeltaPct,
    nextSessionN: Math.min(sessionsDone + 1, sessionsTotal),
    weaknessKey: top.key,
  };

  // Focus objective → ordered sessions (first incomplete = next).
  const focusItems: StudyItemVM[] = sessionTypes.map((type, i) => ({
    id: `${top.key}:${type}`,
    type,
    title: sessionTitle(type, top.name),
    description: `Targets ${top.name.toLowerCase()} (${top.category}).`,
    estMinutes: obj.estMinutes[type] ?? 8,
    status: i < sessionsDone ? 'done' : i === sessionsDone ? 'next' : 'queued',
    source: 'weakness',
    weaknessKey: top.key,
  }));

  // Imported Send-to-Improve items → replay sessions (the user's own games).
  const importItems: StudyItemVM[] = opts.queue.map((q, i) => ({
    id: `import:${q.gameId}:${q.ply}:${i}`,
    type: 'replay',
    title: `Replay: ${q.motif.replace(/-/g, ' ')} (${q.san})`,
    description: 'Imported from your analysis.',
    estMinutes: 6,
    status: 'queued',
    source: 'send-to-improve',
    weaknessKey: q.motif,
  }));

  // Secondary weaknesses → one queued action each.
  const secondaryItems: StudyItemVM[] = weaknesses.slice(1, 4).map((w) => ({
    id: `${w.key}:${w.actionType}`,
    type: w.actionType,
    title: w.recommendation,
    description: `Targets ${w.name.toLowerCase()} (${w.category}).`,
    estMinutes: 8,
    status: 'queued',
    source: 'weakness',
    weaknessKey: w.key,
  }));

  return { weaknesses, categories, focus, plan: [...focusItems, ...importItems, ...secondaryItems] };
}
