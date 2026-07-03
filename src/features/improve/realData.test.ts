import { describe, it, expect } from 'vitest';
import { profileToImproveData, profileToSkills, weekOfYear } from './realData';
import type { Weakness, WeaknessProfile } from '../../lib/weaknessProfile';

function weakness(p: Partial<Weakness>): Weakness {
  return {
    id: 'recurring:blunders', category: 'recurring', title: 'Recurring blunders',
    detail: 'You blunder a lot.', severity: 70, confidence: 'high', evidence: ['e'],
    trend: 'worsening', sampleSize: 8, frequencyPct: 55, phaseAccuracy: 62, ...p,
  };
}

function profile(p: Partial<WeaknessProfile>): WeaknessProfile {
  return {
    weaknesses: [], gamesConsidered: 0, decidedGames: 0, analyzedGames: 0,
    phaseStrengths: {}, phaseMoveCount: 0, summaryLine: '', overallAccuracy: 0, ...p,
  };
}

describe('profileToImproveData (B3 real-data mapping)', () => {
  it('returns the onboarding shape (hasData=false) when there are no weaknesses', () => {
    const data = profileToImproveData(profile({ analyzedGames: 2 }), { week: 7, queue: [] });
    expect(data.hasData).toBe(false);
    expect(data.analyzedGames).toBe(2);
    expect(data.categories).toEqual([]);
    expect(data.plan).toEqual([]);
  });

  it('builds a real plan from the profile weaknesses (no fabricated numbers)', () => {
    const data = profileToImproveData(
      profile({
        analyzedGames: 12,
        weaknesses: [
          weakness({ id: 'recurring:blunders', category: 'recurring', title: 'Recurring blunders', severity: 72, frequencyPct: 58, phaseAccuracy: 61 }),
          weakness({ id: 'opening:Sicilian', category: 'opening', title: 'Struggles in the Sicilian', severity: 40, frequencyPct: 25, phaseAccuracy: 70, trend: 'stable' }),
        ],
      }),
      { week: 7, queue: [] },
    );
    expect(data.hasData).toBe(true);
    expect(data.analyzedGames).toBe(12);
    expect(data.focus.title.length).toBeGreaterThan(0);
    // The focus rationale interpolates the REAL frequency of the top weakness.
    expect(data.focus.rationale).toContain('58');
    // No fabricated week-over-week delta, no fake goals.
    expect(data.focus.phaseDeltaPct).toBe(0);
    expect(data.milestones).toEqual([]);
    expect(data.categories.length).toBeGreaterThan(0);
    expect(data.plan.length).toBeGreaterThan(0);
  });

  it('ingests the Send-to-Improve queue into the plan (real flagged items)', () => {
    const data = profileToImproveData(
      profile({ analyzedGames: 12, weaknesses: [weakness({})] }),
      { week: 7, queue: [{ gameId: 'g1', ply: 21, motif: 'hanging-piece', san: 'Qxh7' }] },
    );
    expect(data.plan.some((i) => i.source === 'send-to-improve')).toBe(true);
  });

  it('derives the skill radar from real per-phase strengths only', () => {
    const skills = profileToSkills(profile({
      phaseStrengths: {
        opening: { phase: 'opening', strength: 81, moves: 120, mistakes: 6, blunders: 1, confidence: 'high' },
        endgame: { phase: 'endgame', strength: 58, moves: 60, mistakes: 9, blunders: 3, confidence: 'medium' },
      },
    }));
    expect(skills).toEqual([
      { axis: 'Openings', you: 81, peers: 0 },
      { axis: 'Endgame', you: 58, peers: 0 },
    ]);
  });

  it('skills are empty when no phase data exists yet (no fabricated axes)', () => {
    expect(profileToSkills(profile({}))).toEqual([]);
  });

  it('weekOfYear returns a plausible 1–53 week number', () => {
    const w = weekOfYear(new Date('2026-06-27'));
    expect(w).toBeGreaterThanOrEqual(1);
    expect(w).toBeLessThanOrEqual(53);
  });
});
