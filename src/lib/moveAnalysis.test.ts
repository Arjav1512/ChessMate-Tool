import { describe, it, expect } from 'vitest';
import { buildMoveAnalysisRows, type PlyAnalysis } from './moveAnalysis';

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
});
