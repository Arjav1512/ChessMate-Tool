import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { toGameRowVM } from '../../lib/games/deriveGameMeta';
import type { Game } from '../../lib/supabase';
import type { GameRowVM } from './types';
import { sampleAnalyzedIds, sampleGames } from './sampleGames';

const PAGE_SIZE = 50;

/** Fetch the set of analyzed game ids for a batch (status derivation, no schema change). */
async function fetchAnalyzedIds(userId: string, gameIds: string[]): Promise<Set<string>> {
  if (gameIds.length === 0) return new Set();
  const { data, error } = await supabase
    .from('game_analysis_results')
    .select('game_id')
    .eq('user_id', userId)
    .in('game_id', gameIds);
  if (error) return new Set();
  return new Set((data ?? []).map((r: { game_id: string }) => r.game_id));
}

interface State {
  rows: GameRowVM[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  error: string | null;
}

/**
 * Game Library data (Phase 7). Production reads the real `games` table
 * (paginated). The unauthenticated DEV `?shell` preview falls back to sample
 * games so the Library is reviewable; production never uses the fallback.
 */
export function useGames(): State & { loadMore: () => void; reload: () => void } {
  const { user } = useAuth();
  const [state, setState] = useState<State>({ rows: [], loading: true, loadingMore: false, hasMore: false, error: null });
  const reqId = useRef(0);

  const toRows = useCallback((games: Game[], analyzed: Set<string>) =>
    games.map((g) => toGameRowVM(g, analyzed.has(g.id))), []);

  const load = useCallback(async () => {
    const id = ++reqId.current;
    setState((s) => ({ ...s, loading: true, error: null }));

    // DEV fallback: no authenticated session in the preview → sample games.
    if (!user) {
      if (import.meta.env.DEV) {
        setState({ rows: sampleGames.map((g) => toGameRowVM(g, sampleAnalyzedIds.has(g.id))), loading: false, loadingMore: false, hasMore: false, error: null });
      } else {
        setState({ rows: [], loading: false, loadingMore: false, hasMore: false, error: null });
      }
      return;
    }

    const { data, error } = await supabase
      .from('games').select('*').eq('user_id', user.id)
      .order('uploaded_at', { ascending: false }).order('id', { ascending: false })
      .range(0, PAGE_SIZE - 1);
    if (id !== reqId.current) return;
    if (error) {
      setState({ rows: [], loading: false, loadingMore: false, hasMore: false, error: 'Could not load your games.' });
      return;
    }
    const games = (data ?? []) as Game[];
    const analyzed = await fetchAnalyzedIds(user.id, games.map((g) => g.id));
    if (id !== reqId.current) return;
    setState({ rows: toRows(games, analyzed), loading: false, loadingMore: false, hasMore: games.length === PAGE_SIZE, error: null });
  }, [user, toRows]);

  const loadMore = useCallback(async () => {
    // Re-entry guard: never run two page fetches at once.
    if (!user || moreInFlight.current || !stateRef.current.hasMore) return;
    moreInFlight.current = true;
    const id = reqId.current;            // staleness: a reload() bumps reqId
    setState((s) => ({ ...s, loadingMore: true }));
    const from = stateRef.current.rows.length;
    try {
      const { data, error } = await supabase
        .from('games').select('*').eq('user_id', user.id)
        .order('uploaded_at', { ascending: false }).order('id', { ascending: false })
        .range(from, from + PAGE_SIZE - 1);
      if (id !== reqId.current) return;  // a reload superseded this page fetch
      if (error) { setState((s) => ({ ...s, loadingMore: false })); return; }
      const games = (data ?? []) as Game[];
      const analyzed = await fetchAnalyzedIds(user.id, games.map((g) => g.id));
      if (id !== reqId.current) return;
      setState((s) => {
        const seen = new Set(s.rows.map((r) => r.id));
        const next = toRows(games, analyzed).filter((r) => !seen.has(r.id));
        return { ...s, rows: [...s.rows, ...next], loadingMore: false, hasMore: games.length === PAGE_SIZE };
      });
    } finally {
      moreInFlight.current = false;
    }
  }, [user, toRows]);

  // Keep a ref of the latest state for loadMore's offset + re-entry lock.
  const stateRef = useRef(state);
  stateRef.current = state;
  const moreInFlight = useRef(false);

  useEffect(() => { load(); }, [load]);

  return { ...state, loadMore, reload: load };
}
