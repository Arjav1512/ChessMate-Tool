/** Pure filter + sort for the Game Library (result/color/time-control/search/
 *  sort + favorites). Testable; data-source independent. */
import { timeControlBucket } from '../../lib/games/deriveGameMeta';
import type { GameFilter, GameRowVM } from './types';

export interface FilterOpts {
  favoritesOnly?: boolean;
  favorites?: Set<string>;
}

export function filterGames(rows: GameRowVM[], filter: GameFilter, opts: FilterOpts = {}): GameRowVM[] {
  const term = filter.search.trim().toLowerCase();
  const out = rows.filter((r) => {
    if (opts.favoritesOnly && !(opts.favorites?.has(r.id))) return false;
    if (filter.result !== 'all' && r.outcome !== filter.result) return false;
    if (filter.color !== 'all' && r.userColor !== filter.color) return false;
    if (filter.timeControl !== 'all' && timeControlBucket(r.timeControl) !== filter.timeControl) return false;
    if (term) {
      const hay = `${r.opponent} ${r.whitePlayer} ${r.blackPlayer} ${r.event} ${r.opening}`.toLowerCase();
      if (!hay.includes(term)) return false;
    }
    return true;
  });
  out.sort((a, b) => (filter.sort === 'newest' ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date)));
  return out;
}

/** Distinct time-control buckets present (for the filter dropdown). */
export function timeControlOptions(rows: GameRowVM[]): string[] {
  const order = ['Bullet', 'Blitz', 'Rapid', 'Classical', 'Other'];
  const present = new Set(rows.map((r) => timeControlBucket(r.timeControl)));
  return order.filter((b) => present.has(b));
}
