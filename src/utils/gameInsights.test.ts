import { describe, it, expect } from 'vitest';
import { deriveInsights } from './gameInsights';
import type { MoveClassification } from './moveClassifier';

const cm = (entries: [number, MoveClassification][]) => new Map(entries);

describe('deriveInsights', () => {
  it('returns nothing without analysis data', () => {
    expect(deriveInsights([], new Map(), [], 'white')).toEqual([]);
    expect(deriveInsights(['e4'], new Map(), [0.2], 'white')).toEqual([]);
  });

  it('flags the user\'s biggest mistake by eval loss (White)', () => {
    // moves: 0 e4 (W), 1 e5 (B), 2 Qh5 (W blunder), 3 Nc6 (B)
    const moves = ['e4', 'e5', 'Qh5', 'Nc6'];
    const evals = [0.2, 0.2, 0.3, -2.5, -2.4]; // pos 0..4; White's move 2 (pos2->3) drops 2.8
    const classMap = cm([[2, 'blunder']]);
    const out = deriveInsights(moves, classMap, evals, 'white');
    const mistake = out.find(i => i.kind === 'biggest-mistake');
    expect(mistake).toBeTruthy();
    expect(mistake!.move).toBe('Qh5');
    expect(mistake!.moveIndex).toBe(2);
  });

  it('only considers the user\'s own moves for mistakes', () => {
    // The blunder is Black's move (index 1); user is White → should NOT be the user's mistake
    const moves = ['e4', 'Qd8', 'Nf3'];
    const evals = [0.2, 0.3, 2.5, 2.4]; // Black move 1 (pos1->2) rises 2.2 (bad for Black)
    const classMap = cm([[1, 'blunder']]);
    const out = deriveInsights(moves, classMap, evals, 'white');
    expect(out.find(i => i.kind === 'biggest-mistake')).toBeFalsy();
  });

  it('identifies the turning point as the largest absolute swing', () => {
    const moves = ['e4', 'e5', 'Bc4', 'Nf6', 'Ng5'];
    const evals = [0.2, 0.2, 0.3, 0.3, 0.4, 3.5]; // biggest swing at move 4 (pos4->5 = +3.1)
    const classMap = cm([[0, 'good'], [4, 'best']]);
    const out = deriveInsights(moves, classMap, evals, 'white');
    const turn = out.find(i => i.kind === 'turning-point');
    expect(turn).toBeTruthy();
    expect(turn!.moveIndex).toBe(4);
  });

  it('surfaces the user\'s best move', () => {
    const moves = ['e4', 'e5', 'Nf3'];
    const evals = [0.2, 0.2, 0.2, 0.3];
    const classMap = cm([[2, 'best']]); // White's move 2
    const out = deriveInsights(moves, classMap, evals, 'white');
    const best = out.find(i => i.kind === 'best-move');
    expect(best).toBeTruthy();
    expect(best!.move).toBe('Nf3');
  });

  it('clamps forced-mate evals so they do not dwarf every swing', () => {
    const moves = ['e4', 'e5', 'Qh5', 'Ke7'];
    const evals = [0.2, 0.2, 0.3, 0.3, 999]; // mate appears at the end
    const classMap = cm([[3, 'blunder']]);
    const out = deriveInsights(moves, classMap, evals, 'black');
    // Black's move 3 (pos3->4) swings up by clamp(999)-0.3 ≈ 9.7, not 998.7
    const mistake = out.find(i => i.kind === 'biggest-mistake');
    expect(mistake).toBeTruthy();
    expect(mistake!.move).toBe('Ke7');
  });
});
