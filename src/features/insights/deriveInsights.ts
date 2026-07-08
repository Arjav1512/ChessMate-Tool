/**
 * Pure derivations for the Insights screen. Every number on the page comes
 * through here from shared sources — the games list, the analysis results,
 * and (sample path) the same sample data the Dashboard/Improve/Analysis
 * screens render — so Insights can never disagree with the rest of the app.
 */
import type { Game } from '../../lib/supabase';
import { addDays, diffLocalDays, localDayKey, parseLocalDay } from '../../lib/dates';

export interface StrengthArea {
  key: string;
  label: string;
  pct: number;        // 0–100
  note: string;       // derived supporting note
}

export interface OpponentRow {
  name: string;
  games: number;
  /** "W–L" or "W–L–D" from the user's POV. */
  record: string;
  last: 'win' | 'loss' | 'draw';
}

export interface StreakDay {
  key: string;      // local YYYY-MM-DD
  active: boolean;  // any study activity that day
  isToday: boolean;
}

export interface StreakVM {
  /** The trailing days (oldest first, today last). */
  days: StreakDay[];
  current: number;
  longest: number;
}

export interface InsightsVM {
  status: string;              // header line, derived
  accuracy: number;            // 0–100
  accuracyEdge: number;        // you − opponents
  movesAnalyzed: number;
  mistakesFound: number;
  brilliantMoves: number;
  gamesAnalyzed: number;
  gamesTotal: number;
  analyzedThisMonth: number;
  whitePct: number;            // % of games as White
  strengths: StrengthArea[];   // sorted strongest first
  streak: StreakVM;
  seriesLabel: string;         // 'Rating' (sample) / 'Avg accuracy' (real)
  series: { label: string; value: number }[];
  seriesNow: number;
  seriesDelta: number;
  opponents: OpponentRow[];
}

/** Local YYYY-MM-DD key (heatmap/streak work in local days, like the user does).
 *  Re-exported from the shared timezone-safe date utility (lib/dates). */
export const dayKey = localDayKey;

/** Game result from the user's point of view (null when color/result unknown). */
export function resultForUser(g: Game): 'win' | 'loss' | 'draw' | null {
  if (!g.user_color || !g.result) return null;
  if (g.result === '1/2-1/2') return 'draw';
  if (g.result === '1-0') return g.user_color === 'white' ? 'win' : 'loss';
  if (g.result === '0-1') return g.user_color === 'black' ? 'win' : 'loss';
  return null;
}

/** Opponent = the non-user side of each game; aggregate count/record/last. */
export function deriveOpponents(games: Game[], limit = 6): OpponentRow[] {
  const by = new Map<string, { games: number; w: number; l: number; d: number; lastDate: string; last: 'win' | 'loss' | 'draw' }>();
  for (const g of games) {
    const name = g.user_color === 'black' ? g.white_player : g.black_player;
    if (!name) continue;
    const res = resultForUser(g);
    if (!res) continue;
    const cur = by.get(name) ?? { games: 0, w: 0, l: 0, d: 0, lastDate: '', last: res };
    cur.games += 1;
    if (res === 'win') cur.w += 1; else if (res === 'loss') cur.l += 1; else cur.d += 1;
    const when = g.date ?? g.created_at ?? '';
    if (when >= cur.lastDate) { cur.lastDate = when; cur.last = res; }
    by.set(name, cur);
  }
  return [...by.entries()]
    .sort((a, b) => b[1].games - a[1].games || (b[1].lastDate < a[1].lastDate ? -1 : 1))
    .slice(0, limit)
    .map(([name, s]) => ({
      name,
      games: s.games,
      record: s.d > 0 ? `${s.w}–${s.l}–${s.d}` : `${s.w}–${s.l}`,
      last: s.last,
    }));
}

/** % of games played as White (rounded); 50 when nothing is known. */
export function deriveColorSplit(games: Game[]): number {
  const known = games.filter((g) => g.user_color === 'white' || g.user_color === 'black');
  if (known.length === 0) return 50;
  return Math.round((known.filter((g) => g.user_color === 'white').length / known.length) * 100);
}

/** Current (ending today/yesterday-exclusive: must include today) + longest streaks. */
export function computeStreaks(activeDays: Set<string>, today: Date): { current: number; longest: number } {
  // Current: walk back from today while days are active.
  let current = 0;
  let cursor = new Date(today);
  while (activeDays.has(dayKey(cursor))) {
    current += 1;
    cursor = addDays(cursor, -1);
  }
  // Longest: sort keys and scan for consecutive runs. Consecutiveness is a
  // calendar-day difference of 1 (diffLocalDays), not a fixed 86_400_000 ms gap
  // — the latter miscounts across a DST transition, where a local day is 23h/25h.
  const keys = [...activeDays].sort();
  let longest = 0, run = 0, prev: Date | null = null;
  for (const k of keys) {
    const d = parseLocalDay(k);
    run = prev && diffLocalDays(prev, d) === 1 ? run + 1 : 1;
    longest = Math.max(longest, run);
    prev = d;
  }
  return { current, longest: Math.max(longest, current) };
}

/**
 * The trailing `days` of study activity as a single flat strip (oldest first,
 * today last) — deliberately simple: one marker per day, active or not.
 * Replaced the weeks×7 heatmap grid, which read as visual clutter.
 */
export function buildStreakDays(activeDays: Set<string>, today: Date, days = 14): StreakDay[] {
  const out: StreakDay[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const k = dayKey(addDays(today, -i));
    out.push({ key: k, active: activeDays.has(k), isToday: i === 0 });
  }
  return out;
}
