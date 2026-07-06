import { describe, it, expect } from 'vitest';
import { buildStreakDays, computeStreaks, dayKey, deriveColorSplit, deriveOpponents } from './deriveInsights';
import { deriveSampleInsights } from './useInsights';
import { sampleGames, sampleAnalyzedIds } from '../games/sampleGames';
import { sampleImprovementScore, sampleRatingHistory } from '../dashboard/sampleDashboard';
import { computeAccuracies } from '../analysis/sampleAnalysis';
import { sampleSkills } from '../improve/sampleImprove';

const day = (base: Date, offset: number) => {
  const d = new Date(base);
  d.setDate(d.getDate() + offset);
  return dayKey(d);
};

describe('computeStreaks', () => {
  const today = new Date('2026-07-05T12:00:00');

  it('counts a run ending today as the current streak', () => {
    const days = new Set([day(today, 0), day(today, -1), day(today, -2)]);
    expect(computeStreaks(days, today)).toEqual({ current: 3, longest: 3 });
  });

  it('a gap before today resets the current streak but not the longest', () => {
    const days = new Set([day(today, 0), /* gap at -1 */ day(today, -2), day(today, -3), day(today, -4), day(today, -5)]);
    const s = computeStreaks(days, today);
    expect(s.current).toBe(1);
    expect(s.longest).toBe(4);
  });

  it('no activity today → current streak 0', () => {
    const days = new Set([day(today, -1), day(today, -2)]);
    expect(computeStreaks(days, today).current).toBe(0);
  });
});

describe('buildStreakDays', () => {
  const today = new Date('2026-07-05T12:00:00');

  it('returns the trailing N days, oldest first, ending today', () => {
    const days = buildStreakDays(new Set(), today, 14);
    expect(days).toHaveLength(14);
    expect(days[0].key).toBe(day(today, -13));
    expect(days[13].key).toBe(dayKey(today));
    expect(days[13].isToday).toBe(true);
    expect(days.filter((d) => d.isToday)).toHaveLength(1);
  });

  it('marks exactly the active days', () => {
    const active = new Set([day(today, 0), day(today, -2)]);
    const days = buildStreakDays(active, today, 7);
    expect(days.map((d) => d.active)).toEqual([false, false, false, false, true, false, true]);
  });
});

describe('derivations from the shared games sample', () => {
  it('color split matches the library games (6 white / 6 black)', () => {
    expect(deriveColorSplit(sampleGames)).toBe(50);
  });

  it('opponents aggregate from the same games the library lists', () => {
    const opp = deriveOpponents(sampleGames, 12);
    const carlsen = opp.find((o) => o.name === 'M. Carlsen');
    expect(carlsen).toMatchObject({ games: 1, record: '1–0', last: 'win' });
    const storm = opp.find((o) => o.name === 'a_pawn_storm');
    expect(storm).toMatchObject({ games: 1, record: '0–0–1', last: 'draw' });
    // Every opponent must exist in the library rows.
    const names = new Set(sampleGames.map((g) => (g.user_color === 'black' ? g.white_player : g.black_player)));
    for (const o of opp) expect(names.has(o.name)).toBe(true);
  });
});

describe('sample Insights agree with the rest of the app (regression)', () => {
  const vm = deriveSampleInsights(new Date('2026-07-05T12:00:00'));

  it('games analyzed = the Games library count (7 of 12)', () => {
    expect(vm.gamesAnalyzed).toBe(sampleAnalyzedIds.size);
    expect(vm.gamesTotal).toBe(sampleGames.length);
  });

  it('accuracy = the Analysis sample / Dashboard momentum accuracy', () => {
    expect(vm.accuracy).toBe(computeAccuracies().user);
    expect(vm.accuracy).toBe(sampleImprovementScore.lastGameAccuracy);
  });

  it('current streak = the Dashboard streak, and the header says so', () => {
    expect(vm.streak.current).toBe(sampleImprovementScore.streakDays);
    expect(vm.status).toContain(`${sampleImprovementScore.streakDays}-day study streak`);
  });

  it('rating series = the Dashboard rating history (ends at the same value)', () => {
    const rating = sampleRatingHistory('90d');
    expect(vm.seriesNow).toBe(rating.series[rating.series.length - 1].value);
    expect(vm.status).toContain(`${vm.seriesNow} rating`);
  });

  it('strengths = the Improve skill profile, strongest first', () => {
    const sorted = [...sampleSkills].sort((a, b) => b.you - a.you);
    expect(vm.strengths.map((s) => s.label)).toEqual(sorted.map((s) => s.axis));
    expect(vm.strengths[0].pct).toBe(sorted[0].you);
  });

  it('no invented totals: moves/mistakes/brilliants scale from the sample game', () => {
    expect(vm.movesAnalyzed % vm.gamesAnalyzed).toBe(0);
    expect(vm.mistakesFound % vm.gamesAnalyzed).toBe(0);
  });
});
