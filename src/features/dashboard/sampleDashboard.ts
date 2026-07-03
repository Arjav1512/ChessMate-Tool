/**
 * Typed sample/derived dashboard data (Phase 4, locked decision #3).
 *
 * The dashboard ships before the rating-history / plan / milestone data layer
 * exists (roadmap Phase 11). These values are shaped exactly like the future
 * API responses so the query hooks swap to live data by changing only the
 * adapter. The Improvement Score is computed by a real pure function
 * (Architecture §13) fed sample inputs.
 */
import type {
  CoachSummaryVM, GameRowVM, ImprovementScoreVM, MilestoneNodeVM,
  RatingHistoryVM, RatingRange, WeaknessCompactVM, WeeklyFocusVM,
} from './types';

/** Improvement Score (Architecture §13): weighted composite, clamped 0–100. */
export function computeImprovementScore(input: {
  accuracyTrendSlope: number;  // normalized -1..1
  topWeaknessFrequency: number; // 0..1
  conversionRate: number;       // 0..1 (winning positions converted)
  ratingSlope: number;          // normalized -1..1
}, weights = { w1: 0.3, w2: 0.25, w3: 0.25, w4: 0.2 }): number {
  const norm = (x: number) => (Math.max(-1, Math.min(1, x)) + 1) / 2; // -1..1 → 0..1
  const raw =
    weights.w1 * norm(input.accuracyTrendSlope) +
    weights.w2 * (1 - input.topWeaknessFrequency) +
    weights.w3 * input.conversionRate +
    weights.w4 * norm(input.ratingSlope);
  return Math.round(Math.max(0, Math.min(100, raw * 100)));
}

const SAMPLE_SCORE_INPUT = {
  accuracyTrendSlope: 0.42,
  topWeaknessFrequency: 0.41,
  conversionRate: 0.63,
  ratingSlope: 0.38,
};

export const sampleImprovementScore: ImprovementScoreVM = {
  score: computeImprovementScore(SAMPLE_SCORE_INPUT),
  deltaPts: 6,
  verdict: 'You’re improving steadily',
  drivers: {
    up: 'Tactics & opening accuracy rising',
    down: 'Endgame conversion still leaking points',
  },
  nextStep: 'Convert winning endgames',
  lastGameAccuracy: 84,
  streakDays: 5,
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
const RATING_SERIES: Record<RatingRange, { label: string; value: number }[]> = {
  '30d': [1424, 1431, 1428, 1440, 1447, 1452, 1461, 1487].map((v, i) => ({ label: `${i * 4 + 1}`, value: v })),
  '90d': [1402, 1418, 1411, 1429, 1437, 1452, 1487].map((v, i) => ({ label: MONTHS[i] ?? '', value: v })),
  '1y': [1290, 1325, 1348, 1372, 1361, 1399, 1421, 1410, 1438, 1455, 1472, 1487].map((v, i) => ({ label: MONTHS[i % 6], value: v })),
};

export function sampleRatingHistory(range: RatingRange): RatingHistoryVM {
  const series = RATING_SERIES[range];
  const current = series[series.length - 1].value;
  const deltaForRange = current - series[0].value;
  const peak = Math.max(...series.map((s) => s.value), 1502);
  return { current, deltaForRange, peak, series };
}

export const sampleWeaknesses: WeaknessCompactVM[] = [
  { key: 'endgame.rook_conversion', icon: '♜', name: 'Endgame conversion', frequencyPct: 41, trend: 'worsening', impact: 'high', why: 'Costs you ~18 rating/month — winning positions slipping to draws.', action: 'Drill rook endgames' },
  { key: 'tactics.hanging_pieces', icon: '♞', name: 'Hanging pieces', frequencyPct: 33, trend: 'improving', impact: 'medium', why: 'One-move blunders decided 3 of your last 10 losses.', action: 'Train tactics set' },
  { key: 'opening.prep', icon: '♟', name: 'Opening preparation', frequencyPct: 22, trend: 'worsening', impact: 'medium', why: 'You leave book early as Black and concede the center.', action: 'Review your lines' },
];

export const sampleWeeklyFocus: WeeklyFocusVM = {
  week: 7,
  title: 'Convert winning endgames',
  rationale: 'You reached a winning rook endgame in 4 of your last 10 games but converted only 1. This is your highest-impact fix.',
  sessionsDone: 2,
  sessionsTotal: 5,
  phaseDeltaPct: 4,
  estMinutes: 12,
};

export const sampleRecentGames: GameRowVM[] = [
  { id: 'g1', result: 'loss', color: 'w', opponent: 'KnightRider', eco: 'C65', opening: 'Ruy López, Berlin', accuracy: 79, improvementTag: 'Endgame slip', relativeTime: '2h ago' },
  { id: 'g2', result: 'win', color: 'b', opponent: 'pawnstorm', eco: 'B22', opening: 'Sicilian, Alapin', accuracy: 88, relativeTime: '5h ago' },
  { id: 'g3', result: 'win', color: 'w', opponent: 'M_Tal_fan', eco: 'D02', opening: 'London System', accuracy: 91, improvementTag: 'Clean game', relativeTime: '1d ago' },
  { id: 'g4', result: 'draw', color: 'b', opponent: 'endgame_enjoyer', eco: 'C50', opening: 'Italian Game', accuracy: 84, relativeTime: '1d ago' },
  { id: 'g5', result: 'loss', color: 'w', opponent: 'tactician99', eco: 'B01', opening: 'Scandinavian', accuracy: 73, improvementTag: 'Hung a piece', relativeTime: '2d ago' },
];

export const sampleCoachSummary: CoachSummaryVM = {
  text: 'Across your last 10 games you lose most rating in the endgame — especially rook endings a pawn up. Drilling conversion technique this week should pay off fastest.',
  context: 'from your last 10 analyzed games',
};

export const sampleRoadmap: MilestoneNodeVM[] = [
  { label: 'Stop hanging pieces in the opening', status: 'achieved', detail: 'Done' },
  { label: 'Endgame conversion 80%', status: 'in_progress', detail: '63% → 80%', progressPct: 63 },
  { label: 'Reach 1550', status: 'future', detail: 'now 1487' },
];

/** Whether the user has any games (drives the empty/onboarding state). */
export const sampleHasGames = true;
