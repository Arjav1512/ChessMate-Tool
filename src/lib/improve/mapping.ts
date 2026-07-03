/**
 * Weakness mapping for the Improve Hub (Phase 6, approved decisions #1/#2).
 *
 * Maps the legacy `weaknessProfile` taxonomy → §9 categories, bands the 0–100
 * severity score → High/Medium/Low (internal score retained), and derives a
 * rating-impact proxy for ranking. Pure + unit-testable.
 */
import type { ImproveCategory, RawWeakness, Severity, Trend } from './types';

/** Decision #1: motif+recurring→Tactical · opening+color→Opening ·
 *  phase:endgame→Endgame · phase:middlegame+positional→Positional. */
export function mapCategory(w: Pick<RawWeakness, 'legacyCategory' | 'phase'>): ImproveCategory {
  switch (w.legacyCategory) {
    case 'motif':
    case 'recurring':
      return 'tactical';
    case 'opening':
    case 'color':
      return 'opening';
    case 'positional':
      return 'positional';
    case 'phase':
      if (w.phase === 'endgame') return 'endgame';
      if (w.phase === 'opening') return 'opening';
      return 'positional'; // middlegame (and any other) → positional
    default:
      return 'positional';
  }
}

/** Decision #2: High ≥ 66 · Medium 33–65 · Low < 33 (internal score 0–100). */
export function severityBand(score: number): Severity {
  if (score >= 66) return 'high';
  if (score >= 33) return 'medium';
  return 'low';
}

const SEVERITY_RANK: Record<Severity, number> = { high: 2, medium: 1, low: 0 };

/** Worst (highest) severity across a set — drives the category badge + error tint. */
export function worstSeverity(severities: Severity[]): Severity {
  return severities.reduce<Severity>((acc, s) => (SEVERITY_RANK[s] > SEVERITY_RANK[acc] ? s : acc), 'low');
}

const TREND_WEIGHT: Record<Trend, number> = { worsening: 1.15, steady: 1, improving: 0.85 };

/**
 * Rating-impact proxy (until real rating-impact data lands, Phase 11):
 * severity × frequency, nudged by trend (worsening hurts more). 0–100-ish.
 */
export function impactScore(w: Pick<RawWeakness, 'score' | 'frequencyPct' | 'trend'>): number {
  return Math.round((w.score * (0.5 + w.frequencyPct / 200)) * TREND_WEIGHT[w.trend]);
}

export const CATEGORY_META: Record<ImproveCategory, { label: string; icon: string }> = {
  tactical: { label: 'Tactical', icon: '♞' },
  opening: { label: 'Opening', icon: '♟' },
  endgame: { label: 'Endgame', icon: '♜' },
  positional: { label: 'Positional', icon: '◆' },
};
