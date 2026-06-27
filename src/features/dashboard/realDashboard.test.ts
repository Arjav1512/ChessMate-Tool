import { describe, it, expect } from 'vitest';
import { profileToDashboard, profileToCompactWeaknesses } from './realDashboard';
import type { Weakness, WeaknessProfile } from '../../lib/weaknessProfile';

function weakness(p: Partial<Weakness>): Weakness {
  return {
    id: 'recurring:blunders', category: 'recurring', title: 'Recurring blunders',
    detail: 'You blunder in 58% of your analyzed games.', severity: 72, confidence: 'high',
    evidence: ['e'], trend: 'worsening', sampleSize: 8, frequencyPct: 58, phaseAccuracy: 61, ...p,
  };
}

function profile(p: Partial<WeaknessProfile>): WeaknessProfile {
  return {
    weaknesses: [], gamesConsidered: 0, decidedGames: 0, analyzedGames: 0,
    phaseStrengths: {}, phaseMoveCount: 0, summaryLine: '', overallAccuracy: 0, ...p,
  };
}

describe('profileToDashboard (B4 real-data mapping)', () => {
  it('returns hasData=false (→ onboarding) when there are no weaknesses', () => {
    const d = profileToDashboard(profile({ analyzedGames: 1 }), []);
    expect(d.hasData).toBe(false);
    expect(d.focus).toBeNull();
    expect(d.weaknesses).toEqual([]);
  });

  it('builds a real focus + top weaknesses, with NO fabricated delta', () => {
    const d = profileToDashboard(profile({ analyzedGames: 12, weaknesses: [weakness({})] }), []);
    expect(d.hasData).toBe(true);
    expect(d.focus).not.toBeNull();
    expect(d.focus!.title.length).toBeGreaterThan(0);
    expect(d.focus!.rationale).toContain('58'); // real frequency, not a sample %
    expect(d.focus!.phaseDeltaPct).toBe(0);     // never invents a streak/delta
    expect(d.weaknesses.length).toBe(1);
  });

  it('maps compact weaknesses with the real detail as the "why" and a severity band', () => {
    const rows = profileToCompactWeaknesses(profile({
      weaknesses: [weakness({ severity: 72, frequencyPct: 58, detail: 'real why', trend: 'worsening' })],
    }));
    expect(rows[0]).toMatchObject({ name: 'Recurring blunders', frequencyPct: 58, why: 'real why', impact: 'high', trend: 'worsening' });
    expect(rows[0].action.length).toBeGreaterThan(0);
  });
});
