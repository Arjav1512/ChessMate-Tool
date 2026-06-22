/**
 * Typed sample/derived analysis (Phase 5, decisions #3/#4). Until the real
 * client-Stockfish runner + persisted analysis exist, the workspace renders a
 * synthesized-but-coherent analysis of the sample game, shaped to the
 * Move/Analysis view-models so swapping to live data is mechanical.
 *
 * The hook (`hooks.ts`) reveals these plies *progressively* to satisfy the
 * "auto-run, board paints immediately, skeletons, populate progressively"
 * requirement without a mandatory Analyze button.
 */
import { Chess } from 'chess.js';
import { parsePGN } from '../../lib/pgn';
import { SAMPLE_PGN } from '../../lib/sampleData';
import { accuracyFromAvgCpLoss } from '../../lib/analysis/moveQuality';
import type { MoveQuality } from '../../lib/analysis/moveQuality';
import type { AnalysisMoveVM, GameVM, Phase } from './types';

export const SAMPLE_GAME_ID = 'sample';

export function getSampleGame(): GameVM {
  const pgn = parsePGN(SAMPLE_PGN);
  return {
    id: SAMPLE_GAME_ID,
    pgn: SAMPLE_PGN,
    white: pgn.headers.White || 'White',
    black: pgn.headers.Black || 'Black',
    whiteRating: 1487,
    blackRating: 1502,
    result: pgn.headers.Result || '1-0',
    eco: 'C84',
    opening: 'Ruy López, Closed',
    userColor: 'w',
  };
}

interface Flag { quality: MoveQuality; motifs: string[]; bestSan?: string; cpLoss?: number }

// Hand-placed flags so every InsightCard variant is demonstrable on the sample.
const FLAGS: Record<number, Flag> = {
  18: { quality: 'best', motifs: [] },
  22: { quality: 'brilliant', motifs: ['exchange-sacrifice'], cpLoss: 0 }, // played move is brilliant
  27: { quality: 'inaccuracy', motifs: ['premature-pawn-push'], bestSan: 'Be6', cpLoss: 70 },
  31: { quality: 'mistake', motifs: ['loosened-kingside'], bestSan: 'Kg7', cpLoss: 160 },
  33: { quality: 'blunder', motifs: ['hanging-piece'], bestSan: 'Bd7', cpLoss: 320 }, // turning point
};

const CP_LOSS: Record<MoveQuality, number> = {
  brilliant: 0, best: 0, good: 28, inaccuracy: 70, mistake: 160, blunder: 320,
};

function baseEval(i: number): number {
  let e = Math.round(20 * Math.sin(i / 5) + i * 2.4);
  if (i >= 27) e += 30;
  if (i >= 33) e += 190; // the blunder hands White a decisive edge
  return e;
}

function phaseFor(moveNumber: number): Phase {
  if (moveNumber <= 12) return 'opening';
  if (moveNumber <= 28) return 'middlegame';
  return 'endgame';
}

let _cache: AnalysisMoveVM[] | null = null;

export function getSampleMoves(): AnalysisMoveVM[] {
  if (_cache) return _cache;
  const pgn = parsePGN(SAMPLE_PGN);
  const moves = pgn.moves;
  const fen = pgn.fen;
  const out: AnalysisMoveVM[] = moves.map((san, idx) => {
    const ply = idx + 1;
    const color: 'w' | 'b' = ply % 2 === 1 ? 'w' : 'b';
    const moveNumber = Math.ceil(ply / 2);
    const flag = FLAGS[ply];
    const quality: MoveQuality = flag?.quality ?? (idx % 7 === 0 ? 'best' : 'good');
    const cpLoss = flag?.cpLoss ?? CP_LOSS[quality];
    const evalCp = baseEval(ply);
    // Derive from/to squares for the last-move tint (sample data is legal).
    let from = '', to = '';
    try {
      const c = new Chess(fen[idx] ?? fen[0]);
      const mv = c.move(san);
      if (mv) { from = mv.from; to = mv.to; }
    } catch { /* leave blank if unparsable */ }
    return {
      ply,
      moveNumber,
      color,
      san,
      from,
      to,
      fenBefore: fen[idx] ?? fen[0],
      fenAfter: fen[idx + 1] ?? fen[fen.length - 1],
      evalCp,
      mate: null,
      cpLoss,
      quality,
      bestSan: flag?.bestSan ?? (quality === 'best' || quality === 'brilliant' ? san : null),
      // Best move would have kept the mover ~cpLoss centipawns better (White POV).
      bestEvalCp: flag?.bestSan ? evalCp + (color === 'w' ? cpLoss : -cpLoss) : evalCp,
      phase: phaseFor(moveNumber),
      motifs: flag?.motifs ?? [],
    };
  });
  _cache = out;
  return out;
}

/** Plies of the biggest eval swings (turning points), worst-first. Clamped to
 *  the available move range so a changed sample PGN can't yield out-of-range jumps. */
export function getSampleTurningPoints(): number[] {
  const total = getSampleMoves().length;
  return [33, 31, 27].filter((p) => p >= 1 && p <= total);
}

/**
 * Accuracy per side. The real path uses `accuracyFromAvgCpLoss` over per-move
 * centipawn loss; the synthetic sample cp-losses aren't calibrated to that
 * curve, so for v1 we return believable sample accuracies (decision #3). When
 * real per-move analysis lands, swap this for the commented derivation.
 */
export function computeAccuracies(): { user: number; opponent: number } {
  void accuracyFromAvgCpLoss; // real-path helper retained for the data swap
  return { user: 84, opponent: 79 };
}
