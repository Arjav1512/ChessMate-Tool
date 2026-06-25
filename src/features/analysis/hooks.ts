import { useEffect, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { parsePGN } from '../../lib/pgn';
import { stockfish } from '../../lib/stockfish';
import {
  buildMoveAnalysisRows, derivePhase, persistMoveAnalysis,
  type MoveAnalysisRow, type PlyAnalysis,
} from '../../lib/moveAnalysis';
import { accuracyFromAvgCpLoss, mapLegacyClassification } from '../../lib/analysis/moveQuality';
import { getSampleGame, getSampleMoves, getSampleTurningPoints, computeAccuracies } from './sampleAnalysis';
import type { Game } from '../../lib/supabase';
import type { AnalysisMoveVM, AnalysisVM, GameVM } from './types';

/**
 * Game + analysis for the workspace.
 *
 * Phase 8B — real-data wiring (no UI/contract change): for an authenticated user
 * opening a real game, this loads the game, reads existing per-ply analysis from
 * `move_analysis`, and — if the game has not been analyzed — runs the existing
 * client Stockfish pipeline and persists results via the existing writers
 * (`buildMoveAnalysisRows` / `persistMoveAnalysis` + `game_analysis_results`).
 *
 * The sample experience is preserved verbatim for the demo route (`id === 'sample'`)
 * and the unauthenticated dev preview, so screenshots, the `?shell` preview, and
 * the a11y suite are unaffected. Component contracts (`GameVM`/`AnalysisMoveVM`/
 * `AnalysisVM`) are unchanged.
 */

interface State {
  game: GameVM;
  moves: AnalysisMoveVM[];
  status: AnalysisVM['status'];
  analyzedPlies: number;
  totalPlies: number;
  accuracyUser: number | null;
  accuracyOpponent: number | null;
  turningPoints: number[];
}

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

function loadingGame(id: string): GameVM {
  return { id, pgn: '', white: '—', black: '—', whiteRating: null, blackRating: null, result: '*', eco: '', opening: '', userColor: 'w' };
}

function gameRowToVM(g: Game): GameVM {
  const headers = (() => { try { return parsePGN(g.pgn).headers; } catch { return {} as Record<string, string | undefined>; } })();
  return {
    id: g.id,
    pgn: g.pgn,
    white: g.white_player || headers.White || 'White',
    black: g.black_player || headers.Black || 'Black',
    whiteRating: headers.WhiteElo ? Number(headers.WhiteElo) : null,
    blackRating: headers.BlackElo ? Number(headers.BlackElo) : null,
    result: g.result || headers.Result || '*',
    eco: headers.ECO ?? '',
    opening: headers.Opening ?? '',
    userColor: g.user_color === 'black' ? 'b' : 'w',
  };
}

function uciToSan(fen: string, uci: string | null): string | null {
  if (!uci || uci.length < 4) return uci;
  try {
    const c = new Chess(fen);
    const m = c.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] as never });
    return m?.san ?? uci;
  } catch { return uci; }
}

/** Build the base move list (board + move list) from a PGN — no analysis yet. */
function baseMoves(pgn: string): AnalysisMoveVM[] {
  const data = parsePGN(pgn);
  const fens = data.fen;
  return data.moves.map((san, idx) => {
    const ply = idx + 1;
    const moveNumber = Math.ceil(ply / 2);
    const fenBefore = fens[idx] ?? fens[0] ?? START_FEN;
    let from = '', to = '';
    try { const c = new Chess(fenBefore); const mv = c.move(san); if (mv) { from = mv.from; to = mv.to; } } catch { /* leave blank */ }
    return {
      ply, moveNumber, color: ply % 2 === 1 ? 'w' : 'b', san, from, to,
      fenBefore, fenAfter: fens[idx + 1] ?? fens[fens.length - 1] ?? fenBefore,
      evalCp: null, mate: null, cpLoss: null, quality: null, bestSan: null, bestEvalCp: null,
      phase: derivePhase(fenBefore, moveNumber), motifs: [],
    } as AnalysisMoveVM;
  });
}

/** Overlay persisted per-ply analysis onto the base moves (read path). */
function applyRows(base: AnalysisMoveVM[], rows: MoveAnalysisRow[]): AnalysisMoveVM[] {
  const byPly = new Map(rows.map((r) => [r.ply, r])); // r.ply is the 0-based move index
  return base.map((m, idx) => {
    const r = byPly.get(idx);
    if (!r) return m;
    return {
      ...m,
      evalCp: r.eval_cp,
      cpLoss: r.cp_loss,
      quality: mapLegacyClassification(r.classification),
      bestSan: uciToSan(m.fenBefore, r.best_move),
      phase: r.phase,
      motifs: r.motif_tags as string[],
    };
  });
}

function accuraciesFromRows(rows: MoveAnalysisRow[], userColor: 'w' | 'b') {
  const uc = userColor === 'w' ? 'white' : 'black';
  const avg = (arr: MoveAnalysisRow[]) => (arr.length ? arr.reduce((s, r) => s + r.cp_loss, 0) / arr.length : 0);
  const u = rows.filter((r) => r.color === uc);
  const o = rows.filter((r) => r.color !== uc);
  return {
    user: u.length ? Math.round(accuracyFromAvgCpLoss(avg(u))) : null,
    opponent: o.length ? Math.round(accuracyFromAvgCpLoss(avg(o))) : null,
  };
}

/** Top-3 plies by centipawn loss → VM plies (1-based), for the turning-points UI. */
function turningPointsFromRows(rows: MoveAnalysisRow[]): number[] {
  return [...rows].sort((a, b) => b.cp_loss - a.cp_loss).slice(0, 3).map((r) => r.ply + 1).sort((a, b) => a - b);
}

/** Run the existing Stockfish pipeline over a game and persist via existing writers. */
async function runAndPersist(
  game: Game, alive: { current: boolean }, onProgress: (n: number) => void,
): Promise<MoveAnalysisRow[] | null> {
  await stockfish.initialize();
  const data = parsePGN(game.pgn);
  const chess = new Chess();
  const evals: number[] = [];
  const plies: PlyAnalysis[] = [];
  let prevBest: string | null = null;

  for (let i = 0; i < data.moves.length; i++) {
    if (!alive.current) return null;
    const fenBefore = chess.fen();
    chess.move(data.moves[i]);
    const res = await stockfish.analyzePosition(chess.fen(), 15, 1);
    let evalNum: number;
    if (res.isMate) {
      const m = parseInt(res.evaluation.replace('M', ''), 10);
      evalNum = Number.isNaN(m) ? 0 : (m > 0 ? 100 : -100);
    } else {
      evalNum = parseFloat(res.evaluation);
      if (Number.isNaN(evalNum)) evalNum = 0;
    }
    evals.push(evalNum);
    if (i > 0) {
      plies.push({ ply: i, fenBefore, san: data.moves[i], evalCpBefore: evals[i - 1] * 100, evalCpAfter: evals[i] * 100, bestMove: prevBest });
    }
    prevBest = res.bestMove ?? null;
    onProgress(i + 1);
  }

  const rows = buildMoveAnalysisRows(game.id, game.user_id, plies);
  await persistMoveAnalysis(rows); // upsert move_analysis (existing writer)

  // Per-game summary — mirror the existing game_analysis_results upsert.
  const counts: Record<string, number> = { best: 0, excellent: 0, good: 0, inaccuracy: 0, mistake: 0, blunder: 0 };
  let totalCpLoss = 0;
  for (const r of rows) { counts[r.classification] = (counts[r.classification] ?? 0) + 1; totalCpLoss += r.cp_loss; }
  const totalMoves = rows.length;
  const avgCp = totalMoves ? totalCpLoss / totalMoves : 0;
  await supabase.from('game_analysis_results').upsert({
    game_id: game.id, user_id: game.user_id,
    accuracy: Math.round(accuracyFromAvgCpLoss(avgCp) * 100) / 100,
    total_moves: totalMoves,
    mistakes: counts.mistake, inaccuracies: counts.inaccuracy, blunders: counts.blunder,
    good_moves: counts.good, best_moves: counts.best + counts.excellent,
    average_centipawn_loss: Math.round(avgCp * 100) / 100,
  }, { onConflict: 'game_id' });

  return rows;
}

export function useAnalysis(gameId: string, opts: { instant?: boolean } = {}): {
  game: GameVM; moves: AnalysisMoveVM[]; analysis: AnalysisVM;
} {
  const { user } = useAuth();
  // Sample experience: the demo route, or the unauthenticated dev preview.
  const useSample = gameId === 'sample' || (!user && import.meta.env.DEV);

  const [state, setState] = useState<State>(() => ({
    game: loadingGame(gameId), moves: [], status: 'analyzing', analyzedPlies: 0, totalPlies: 0,
    accuracyUser: null, accuracyOpponent: null, turningPoints: [],
  }));
  const reduceMotion = useRef(typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);

  useEffect(() => {
    const alive = { current: true };

    // ── Sample path (unchanged behavior) ──────────────────────────────────
    if (useSample) {
      const game = getSampleGame();
      const full = getSampleMoves();
      const total = full.length;
      const reveal = (n: number): State => ({
        game,
        moves: full.map((m) => (m.ply <= n ? m : { ...m, evalCp: null, mate: null, cpLoss: null, quality: null, bestSan: null, bestEvalCp: null })),
        status: n >= total ? 'analyzed' : 'analyzing',
        analyzedPlies: n, totalPlies: total,
        accuracyUser: n >= total ? computeAccuracies().user : null,
        accuracyOpponent: n >= total ? computeAccuracies().opponent : null,
        turningPoints: n >= total ? getSampleTurningPoints() : [],
      });
      if (opts.instant || reduceMotion.current) { setState(reveal(total)); return () => { alive.current = false; }; }
      setState(reveal(0));
      let p = 0;
      const tid = window.setInterval(() => {
        p += 2; if (p >= total) { p = total; window.clearInterval(tid); }
        if (alive.current) setState(reveal(p));
      }, 110);
      return () => { alive.current = false; window.clearInterval(tid); };
    }

    // ── Real path ─────────────────────────────────────────────────────────
    setState({ game: loadingGame(gameId), moves: [], status: 'analyzing', analyzedPlies: 0, totalPlies: 0, accuracyUser: null, accuracyOpponent: null, turningPoints: [] });
    (async () => {
      try {
        const { data: g, error } = await supabase.from('games').select('*').eq('id', gameId).maybeSingle();
        if (!alive.current) return;
        if (error || !g) { setState((s) => ({ ...s, status: 'failed' })); return; }
        const game = gameRowToVM(g as Game);
        const base = baseMoves((g as Game).pgn);
        setState({ game, moves: base, status: 'analyzing', analyzedPlies: 0, totalPlies: base.length, accuracyUser: null, accuracyOpponent: null, turningPoints: [] });

        // Existing analysis? read it.
        const { data: existing } = await supabase
          .from('move_analysis')
          .select('game_id, user_id, ply, move_number, color, fen, san, eval_cp, cp_loss, classification, best_move, phase, motif_tags')
          .eq('game_id', gameId).order('ply', { ascending: true });
        if (!alive.current) return;

        let rows = (existing ?? []) as MoveAnalysisRow[];
        if (rows.length === 0) {
          // Not analyzed yet → run the existing engine + persist.
          const produced = await runAndPersist(g as Game, alive, (n) => { if (alive.current) setState((s) => ({ ...s, analyzedPlies: n })); });
          if (!alive.current || !produced) return;
          rows = produced;
        }

        const moves = applyRows(base, rows);
        const acc = accuraciesFromRows(rows, game.userColor);
        setState({ game, moves, status: 'analyzed', analyzedPlies: base.length, totalPlies: base.length, accuracyUser: acc.user, accuracyOpponent: acc.opponent, turningPoints: turningPointsFromRows(rows) });
      } catch {
        if (alive.current) setState((s) => ({ ...s, status: 'failed' }));
      }
    })();

    return () => { alive.current = false; };
  }, [gameId, useSample, opts.instant]);

  return {
    game: state.game,
    moves: state.moves,
    analysis: {
      status: state.status,
      analyzedPlies: state.analyzedPlies,
      totalPlies: state.totalPlies,
      accuracyUser: state.accuracyUser,
      accuracyOpponent: state.accuracyOpponent,
      turningPoints: state.turningPoints,
    },
  };
}
