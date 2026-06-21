import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { MistakeInput } from '../lib/mistakeReview';
import type { Phase } from '../lib/moveAnalysis';
import type { Motif } from '../lib/motifs';
import type { MoveClassification } from '../utils/moveClassifier';

// Session cache: the user's mistakes change only on (re)analysis; the feed and
// any filters are applied client-side over this set, so one fetch per session.
const cache = new Map<string, MistakeInput[]>();

export function invalidateMistakeReview(userId?: string) {
  if (userId) cache.delete(userId);
  else cache.clear();
}

interface State {
  mistakes: MistakeInput[];
  loading: boolean;
  error: string | null;
}

/** The user's own mistake/blunder moves (read-only) for the review feed. */
export function useMistakeReview(enabled = true): State {
  const { user } = useAuth();
  const [state, setState] = useState<State>({ mistakes: [], loading: false, error: null });

  useEffect(() => {
    if (!enabled || !user) return;

    const cached = cache.get(user.id);
    if (cached) {
      setState({ mistakes: cached, loading: false, error: null });
      return;
    }

    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: null }));

    (async () => {
      const [gamesRes, movesRes] = await Promise.allSettled([
        supabase.from('games').select('id, user_color').eq('user_id', user.id),
        supabase
          .from('move_analysis')
          .select('game_id, fen, san, best_move, cp_loss, phase, motif_tags, move_number, color, classification')
          .eq('user_id', user.id)
          .in('classification', ['mistake', 'blunder']),
      ]);

      if (cancelled) return;

      if (movesRes.status !== 'fulfilled' || movesRes.value.error) {
        setState({ mistakes: [], loading: false, error: 'Could not load your mistakes.' });
        return;
      }

      const userColorByGame = new Map<string, 'white' | 'black' | null>();
      if (gamesRes.status === 'fulfilled') {
        for (const g of gamesRes.value.data ?? []) userColorByGame.set(g.id, g.user_color);
      }

      const mistakes: MistakeInput[] = [];
      for (const m of movesRes.value.data ?? []) {
        if (!m.phase || m.color !== userColorByGame.get(m.game_id)) continue;
        mistakes.push({
          gameId: m.game_id,
          fen: m.fen,
          san: m.san,
          bestMove: m.best_move,
          classification: (m.classification ?? 'blunder') as MoveClassification,
          cpLoss: m.cp_loss ?? 0,
          phase: m.phase as Phase,
          motifs: (m.motif_tags ?? []) as Motif[],
          moveNumber: m.move_number,
          color: m.color as 'white' | 'black',
        });
      }

      cache.set(user.id, mistakes);
      setState({ mistakes, loading: false, error: null });
    })();

    return () => { cancelled = true; };
  }, [enabled, user]);

  return state;
}
