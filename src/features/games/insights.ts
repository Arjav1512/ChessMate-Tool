/** Quick-insight strip values (§4.2). Best opening is derived from the loaded
 *  games (real); mistake/accuracy need analysis aggregates → null in v1 (shown
 *  muted), populated when the data layer lands (Phase 11). */
import type { GameRowVM } from './types';

export interface GamesInsights {
  bestOpening: { name: string; winPct: number; games: number } | null;
  mostCommonMistake: string | null;
  avgAccuracy: number | null;
}

export function computeInsights(rows: GameRowVM[]): GamesInsights {
  const byOpening = new Map<string, { wins: number; total: number }>();
  for (const r of rows) {
    if (r.opening === 'Unknown opening' || r.outcome === 'unknown') continue;
    const e = byOpening.get(r.opening) ?? { wins: 0, total: 0 };
    e.total += 1;
    if (r.outcome === 'win') e.wins += 1;
    byOpening.set(r.opening, e);
  }
  let bestOpening: GamesInsights['bestOpening'] = null;
  for (const [name, { wins, total }] of byOpening) {
    if (total < 2) continue;
    const winPct = Math.round((wins / total) * 100);
    if (!bestOpening || winPct > bestOpening.winPct) bestOpening = { name, winPct, games: total };
  }
  return { bestOpening, mostCommonMistake: null, avgAccuracy: null };
}
