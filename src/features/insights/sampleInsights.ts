/**
 * Typed sample/derived Insights data (mirrors the dashboard's sampleDashboard
 * approach). The Insights screen ships before the play-history / opponents data
 * layer exists (roadmap Phase 11); these values are shaped like the future API
 * responses so the query hooks swap to live data by changing only the adapter.
 */

export interface StrengthArea {
  key: string;
  label: string;
  /** Strength score 0–100 for this area. */
  pct: number;
  /** Supporting count (e.g. tactical wins). */
  note: string;
}

export interface OpponentRow {
  name: string;
  rating: number;
  /** Games played against them and your score, e.g. "3–1". */
  games: number;
  record: string;
  /** Most recent result vs this opponent. */
  last: 'win' | 'loss' | 'draw';
}

export interface InsightsVM {
  /** Header status line (current activity). */
  status: string;
  // Row 1
  accuracy: number;            // avg accuracy, 0–100 (the gauge)
  percentile: number;          // "Top N%"
  movesAnalyzed: number;
  mistakesFound: number;
  brilliantMoves: number;
  gamesAnalyzed: number;
  gamesTrendPct: number;       // +N% this month
  studyHours: number;
  whitePct: number;            // color split
  // Row 2
  topArea: string;
  strengths: StrengthArea[];
  currentStreak: number;
  longestStreak: number;
  /** Activity intensity per day, 0–4, oldest → newest, row-major by weekday. */
  heatmap: number[][];         // 7 rows (Sun..Sat) × weeks
  heatmapMonths: string[];
  // Tab 2
  ratingSeries: { label: string; value: number }[];
  ratingNow: number;
  ratingDelta: number;
  opponents: OpponentRow[];
}

/** Deterministic pseudo-heatmap so the sample looks lived-in but stable. */
function buildHeatmap(weeks: number): number[][] {
  const rows: number[][] = [];
  for (let d = 0; d < 7; d++) {
    const row: number[] = [];
    for (let w = 0; w < weeks; w++) {
      // More activity recently, weekends busier; a couple of gaps early on.
      const recency = w / weeks;                 // 0..1
      const weekend = d === 0 || d === 6 ? 1 : 0;
      const seed = (d * 7 + w * 3 + 5) % 11;      // stable jitter
      let v = Math.round(recency * 3 + weekend + (seed > 8 ? 1 : 0) - (seed < 2 ? 2 : 0));
      v = Math.max(0, Math.min(4, v));
      row.push(v);
    }
    rows.push(row);
  }
  return rows;
}

export const sampleInsights: InsightsVM = {
  status: '1487 rating · active today · 3-game win streak',

  accuracy: 84,
  percentile: 12,
  movesAnalyzed: 8342,
  mistakesFound: 412,
  brilliantMoves: 96,
  gamesAnalyzed: 342,
  gamesTrendPct: 18,
  studyHours: 46,
  whitePct: 54,

  topArea: 'Tactics',
  strengths: [
    { key: 'tactics', label: 'Tactics', pct: 84, note: '312 tactical wins' },
    { key: 'openings', label: 'Openings', pct: 71, note: 'Ruy López, Najdorf' },
    { key: 'middlegame', label: 'Middlegame', pct: 63, note: 'Solid planning' },
    { key: 'timemgmt', label: 'Time management', pct: 55, note: 'Rarely in time trouble' },
    { key: 'endgame', label: 'Endgame', pct: 48, note: 'Rook endings to drill' },
    { key: 'conversion', label: 'Conversion', pct: 41, note: 'Winning positions leak' },
  ],

  currentStreak: 5,
  longestStreak: 12,
  heatmap: buildHeatmap(16),
  heatmapMonths: ['Mar', 'Apr', 'May', 'Jun'],

  ratingSeries: [
    { label: 'Nov', value: 1402 },
    { label: 'Dec', value: 1418 },
    { label: 'Jan', value: 1409 },
    { label: 'Feb', value: 1436 },
    { label: 'Mar', value: 1451 },
    { label: 'Apr', value: 1447 },
    { label: 'May', value: 1472 },
    { label: 'Jun', value: 1487 },
  ],
  ratingNow: 1487,
  ratingDelta: 85,

  opponents: [
    { name: 'M. Carlsen', rating: 1602, games: 6, record: '2–4', last: 'loss' },
    { name: 'hikaru', rating: 1548, games: 4, record: '3–1', last: 'win' },
    { name: 'a_pawn_storm', rating: 1495, games: 8, record: '5–2–1', last: 'win' },
    { name: 'endgame_andy', rating: 1471, games: 3, record: '1–1–1', last: 'draw' },
    { name: 'tactician_t', rating: 1523, games: 5, record: '2–3', last: 'loss' },
    { name: 'positional_p', rating: 1460, games: 4, record: '3–1', last: 'win' },
  ],
};
