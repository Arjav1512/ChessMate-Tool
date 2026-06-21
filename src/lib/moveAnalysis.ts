import { supabase } from './supabase';
import { classifyMove, type MoveClassification } from '../utils/moveClassifier';
import { detectMotifs, type Motif } from './motifs';

export type Phase = 'opening' | 'middlegame' | 'endgame';

/**
 * Derive the game phase of a position from its FEN + full-move number. Unlike the
 * old whole-game length proxy, this classifies each move by its *own* position.
 *
 * Heuristic (all phase definitions are heuristic): count non-pawn, non-king pieces
 * on the board (start = 14). Endgame once the heavy material is largely gone;
 * opening while it is early and material is essentially intact; middlegame between.
 */
export function derivePhase(fen: string, moveNumber: number): Phase {
  const placement = (fen.split(' ')[0] ?? '');
  let nonPawnPieces = 0;
  let queens = 0;
  for (const ch of placement) {
    const u = ch.toLowerCase();
    if (u === 'q') { queens++; nonPawnPieces++; }
    else if (u === 'r' || u === 'b' || u === 'n') nonPawnPieces++;
  }
  if (nonPawnPieces <= 4 || (queens === 0 && nonPawnPieces <= 6)) return 'endgame';
  if (moveNumber <= 10 && nonPawnPieces >= 12) return 'opening';
  return 'middlegame';
}

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
  phase: Phase;
  motif_tags: Motif[];
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
    const moveNumber = Math.floor(p.ply / 2) + 1;
    const cpLoss = isWhiteMove
      ? Math.max(0, p.evalCpBefore - p.evalCpAfter)
      : Math.max(0, p.evalCpAfter - p.evalCpBefore);
    const classification = classifyMove(p.evalCpBefore, p.evalCpAfter, isWhiteMove);
    rows.push({
      game_id: gameId,
      user_id: userId,
      ply: p.ply,
      move_number: moveNumber,
      color: isWhiteMove ? 'white' : 'black',
      fen: p.fenBefore,
      san: p.san,
      eval_cp: Math.round(p.evalCpAfter),
      cp_loss: Math.round(cpLoss),
      classification,
      best_move: p.bestMove,
      phase: derivePhase(p.fenBefore, moveNumber),
      motif_tags: detectMotifs({
        fenBefore: p.fenBefore,
        san: p.san,
        bestMove: p.bestMove,
        isWhiteMove,
        evalCpBefore: p.evalCpBefore,
        evalCpAfter: p.evalCpAfter,
        classification,
      }),
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
