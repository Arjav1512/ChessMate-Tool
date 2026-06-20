import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { buildWeaknessProfile, type WeaknessGame, type WeaknessProfile } from '../lib/weaknessProfile';

// Session cache: the profile is derived from all of a user's games, which the
// Progress view and the coach both want. Computing it once per session keeps the
// feature read-only and cheap (no repeated full fetches / re-parsing).
const cache = new Map<string, WeaknessProfile>();

export function invalidateWeaknessProfile(userId?: string) {
  if (userId) cache.delete(userId);
  else cache.clear();
}

interface State {
  profile: WeaknessProfile | null;
  loading: boolean;
  error: string | null;
}

/**
 * Builds the read-only weakness profile from existing stored data (games +
 * game_analysis_results). Cached per user for the session. `enabled=false`
 * defers the fetch until a surface actually needs it (e.g. the coach panel).
 */
export function useWeaknessProfile(enabled = true): State {
  const { user } = useAuth();
  const [state, setState] = useState<State>({ profile: null, loading: false, error: null });

  useEffect(() => {
    if (!enabled || !user) return;

    const cached = cache.get(user.id);
    if (cached) {
      setState({ profile: cached, loading: false, error: null });
      return;
    }

    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: null }));

    (async () => {
      const [gamesRes, analysisRes] = await Promise.allSettled([
        supabase
          .from('games')
          .select('id, result, user_color, pgn, uploaded_at')
          .eq('user_id', user.id)
          .order('uploaded_at', { ascending: true }),
        supabase
          .from('game_analysis_results')
          .select('game_id, accuracy, mistakes, inaccuracies, blunders, total_moves')
          .eq('user_id', user.id),
      ]);

      if (cancelled) return;

      if (gamesRes.status !== 'fulfilled' || gamesRes.value.error) {
        setState({ profile: null, loading: false, error: 'Could not load your games.' });
        return;
      }

      const analyses = analysisRes.status === 'fulfilled' ? analysisRes.value.data ?? [] : [];
      const byGame = new Map<string, WeaknessGame['analysis']>();
      for (const a of analyses) {
        byGame.set(a.game_id, {
          accuracy: a.accuracy ?? 0,
          mistakes: a.mistakes ?? 0,
          inaccuracies: a.inaccuracies ?? 0,
          blunders: a.blunders ?? 0,
          total_moves: a.total_moves ?? undefined,
        });
      }

      const games: WeaknessGame[] = (gamesRes.value.data ?? []).map((g) => ({
        id: g.id,
        result: g.result,
        user_color: g.user_color,
        pgn: g.pgn,
        uploaded_at: g.uploaded_at,
        analysis: byGame.get(g.id) ?? null,
      }));

      const profile = buildWeaknessProfile(games);
      cache.set(user.id, profile);
      setState({ profile, loading: false, error: null });
    })();

    return () => { cancelled = true; };
  }, [enabled, user]);

  return state;
}
