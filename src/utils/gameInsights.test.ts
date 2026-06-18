import { describe, it, expect } from 'vitest';
import { deriveInsights, buildStudyPlan } from './gameInsights';
import type { MoveClassification } from './moveClassifier';

const cm = (entries: [number, MoveClassification][]) => new Map(entries);

describe('deriveInsights', () => {
  it('returns only the opening card when there is no analysis yet', () => {
    const out = deriveInsights(['e4'], new Map(), [0.2], 'white', { eco: 'C20', name: 'King\'s Pawn' });
    expect(out).toHaveLength(1);
    expect(out[0].kind).toBe('opening');
  });

  it('returns nothing without analysis or opening', () => {
    expect(deriveInsights([], new Map(), [], 'white')).toEqual([]);
  });

  it('orders sections opening → blunder → turning-point → best-move', () => {
    const moves = ['e4', 'e5', 'Qh5', 'Nc6', 'Bc4', 'g6', 'Qf3', 'Nf6'];
    const evals = [0.2, 0.2, 0.3, -2.6, -2.5, -2.5, -2.4, -2.4, -2.3];
    const classMap = cm([[0, 'best'], [2, 'blunder']]);
    const out = deriveInsights(moves, classMap, evals, 'white', { eco: 'C20', name: 'King\'s Pawn' });
    const kinds = out.map(i => i.kind);
    expect(kinds[0]).toBe('opening');
    expect(kinds).toContain('blunder');
    // opening must come before blunder
    expect(kinds.indexOf('opening')).toBeLessThan(kinds.indexOf('blunder'));
  });

  it('every insight carries why, learn, and a coach question', () => {
    const moves = ['e4', 'e5', 'Qh5', 'Nc6'];
    const evals = [0.2, 0.2, 0.3, -2.6, -2.5];
    const out = deriveInsights(moves, cm([[2, 'blunder']]), evals, 'white');
    for (const ins of out) {
      expect(ins.why.length).toBeGreaterThan(10);
      expect(ins.learn.length).toBeGreaterThan(10);
      expect(ins.coachQuestion.length).toBeGreaterThan(5);
    }
  });

  it('only counts the user\'s own moves as blunders', () => {
    const moves = ['e4', 'Qd8', 'Nf3'];
    const evals = [0.2, 0.3, 2.6, 2.5]; // Black's move 1 is the bad one
    const out = deriveInsights(moves, cm([[1, 'blunder']]), evals, 'white');
    expect(out.find(i => i.kind === 'blunder')).toBeFalsy();
  });

  it('detects a tactical-lapse habit when there are 2+ blunders', () => {
    const moves = ['e4', 'e5', 'Qh5', 'Nc6', 'Bc4', 'Nf6', 'Qf7', 'Kxf7'];
    const evals = [0.2, 0.2, 0.3, -2.0, -1.9, -1.9, -5.0, -4.9, -4.8];
    const classMap = cm([[2, 'blunder'], [6, 'blunder']]);
    const out = deriveInsights(moves, classMap, evals, 'white');
    expect(out.find(i => i.kind === 'pattern')).toBeTruthy();
  });

  it('clamps forced-mate evals so they do not dominate', () => {
    const moves = ['e4', 'e5', 'Qh5', 'Ke7'];
    const evals = [0.2, 0.2, 0.3, 0.3, 999];
    const out = deriveInsights(moves, cm([[3, 'blunder']]), evals, 'black');
    const b = out.find(i => i.kind === 'blunder');
    expect(b?.move).toBe('Ke7');
    // detail mentions a clamped (~9-10) swing, never ~998
    expect(b?.why.includes('998')).toBe(false);
  });
});

describe('buildStudyPlan', () => {
  it('returns null without analysis', () => {
    expect(buildStudyPlan([], new Map(), [], 'white')).toBeNull();
  });

  it('flags tactical alertness as a weakness and recommends tactics when blunders exist', () => {
    const moves = ['e4', 'e5', 'Qh5', 'Nc6'];
    const evals = [0.2, 0.2, 0.3, -2.6, -2.5];
    const plan = buildStudyPlan(moves, cm([[2, 'blunder']]), evals, 'white')!;
    expect(plan.weaknesses.length).toBeGreaterThanOrEqual(1);
    expect(plan.weaknesses[0].label).toMatch(/Tactical/i);
    expect(plan.training?.label).toMatch(/tactics/i);
  });

  it('surfaces a strength when the user finds strong moves', () => {
    const moves = ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6'];
    const evals = [0.2, 0.2, 0.2, 0.2, 0.3, 0.3, 0.3];
    const plan = buildStudyPlan(moves, cm([[0, 'best'], [2, 'best'], [4, 'excellent']]), evals, 'white')!;
    expect(plan.strength).toBeTruthy();
  });

  it('caps weaknesses at two', () => {
    const moves = ['e4', 'e5', 'Qh5', 'Nc6', 'Bc4', 'Nf6'];
    const evals = [0.2, 0.2, 0.3, -1.5, -1.4, -1.4, -3.0];
    const plan = buildStudyPlan(moves, cm([[2, 'blunder'], [4, 'mistake']]), evals, 'white')!;
    expect(plan.weaknesses.length).toBeLessThanOrEqual(2);
  });
});
