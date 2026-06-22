/** Dashboard view-model types (System Design §7). Shaped to the future API so
 *  swapping the sample adapter for live data is mechanical (Architecture §22). */

export interface ImprovementScoreVM {
  score: number;          // 0–100
  deltaPts: number;       // Δ vs 30 days ago
  verdict: string;        // one-line interpretation ("Improving steadily")
  drivers: { up: string; down: string };  // what's lifting / dragging the score
  nextStep: string;       // the single most actionable thing to do
  lastGameAccuracy: number;
  streakDays: number;
}

export type RatingRange = '30d' | '90d' | '1y';

export interface RatingHistoryVM {
  current: number;
  deltaForRange: number;
  peak: number;
  series: { label: string; value: number }[];
}

export type WeaknessTrend = 'improving' | 'steady' | 'worsening';

export interface WeaknessCompactVM {
  key: string;
  icon: string;           // chess/semantic glyph
  name: string;
  frequencyPct: number;   // 0–100
  trend: WeaknessTrend;
  impact: 'high' | 'medium' | 'low';
  why: string;            // why this weakness matters (rating/result cost)
  action: string;         // recommended next action label
}

export interface WeeklyFocusVM {
  week: number;
  title: string;
  rationale: string;
  sessionsDone: number;
  sessionsTotal: number;
  phaseDeltaPct: number;
  estMinutes: number;
}

export interface GameRowVM {
  id: string;
  result: 'win' | 'loss' | 'draw';
  color: 'w' | 'b';
  opponent: string;
  eco: string;
  opening: string;
  accuracy: number;
  improvementTag?: string;
  relativeTime: string;
}

export interface CoachSummaryVM {
  text: string;
  context: string;        // e.g. "from your last 10 games"
}

export interface MilestoneNodeVM {
  label: string;
  status: 'achieved' | 'in_progress' | 'future';
  detail?: string;        // value vs target, or %
  progressPct?: number;   // for in_progress
}
