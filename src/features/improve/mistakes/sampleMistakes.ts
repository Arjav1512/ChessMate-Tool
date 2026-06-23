import type { MistakeInput } from '../../../lib/mistakeReview';
import type { Motif } from '../../../lib/motifs';
import type { Phase } from '../../../lib/moveAnalysis';
import type { MoveClassification } from '../../../utils/moveClassifier';

/**
 * Typed sample/derived mistakes (Phase 7, decision #4). Shaped exactly like the
 * B-4 `useMistakeReview` output (`MistakeInput`), so the live swap = replace this
 * source with the real hook. FENs are valid positions; best moves are plausible.
 */
export const sampleDetectedMistakes: MistakeInput[] = [
  { gameId: 'g-2042', fen: 'r2q1rk1/pp2bppp/2n1pn2/3p4/3P4/2NBPN2/PP3PPP/R2Q1RK1 w - - 0 11', san: 'Qd2', bestMove: 'a2a3', classification: 'inaccuracy', cpLoss: 70, phase: 'middlegame', motifs: [], moveNumber: 11, color: 'white' },
  { gameId: 'g-2042', fen: '3r2k1/5ppp/p3p3/1p6/8/1P3P2/P4P1P/3R2K1 w - - 0 28', san: 'Rd7', bestMove: 'd1d8', classification: 'mistake', cpLoss: 180, phase: 'endgame', motifs: ['allowed_material_loss'], moveNumber: 28, color: 'white' },
  { gameId: 'g-2051', fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 4 4', san: 'Bc5', bestMove: 'f6e4', classification: 'inaccuracy', cpLoss: 60, phase: 'opening', motifs: [], moveNumber: 4, color: 'black' },
  { gameId: 'g-2051', fen: 'r4rk1/ppp2ppp/2n5/2bqp3/8/2NP1N2/PPP2PPP/R2Q1RK1 w - - 0 12', san: 'Ng5', bestMove: 'c3d5', classification: 'blunder', cpLoss: 320, phase: 'middlegame', motifs: ['hung_piece'], moveNumber: 12, color: 'white' },
  { gameId: 'g-2063', fen: '6k1/5ppp/8/8/8/5PP1/r4K1P/3R4 w - - 0 35', san: 'Rd8+', bestMove: 'd1d7', classification: 'mistake', cpLoss: 160, phase: 'endgame', motifs: ['allowed_material_loss'], moveNumber: 35, color: 'white' },
  { gameId: 'g-2063', fen: 'r1bq1rk1/ppp2ppp/2np1n2/2b1p3/2B1P3/2NP1N2/PPP2PPP/R1BQ1RK1 b - - 0 7', san: 'h6', bestMove: 'a7a6', classification: 'inaccuracy', cpLoss: 50, phase: 'opening', motifs: [], moveNumber: 7, color: 'black' },
  { gameId: 'g-2071', fen: '2r3k1/5ppp/p7/1p6/3q4/1P3Q2/P4PPP/3R2K1 w - - 0 26', san: 'Qxd4', bestMove: 'f3b7', classification: 'blunder', cpLoss: 410, phase: 'middlegame', motifs: ['major_tactical_blunder'], moveNumber: 26, color: 'white' },
  { gameId: 'g-2071', fen: 'rnbqkbnr/ppp2ppp/8/3pp3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 3', san: 'exd5', bestMove: 'f3e5', classification: 'inaccuracy', cpLoss: 45, phase: 'opening', motifs: [], moveNumber: 3, color: 'white' },
  { gameId: 'g-2088', fen: '5rk1/pp3ppp/2p5/8/1b6/2N2P2/PP4PP/4R1K1 w - - 0 22', san: 'Ne4', bestMove: 'e1e8', classification: 'mistake', cpLoss: 150, phase: 'middlegame', motifs: ['missed_material_gain'], moveNumber: 22, color: 'white' },
  { gameId: 'g-2088', fen: '6k1/6pp/8/8/8/8/5PPP/4R1K1 w - - 0 40', san: 'Kf1', bestMove: 'e1e8', classification: 'inaccuracy', cpLoss: 40, phase: 'endgame', motifs: [], moveNumber: 40, color: 'white' },
  { gameId: 'g-2095', fen: 'r4rk1/1bp1qppp/p2p1n2/1p2p3/4P3/1BPP1N2/PP3PPP/R2Q1RK1 w - - 0 14', san: 'd4', bestMove: 'd1e2', classification: 'mistake', cpLoss: 140, phase: 'middlegame', motifs: ['allowed_material_loss'], moveNumber: 14, color: 'white' },
  { gameId: 'g-2095', fen: '4r1k1/5ppp/8/8/8/5PnP/6P1/4R1K1 w - - 0 33', san: 'Kf2', bestMove: 'e1e8', classification: 'blunder', cpLoss: 350, phase: 'endgame', motifs: ['allowed_material_loss'], moveNumber: 33, color: 'white' },
  { gameId: 'g-2101', fen: 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/2P2N2/PP1P1PPP/RNBQK2R w KQkq - 0 5', san: 'O-O', bestMove: 'd2d4', classification: 'inaccuracy', cpLoss: 55, phase: 'opening', motifs: [], moveNumber: 5, color: 'white' },
  { gameId: 'g-2101', fen: '3q1rk1/pb3ppp/1p2p3/2ppP3/3P4/P1PB1N2/2P2PPP/R2Q1RK1 b - - 0 15', san: 'c4', bestMove: 'd8c7', classification: 'mistake', cpLoss: 170, phase: 'middlegame', motifs: ['allowed_material_loss'], moveNumber: 15, color: 'black' },
];

const FENS = sampleDetectedMistakes.map((m) => m.fen);
const SANS = ['Qd4', 'Rd8', 'Ng5', 'h6', 'Kf2', 'Bxh3', 'Nxe5', 'Rc1', 'a4', 'Qe2'];
const BEST = ['e1e8', 'd1d7', 'c3d5', 'f3b7', 'f1e2', 'g2g3', 'd4d5', 'a1d1', 'b2b4', 'f3e5'];
const PHASES: Phase[] = ['opening', 'middlegame', 'endgame'];
const MOTIFS: Motif[][] = [['hung_piece'], ['allowed_material_loss'], ['major_tactical_blunder'], ['missed_material_gain'], []];
const CLASS: MoveClassification[] = ['blunder', 'mistake', 'inaccuracy'];

/** Generate N sample mistakes for scalability testing (cycles realistic templates). */
export function makeSampleMistakes(n: number): MistakeInput[] {
  const out: MistakeInput[] = [];
  for (let i = 0; i < n; i++) {
    const cls = CLASS[i % CLASS.length];
    out.push({
      gameId: `g-${3000 + Math.floor(i / 2)}`,
      fen: FENS[i % FENS.length],
      san: SANS[i % SANS.length],
      bestMove: BEST[i % BEST.length],
      classification: cls,
      cpLoss: cls === 'blunder' ? 300 + (i % 5) * 30 : cls === 'mistake' ? 130 + (i % 5) * 15 : 40 + (i % 5) * 8,
      phase: PHASES[i % PHASES.length],
      motifs: MOTIFS[i % MOTIFS.length],
      moveNumber: 8 + (i % 32),
      color: i % 2 === 0 ? 'white' : 'black',
    });
  }
  return out;
}
