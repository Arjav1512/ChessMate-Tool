import { describe, it, expect } from 'vitest';
import { buildMoveAnalysisRows, derivePhase, type PlyAnalysis } from './moveAnalysis';

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
// Full material, but past move 10 → middlegame.
const MID_FEN = 'r1bq1rk1/pp2bppp/2n2n2/2pp4/3P4/2N1PN2/PPQ1BPPP/R1B2RK1 w - - 0 12';
// King + rook vs king → endgame.
const END_FEN = '8/5k2/8/8/3K4/8/4R3/8 w - - 0 40';

const G = 'game-1';
const U = 'user-1';

function ply(p: Partial<PlyAnalysis> & { ply: number; evalCpBefore: number; evalCpAfter: number }): PlyAnalysis {
  return {
    fenBefore: p.fenBefore ?? 'fen',
    san: p.san ?? 'e4',
    bestMove: p.bestMove ?? 'e2e4',
    ...p,
  };
}

describe('buildMoveAnalysisRows', () => {
  it('derives color, move_number and ply correctly', () => {
    const rows = buildMoveAnalysisRows(G, U, [
      ply({ ply: 0, evalCpBefore: 20, evalCpAfter: 25 }), // White, move 1
      ply({ ply: 1, evalCpBefore: 25, evalCpAfter: 20 }), // Black, move 1
      ply({ ply: 2, evalCpBefore: 20, evalCpAfter: 30 }), // White, move 2
      ply({ ply: 3, evalCpBefore: 30, evalCpAfter: 25 }), // Black, move 2
    ]);
    expect(rows.map((r) => [r.ply, r.color, r.move_number])).toEqual([
      [0, 'white', 1],
      [1, 'black', 1],
      [2, 'white', 2],
      [3, 'black', 2],
    ]);
  });

  it('computes cp_loss from the moving side’s perspective', () => {
    // White drops eval 50 -> -200: cp_loss 250 (blunder).
    const [white] = buildMoveAnalysisRows(G, U, [ply({ ply: 0, evalCpBefore: 50, evalCpAfter: -200 })]);
    expect(white.cp_loss).toBe(250);
    expect(white.classification).toBe('blunder');

    // Black: White's eval goes 100 -> 300 means Black worsened by 200 (mistake).
    const [black] = buildMoveAnalysisRows(G, U, [ply({ ply: 1, evalCpBefore: 100, evalCpAfter: 300 })]);
    expect(black.cp_loss).toBe(200);
    expect(black.classification).toBe('mistake');
  });

  it('clamps cp_loss at 0 for improving moves', () => {
    const [r] = buildMoveAnalysisRows(G, U, [ply({ ply: 0, evalCpBefore: 0, evalCpAfter: 120 })]);
    expect(r.cp_loss).toBe(0);
    expect(r.classification).toBe('best');
  });

  it('passes through fen, san, best_move and rounds eval_cp', () => {
    const [r] = buildMoveAnalysisRows(G, U, [
      ply({ ply: 0, evalCpBefore: 10, evalCpAfter: 12.6, fenBefore: 'startpos', san: 'Nf3', bestMove: 'g1f3' }),
    ]);
    expect(r).toMatchObject({ game_id: G, user_id: U, fen: 'startpos', san: 'Nf3', best_move: 'g1f3', eval_cp: 13 });
  });

  it('skips plies with non-finite evals', () => {
    const rows = buildMoveAnalysisRows(G, U, [
      ply({ ply: 0, evalCpBefore: NaN, evalCpAfter: 10 }),
      ply({ ply: 1, evalCpBefore: 10, evalCpAfter: Infinity }),
      ply({ ply: 2, evalCpBefore: 10, evalCpAfter: 20 }),
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0].ply).toBe(2);
  });

  it('tags each row with the derived phase', () => {
    const [opening] = buildMoveAnalysisRows(G, U, [ply({ ply: 0, evalCpBefore: 0, evalCpAfter: 5, fenBefore: START_FEN })]);
    expect(opening.phase).toBe('opening');
    const [endgame] = buildMoveAnalysisRows(G, U, [ply({ ply: 78, evalCpBefore: 0, evalCpAfter: 5, fenBefore: END_FEN })]);
    expect(endgame.phase).toBe('endgame');
  });
});

describe('derivePhase', () => {
  it('classifies the opening (early, full material)', () => {
    expect(derivePhase(START_FEN, 1)).toBe('opening');
  });
  it('classifies the middlegame (full material, past move 10)', () => {
    expect(derivePhase(MID_FEN, 12)).toBe('middlegame');
  });
  it('classifies the endgame (few pieces / queens off)', () => {
    expect(derivePhase(END_FEN, 40)).toBe('endgame');
    // queens off + only rooks/minors left → endgame even mid-board
    expect(derivePhase('4r1k1/5ppp/8/8/8/8/5PPP/4R1K1 w - - 0 25', 25)).toBe('endgame');
  });
  it('treats an early position that has already shed heavy material as endgame', () => {
    expect(derivePhase('4k3/8/8/8/8/8/4N3/4K3 w - - 0 8', 8)).toBe('endgame');
  });
});
