/** Collections = saved smart-filters. localStorage for v1 (decision #4); a
 *  server table replaces this in Phase 11. Built-ins are virtual (not stored). */
import type { GameFilter } from './types';

const COLLECTIONS_KEY = 'cm.collections';
const FAVORITES_KEY = 'cm.favorites';

export interface CollectionDef {
  id: string;
  name: string;
  builtIn: boolean;
  filter?: Partial<GameFilter>;
  favorites?: boolean;   // special: filter to favorited game ids
}

export const BUILT_IN_COLLECTIONS: CollectionDef[] = [
  { id: 'all', name: 'All games', builtIn: true },
  { id: 'recent', name: 'Recent', builtIn: true, filter: { sort: 'newest' } },
  { id: 'favorites', name: 'Favorites', builtIn: true, favorites: true },
  { id: 'losses', name: 'Losses to review', builtIn: true, filter: { result: 'loss' } },
];

function read<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function readCustomCollections(): CollectionDef[] {
  const raw = read<Array<{ id: string; name: string; filter: Partial<GameFilter> }>>(COLLECTIONS_KEY, []);
  return raw.filter((c) => c && typeof c.id === 'string' && typeof c.name === 'string')
    .map((c) => ({ id: c.id, name: c.name, builtIn: false, filter: c.filter ?? {} }));
}

export function allCollections(): CollectionDef[] {
  return [...BUILT_IN_COLLECTIONS, ...readCustomCollections()];
}

export function addCollection(name: string, filter: Partial<GameFilter>): CollectionDef {
  const def: CollectionDef = { id: `c-${Date.now()}`, name, builtIn: false, filter };
  const next = [...readCustomCollections().map((c) => ({ id: c.id, name: c.name, filter: c.filter ?? {} })),
    { id: def.id, name: def.name, filter }];
  try { window.localStorage.setItem(COLLECTIONS_KEY, JSON.stringify(next)); } catch { /* ignore */ }
  return def;
}

export function deleteCollection(id: string): void {
  const next = readCustomCollections().filter((c) => c.id !== id)
    .map((c) => ({ id: c.id, name: c.name, filter: c.filter ?? {} }));
  try { window.localStorage.setItem(COLLECTIONS_KEY, JSON.stringify(next)); } catch { /* ignore */ }
}

export function readFavorites(): Set<string> {
  return new Set(read<string[]>(FAVORITES_KEY, []));
}

export function toggleFavorite(id: string): Set<string> {
  const favs = readFavorites();
  if (favs.has(id)) favs.delete(id); else favs.add(id);
  try { window.localStorage.setItem(FAVORITES_KEY, JSON.stringify([...favs])); } catch { /* ignore */ }
  return favs;
}
