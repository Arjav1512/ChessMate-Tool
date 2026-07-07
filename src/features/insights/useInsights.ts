import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { sampleGames, sampleAnalyzedIds } from '../games/sampleGames';
import { sampleImprovementScore, sampleRatingHistory } from '../dashboard/sampleDashboard';
import { sampleSkills } from '../improve/sampleImprove';
import { getSampleMoves, computeAccuracies } from '../analysis/sampleAnalysis';
import {
  buildStreakDays, computeStreaks, dayKey, deriveColorSplit, deriveOpponents,
  type InsightsVM, type StrengthArea,
} from './deriveInsights';
import type { Game } from '../../lib/supabase';

export type InsightsStatus = 'loading' | 'ready' | 'empty' | 'failed';

/**
 * Insights data. Mirrors the app's established pattern (useGames / dashboard):
 * an authenticated user gets real rows from the same tables every other screen
 * reads (`games`, `game_analysis_results`, `move_analysis`); the unauthenticated
 * DEV preview derives everything from the SAME sample sources the Games library,
 * Dashboard, Improve and Analysis screens show — so the numbers here always
 * match the rest of the app (7 of 12 analyzed, 5-day streak, 84% accuracy,
 * rating 1487, the library's opponents, the Improve skill profile).
 */
export function useInsights(): { vm: InsightsVM | null; status: InsightsStatus } {
  const { user } = useAuth();
  const useSample = !user && import.meta.env.DEV;
  const [state, setState] = useState<{ vm: InsightsVM | null; status: InsightsStatus }>(() =>
    useSample ? { vm: deriveSampleInsights(new Date()), status: 'ready' } : { vm: null, status: 'loading' });

  useEffect(() => {
    if (useSample) { setState({ vm: deriveSampleInsights(new Date()), status: 'ready' }); return; }
    if (!user) { setState({ vm: null, status: 'empty' }); return; }
    let alive = true;
    (async () => {
      try {
        const [{ data: games, error: e1 }, { data: results, error: e2 }, { data: plies, error: e3 }] = await Promise.all([
          supabase.from('games')
            .select('id, user_color, white_player, black_player, result, date, created_at')
            .eq('user_id', user.id).order('created_at', { ascending: false }).limit(500),
          // NB: this table's timestamp is `analyzed_at` (there is no created_at —
          // selecting one made PostgREST error and the whole page render "failed").
          supabase.from('game_analysis_results')
            .select('game_id, accuracy, total_moves, mistakes, inaccuracies, blunders, analyzed_at')
            .eq('user_id', user.id).order('analyzed_at', { ascending: true }).limit(500),
          supabase.from('move_analysis')
            .select('classification, phase')
            .eq('user_id', user.id).limit(20000),
        ]);
        if (!alive) return;
        if (e1 || e2 || e3) { setState({ vm: null, status: 'failed' }); return; }
        const g = (games ?? []) as Game[];
        if (g.length === 0 || (results ?? []).length === 0) { setState({ vm: null, status: 'empty' }); return; }
        setState({
          vm: deriveRealInsights(g, results ?? [], (plies ?? []) as { classification: string; phase: string }[], new Date()),
          status: 'ready',
        });
      } catch {
        if (alive) setState({ vm: null, status: 'failed' });
      }
    })();
    return () => { alive = false; };
  }, [user, useSample]);

  return state;
}

/* ── Sample path: compose from the shared sample sources ────────────────── */

export function deriveSampleInsights(today: Date): InsightsVM {
  const games = sampleGames;
  const analyzed = sampleAnalyzedIds;
  const gamesAnalyzed = analyzed.size;

  // Per-game move stats from the SAME sample game Analysis renders.
  const moves = getSampleMoves();
  const perGameMistakes = moves.filter((m) => m.quality === 'inaccuracy' || m.quality === 'mistake' || m.quality === 'blunder').length;
  const perGameBrilliant = moves.filter((m) => m.quality === 'brilliant').length;

  // Accuracy: identical to the Analysis sample + the Dashboard's momentum line.
  const acc = computeAccuracies();

  // Activity: the library's game days, plus a study session on each of the last
  // `streakDays` days (the Dashboard's 5-day streak) ending today — so the
  // header, the streak card and its trailing day strip all agree.
  const counts = new Map<string, number>();
  for (const g of games) {
    const k = (g.date ?? '').slice(0, 10);
    if (k) counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  for (let i = 0; i < sampleImprovementScore.streakDays; i++) {
    const d = new Date(today); d.setDate(d.getDate() - i);
    const k = dayKey(d);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  const activeDays = new Set(counts.keys());
  const streaks = computeStreaks(activeDays, today);

  // Strengths: the Improve screen's skill profile, strongest first; the note is
  // derived from the you-vs-peers gap in that same data.
  const strengths: StrengthArea[] = [...sampleSkills]
    .sort((a, b) => b.you - a.you)
    .map((s) => ({
      key: s.axis.toLowerCase(),
      label: s.axis,
      pct: s.you,
      note: s.you >= s.peers ? `+${s.you - s.peers} vs peers` : `${s.you - s.peers} vs peers — drill this`,
    }));

  // Rating: the Dashboard's 90d rating history (ends at the same 1487).
  const rating = sampleRatingHistory('90d');
  const series = rating.series;
  const seriesNow = series[series.length - 1].value;
  const seriesDelta = seriesNow - series[0].value;

  const thisMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const analyzedThisMonth = games.filter((g) => analyzed.has(g.id) && (g.date ?? '').startsWith(thisMonth)).length;

  return {
    status: `${seriesNow} rating · ${gamesAnalyzed} of ${games.length} games analyzed · ${streaks.current}-day study streak`,
    accuracy: acc.user,
    accuracyEdge: acc.user - acc.opponent,
    movesAnalyzed: moves.length * gamesAnalyzed,
    mistakesFound: perGameMistakes * gamesAnalyzed,
    brilliantMoves: perGameBrilliant * gamesAnalyzed,
    gamesAnalyzed,
    gamesTotal: games.length,
    analyzedThisMonth,
    whitePct: deriveColorSplit(games),
    strengths,
    streak: { days: buildStreakDays(activeDays, today), ...streaks },
    seriesLabel: 'Rating',
    series,
    seriesNow,
    seriesDelta,
    opponents: deriveOpponents(games),
  };
}

/* ── Real path: derive from the user's own tables ────────────────────────── */

interface ResultRow { game_id: string; accuracy: number | null; total_moves: number | null; mistakes: number | null; inaccuracies: number | null; blunders: number | null; analyzed_at: string | null }

const PHASE_LABEL: Record<string, string> = { opening: 'Opening', middlegame: 'Middlegame', endgame: 'Endgame' };
const CLEAN = new Set(['brilliant', 'best', 'excellent', 'good']);

function deriveRealInsights(
  games: Game[], results: ResultRow[], plies: { classification: string; phase: string }[], today: Date,
): InsightsVM {
  const gamesAnalyzed = results.length;
  const movesAnalyzed = results.reduce((n, r) => n + (r.total_moves ?? 0), 0);
  const mistakesFound = results.reduce((n, r) => n + (r.mistakes ?? 0) + (r.inaccuracies ?? 0) + (r.blunders ?? 0), 0);
  const brilliantMoves = plies.filter((p) => p.classification === 'brilliant').length;
  const accs = results.map((r) => r.accuracy).filter((a): a is number => a != null);
  const accuracy = accs.length ? Math.round(accs.reduce((a, b) => a + b, 0) / accs.length) : 0;

  // Activity days = days a game was added; the streak strip derives from them.
  const counts = new Map<string, number>();
  for (const g of games) {
    const k = (g.date ?? g.created_at ?? '').slice(0, 10);
    if (k) counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  const activeDays = new Set(counts.keys());
  const streaks = computeStreaks(activeDays, today);

  // Strength per phase = clean-move rate over the user's real analyzed plies.
  const strengths: StrengthArea[] = Object.entries(PHASE_LABEL).map(([phase, label]) => {
    const inPhase = plies.filter((p) => p.phase === phase);
    const pct = inPhase.length ? Math.round((inPhase.filter((p) => CLEAN.has(p.classification)).length / inPhase.length) * 100) : 0;
    return { key: phase, label, pct, note: `${inPhase.length} moves reviewed` };
  }).sort((a, b) => b.pct - a.pct);

  // Progression = average accuracy per month (real, honest series).
  const byMonth = new Map<string, number[]>();
  for (const r of results) {
    if (r.accuracy == null || !r.analyzed_at) continue;
    const d = new Date(r.analyzed_at);
    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    byMonth.set(k, [...(byMonth.get(k) ?? []), r.accuracy]);
  }
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const series = [...byMonth.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([k, arr]) => ({
    label: MONTHS[Number(k.slice(5)) - 1] ?? k,
    value: Math.round(arr.reduce((x, y) => x + y, 0) / arr.length),
  }));
  const seriesNow = series.length ? series[series.length - 1].value : accuracy;
  const seriesDelta = series.length > 1 ? seriesNow - series[0].value : 0;

  const thisMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const analyzedThisMonth = results.filter((r) => (r.analyzed_at ?? '').startsWith(thisMonth)).length;

  return {
    status: `${gamesAnalyzed} of ${games.length} games analyzed · ${streaks.current}-day study streak`,
    accuracy,
    accuracyEdge: 0,
    movesAnalyzed,
    mistakesFound,
    brilliantMoves,
    gamesAnalyzed,
    gamesTotal: games.length,
    analyzedThisMonth,
    whitePct: deriveColorSplit(games),
    strengths,
    streak: { days: buildStreakDays(activeDays, today), ...streaks },
    seriesLabel: 'Avg accuracy',
    series,
    seriesNow,
    seriesDelta,
    opponents: deriveOpponents(games),
  };
}
