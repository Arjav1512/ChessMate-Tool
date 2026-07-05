/**
 * Pure derivations for the Insights screen. Every number on the page comes
 * through here from shared sources — the games list, the analysis results,
 * and (sample path) the same sample data the Dashboard/Improve/Analysis
 * screens render — so Insights can never disagree with the rest of the app.
 */
import type { Game } from '../../lib/supabase';

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

export interface HeatmapVM {
  /** 7 rows (Sun..Sat) × N week columns. null = outside range / in the future. */
  rows: (number | null)[][];
  /** Month labels per contiguous week span (for aligned rendering). */
  monthSpans: { label: string; span: number }[];
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
  heatmap: HeatmapVM;
  seriesLabel: string;         // 'Rating' (sample) / 'Avg accuracy' (real)
  series: { label: string; value: number }[];
  seriesNow: number;
  seriesDelta: number;
  opponents: OpponentRow[];
}

/** Local YYYY-MM-DD key (heatmap/streak work in local days, like the user does). */
export function dayKey(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

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
  const cursor = new Date(today);
  while (activeDays.has(dayKey(cursor))) {
    current += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  // Longest: sort keys and scan for consecutive runs.
  const keys = [...activeDays].sort();
  let longest = 0, run = 0, prev: Date | null = null;
  for (const k of keys) {
    const d = new Date(`${k}T00:00:00`);
    run = prev && d.getTime() - prev.getTime() === 86_400_000 ? run + 1 : 1;
    longest = Math.max(longest, run);
    prev = d;
  }
  return { current, longest: Math.max(longest, current) };
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Build the activity heatmap grid: 7 weekday rows × `weeks` columns, the last
 * column being the current (possibly partial) week. Days after `today` are
 * null so the grid never implies future activity. Intensity 0–4 from the
 * per-day activity count. Month labels span the week columns they cover.
 */
export function buildHeatmap(counts: Map<string, number>, today: Date, weeks = 16): Pick<HeatmapVM, 'rows' | 'monthSpans'> {
  // Sunday that starts the current week, then back (weeks-1) more weeks.
  const start = new Date(today);
  start.setDate(start.getDate() - start.getDay() - (weeks - 1) * 7);

  const rows: (number | null)[][] = Array.from({ length: 7 }, () => []);
  const weekMonths: string[] = [];
  for (let w = 0; w < weeks; w++) {
    const weekStart = new Date(start);
    weekStart.setDate(start.getDate() + w * 7);
    weekMonths.push(MONTH_NAMES[weekStart.getMonth()]);
    for (let d = 0; d < 7; d++) {
      const cell = new Date(weekStart);
      cell.setDate(weekStart.getDate() + d);
      if (cell.getTime() > today.getTime()) { rows[d].push(null); continue; }
      const n = counts.get(dayKey(cell)) ?? 0;
      rows[d].push(n === 0 ? 0 : Math.min(4, n + 1));
    }
  }
  const monthSpans: { label: string; span: number }[] = [];
  for (const m of weekMonths) {
    const lastSpan = monthSpans[monthSpans.length - 1];
    if (lastSpan && lastSpan.label === m) lastSpan.span += 1;
    else monthSpans.push({ label: m, span: 1 });
  }
  return { rows, monthSpans };
}
