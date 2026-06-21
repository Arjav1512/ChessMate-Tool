import { supabase } from './supabase';
import { classifyMove, type MoveClassification } from '../utils/moveClassifier';

// ─────────────────────────────────────────────────────────────────────────────
// Per-ply analysis persistence (Phase 2 / PR B-1).
//
// Stores the per-move data already computed during analysis into the additive
// `move_analysis` table — the foundation for true phase weakness, tactical-motif
// tagging, and train-on-your-mistakes. Persist-forward only (newly analyzed /
// re-analyzed games); no engine work is added — these are existing results.
//
// `phase` and `motif_tags` are intentionally NOT written here; later PRs populate
// them (the columns exist with safe defaults).
// ─────────────────────────────────────────────────────────────────────────────

export interface MoveAnalysisRow {
  game_id: string;
  user_id: string;
  ply: number;
  move_number: number;
  color: 'white' | 'black';
  fen: string;
  san: string | null;
  eval_cp: number;
  cp_loss: number;
  classification: MoveClassification;
  best_move: string | null;
}

/** One half-move of already-computed analysis, in source-of-truth units. */
export interface PlyAnalysis {
  /** 0-based half-move index of the played move (moves[0] = White's 1st). */
  ply: number;
  /** Position BEFORE the move was played (the drill position). */
  fenBefore: string;
  /** The move played, SAN. */
  san: string | null;
  /** Engine eval of the position before the move, centipawns, White POV. */
  evalCpBefore: number;
  /** Engine eval of the position after the move, centipawns, White POV. */
  evalCpAfter: number;
  /** Engine's best move in the BEFORE position (the better alternative). */
  bestMove: string | null;
}

/**
 * Pure: derive persisted rows from per-ply analysis. Centralizes color /
 * move-number / centipawn-loss / classification so it is unit-tested independently
 * of Supabase. Plies with a non-finite eval are skipped (can't be classified).
 */
export function buildMoveAnalysisRows(
  gameId: string,
  userId: string,
  plies: PlyAnalysis[],
): MoveAnalysisRow[] {
  const rows: MoveAnalysisRow[] = [];
  for (const p of plies) {
    if (!Number.isFinite(p.evalCpBefore) || !Number.isFinite(p.evalCpAfter)) continue;
    const isWhiteMove = p.ply % 2 === 0;
    const cpLoss = isWhiteMove
      ? Math.max(0, p.evalCpBefore - p.evalCpAfter)
      : Math.max(0, p.evalCpAfter - p.evalCpBefore);
    rows.push({
      game_id: gameId,
      user_id: userId,
      ply: p.ply,
      move_number: Math.floor(p.ply / 2) + 1,
      color: isWhiteMove ? 'white' : 'black',
      fen: p.fenBefore,
      san: p.san,
      eval_cp: Math.round(p.evalCpAfter),
      cp_loss: Math.round(cpLoss),
      classification: classifyMove(p.evalCpBefore, p.evalCpAfter, isWhiteMove),
      best_move: p.bestMove,
    });
  }
  return rows;
}

/**
 * Persist per-ply rows for a game (idempotent upsert on game_id+ply, so a
 * re-analysis cleanly replaces prior rows). Non-fatal: a failure here must not
 * break the analysis flow, which already persisted its aggregate result.
 */
export async function persistMoveAnalysis(rows: MoveAnalysisRow[]): Promise<{ ok: boolean; error?: string }> {
  if (rows.length === 0) return { ok: true };
  try {
    const { error } = await supabase.from('move_analysis').upsert(rows, { onConflict: 'game_id,ply' });
    if (error) {
      console.warn('persistMoveAnalysis failed (non-fatal):', error.message);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn('persistMoveAnalysis threw (non-fatal):', msg);
    return { ok: false, error: msg };
  }
}

/** Whether a game already has persisted per-move analysis (for lazy backfill). */
export async function gameHasMoveAnalysis(gameId: string): Promise<boolean> {
  try {
    const { count, error } = await supabase
      .from('move_analysis')
      .select('id', { count: 'exact', head: true })
      .eq('game_id', gameId);
    if (error) return false;
    return (count ?? 0) > 0;
  } catch {
    return false;
  }
}
