import { describe, it, expect } from 'vitest';
import { buildWeaknessProfile, extractOpeningMoves, type WeaknessGame, type UserMove } from './weaknessProfile';
import type { Phase } from './moveAnalysis';
import type { MoveClassification } from '../utils/moveClassifier';

let seq = 0;
function mk(opts: Partial<WeaknessGame> & {
  opening?: string; // SAN prefix, e.g. 'b3' or 'g4 d5'
  result: string;
  color: 'white' | 'black' | null;
  blunders?: number;
  moves?: number;
  accuracy?: number;
}): WeaknessGame {
  seq += 1;
  const pgn = `[White "W"]\n[Black "B"]\n\n1. ${opts.opening ?? 'b3'} *`;
  return {
    id: `g${seq}`,
    result: opts.result,
    user_color: opts.color,
    pgn,
    uploaded_at: new Date(2026, 0, 1, 0, 0, seq).toISOString(),
    analysis:
      opts.blunders !== undefined || opts.moves !== undefined || opts.accuracy !== undefined
        ? {
            accuracy: opts.accuracy ?? 70,
            mistakes: 1,
            inaccuracies: 2,
            blunders: opts.blunders ?? 0,
            total_moves: opts.moves ?? 30,
          }
        : null,
  };
}

// User result helpers: as White, '1-0' = win, '0-1' = loss.
const whiteWin = (opening: string) => mk({ opening, result: '1-0', color: 'white' });
const whiteLoss = (opening: string) => mk({ opening, result: '0-1', color: 'white' });

describe('extractOpeningMoves', () => {
  it('strips headers, move numbers, comments and result; returns SAN tokens', () => {
    const pgn = `[Event "x"]\n[White "a"]\n\n1. e4 {good} e5 2. Nf3 (2. Bc4) Nc6 3. Bb5 a6 1-0`;
    expect(extractOpeningMoves(pgn, 6)).toEqual(['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6']);
  });
  it('returns empty for blank pgn', () => {
    expect(extractOpeningMoves('')).toEqual([]);
  });
});

describe('buildWeaknessProfile — opening weakness', () => {
  it('flags an opening where the user scores well below baseline', () => {
    const games = [
      ...Array.from({ length: 6 }, () => whiteWin('g4')),   // Grob — strong
      ...Array.from({ length: 5 }, () => whiteLoss('b3')),  // Nimzo-Larsen — weak
    ];
    const p = buildWeaknessProfile(games);
    const op = p.weaknesses.find((w) => w.category === 'opening');
    expect(op).toBeTruthy();
    expect(op!.title).toMatch(/Nimzo-Larsen/i);
    expect(op!.severity).toBeGreaterThan(40);
    expect(op!.confidence).toBe('medium'); // 5 games
    expect(op!.sampleSize).toBe(5);
    expect(op!.evidence.length).toBeGreaterThan(0);
  });

  it('does not flag an opening below the minimum sample size', () => {
    const games = [
      ...Array.from({ length: 6 }, () => whiteWin('g4')),
      whiteLoss('b3'), whiteLoss('b3'), // only 2 — below MIN_GROUP
    ];
    const p = buildWeaknessProfile(games);
    expect(p.weaknesses.find((w) => w.category === 'opening')).toBeUndefined();
  });
});

describe('buildWeaknessProfile — color weakness', () => {
  it('flags the weaker color', () => {
    const games = [
      // all same opening so no opening group dominates; vary only color/result
      mk({ opening: 'b3', result: '1-0', color: 'white' }),
      mk({ opening: 'b3', result: '1-0', color: 'white' }),
      mk({ opening: 'b3', result: '1-0', color: 'white' }),
      mk({ opening: 'b3', result: '0-1', color: 'white' }),
      // as black (result '1-0' = opponent White won = user loss)
      mk({ opening: 'b3', result: '1-0', color: 'black' }),
      mk({ opening: 'b3', result: '1-0', color: 'black' }),
      mk({ opening: 'b3', result: '1-0', color: 'black' }),
      mk({ opening: 'b3', result: '0-1', color: 'black' }),
    ];
    const p = buildWeaknessProfile(games);
    const color = p.weaknesses.find((w) => w.category === 'color');
    expect(color).toBeTruthy();
    expect(color!.title).toMatch(/Black/);
  });
});

describe('buildWeaknessProfile — recurring blunders', () => {
  it('flags a high blunder rate', () => {
    const games = [
      mk({ result: '1-0', color: 'white', blunders: 2 }),
      mk({ result: '0-1', color: 'white', blunders: 1 }),
      mk({ result: '1-0', color: 'white', blunders: 1 }),
      mk({ result: '0-1', color: 'white', blunders: 0 }),
      mk({ result: '1-0', color: 'white', blunders: 3 }),
    ];
    const p = buildWeaknessProfile(games);
    const rec = p.weaknesses.find((w) => w.category === 'recurring');
    expect(rec).toBeTruthy();
    expect(rec!.title).toMatch(/blunder/i);
    expect(rec!.detail).toMatch(/%/);
  });

  it('does not flag when blunders are rare', () => {
    const games = Array.from({ length: 6 }, () => mk({ result: '1-0', color: 'white', blunders: 0 }));
    const p = buildWeaknessProfile(games);
    expect(p.weaknesses.find((w) => w.category === 'recurring')).toBeUndefined();
  });
});

describe('buildWeaknessProfile — true phase strength (B-2, from move data)', () => {
  const rep = (phase: Phase, classification: MoveClassification, n: number) =>
    Array.from({ length: n }, () => ({ phase, classification }));

  it('computes per-phase strength and flags the weakest phase', () => {
    const moves = [
      ...rep('opening', 'good', 60),     // strength 100
      ...rep('middlegame', 'good', 60),  // strength 100
      ...rep('endgame', 'blunder', 30),  // strength 50
      ...rep('endgame', 'good', 30),
    ];
    const p = buildWeaknessProfile([], moves);
    expect(p.phaseStrengths.opening?.strength).toBe(100);
    expect(p.phaseStrengths.endgame?.strength).toBe(50);
    expect(p.phaseStrengths.endgame?.confidence).toBe('medium'); // 60 endgame moves (50–99)
    const phase = p.weaknesses.find((w) => w.category === 'phase');
    expect(phase).toBeTruthy();
    expect(phase!.title).toMatch(/endgame/i);
    expect(phase!.evidence.join(' ')).not.toMatch(/proxy/i); // real data, not a proxy
  });

  it('ignores a phase below the minimum move sample', () => {
    const moves = [
      ...rep('opening', 'good', 60),
      ...rep('endgame', 'blunder', 5), // < MIN_PHASE_MOVES
    ];
    const p = buildWeaknessProfile([], moves);
    expect(p.phaseStrengths.endgame).toBeUndefined();
    expect(p.weaknesses.find((w) => w.category === 'phase')).toBeUndefined();
  });

  it('emits no phase data when no moves are provided', () => {
    const p = buildWeaknessProfile([mk({ opening: 'g4', result: '1-0', color: 'white' })]);
    expect(p.phaseStrengths).toEqual({});
    expect(p.phaseMoveCount).toBe(0);
    expect(p.weaknesses.find((w) => w.category === 'phase')).toBeUndefined();
  });
});

describe('buildWeaknessProfile — recurring tactical motifs (B-3)', () => {
  const mv = (gameId: string, motifs: ('hung_piece' | 'allowed_mate')[] = []) =>
    ({ gameId, phase: 'middlegame', classification: 'blunder', motifs } as const);

  it('flags a motif recurring across enough games', () => {
    const moves = [
      mv('g1', ['hung_piece']),
      mv('g2', ['hung_piece']),
      mv('g3', ['hung_piece']),
      mv('g4', ['hung_piece']),
      mv('g5'), // clean game keeps the denominator honest
    ];
    const p = buildWeaknessProfile([], moves);
    const motif = p.weaknesses.find((w) => w.category === 'motif');
    expect(motif).toBeTruthy();
    expect(motif!.title).toMatch(/hangs pieces/i);
    expect(motif!.sampleSize).toBe(4); // 4 of 5 games
    expect(motif!.evidence[0]).toMatch(/across 4 games/);
  });

  it('does not flag a motif seen in too few games', () => {
    const moves = [mv('g1', ['allowed_mate']), mv('g2', ['allowed_mate']), mv('g3'), mv('g4'), mv('g5')];
    const p = buildWeaknessProfile([], moves);
    expect(p.weaknesses.find((w) => w.id === 'motif:allowed_mate')).toBeUndefined();
  });

  it('does not flag major_tactical_blunder as a motif (covered by recurring blunders)', () => {
    const moves: UserMove[] = Array.from({ length: 6 }, (_, i) =>
      ({ gameId: `g${i}`, phase: 'middlegame', classification: 'blunder', motifs: ['major_tactical_blunder'] }));
    const p = buildWeaknessProfile([], moves);
    expect(p.weaknesses.find((w) => w.id === 'motif:major_tactical_blunder')).toBeUndefined();
  });
});

describe('buildWeaknessProfile — guards & summary', () => {
  it('returns no weaknesses below the data floor', () => {
    const p = buildWeaknessProfile([whiteWin('g4'), whiteLoss('b3')]);
    expect(p.weaknesses).toEqual([]);
    expect(p.summaryLine).toBe('');
  });

  it('ignores games with unknown user_color or undecided result for outcomes', () => {
    const games = [
      mk({ opening: 'g4', result: '*', color: 'white' }),
      mk({ opening: 'g4', result: '1-0', color: null }),
    ];
    const p = buildWeaknessProfile(games);
    expect(p.decidedGames).toBe(0);
  });

  it('produces a compact coach summary line when weaknesses exist', () => {
    const games = [
      ...Array.from({ length: 6 }, () => whiteWin('g4')),
      ...Array.from({ length: 5 }, () => whiteLoss('b3')),
    ];
    const p = buildWeaknessProfile(games);
    expect(p.summaryLine).toMatch(/Known weaknesses:/);
  });
});
