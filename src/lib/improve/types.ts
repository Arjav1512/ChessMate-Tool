/**
 * Improve Hub domain types (System Design §9, Architecture §12).
 * Pure data shapes shared by the mapping/composition libs and the feature UI.
 */

/** §9 weakness categories (filter + radar). Mapped from the legacy
 *  weaknessProfile categories per the approved decision (see mapping.ts). */
export type ImproveCategory = 'tactical' | 'opening' | 'endgame' | 'positional';

/** §9 severity badge (internal score stays 0–100). */
export type Severity = 'high' | 'medium' | 'low';

/** §12 training-session types. */
export type SessionType = 'drill' | 'replay' | 'tactics' | 'coach_review';

export type Trend = 'improving' | 'worsening' | 'steady';

/** A detected weakness as produced by analysis (legacy weaknessProfile-shaped). */
export interface RawWeakness {
  key: string;                 // stable key, e.g. 'rook_conversion'
  name: string;
  legacyCategory: 'motif' | 'recurring' | 'opening' | 'color' | 'phase' | 'positional';
  phase?: 'opening' | 'middlegame' | 'endgame';
  score: number;               // 0–100 internal severity
  frequencyPct: number;        // 0–100
  trend: Trend;
  phaseAccuracy: number;       // 0–100 accuracy in the relevant phase
}

/** A weakness after mapping to §9 category + severity band + impact. */
export interface WeaknessVM {
  key: string;
  name: string;
  category: ImproveCategory;
  severity: Severity;
  score: number;               // internal 0–100 (kept, decision #2)
  impact: number;              // ranking score (rating-impact proxy)
  frequencyPct: number;
  trend: Trend;
  phaseAccuracy: number;
  recommendation: string;      // the linked action label (from learning catalog)
  actionType: SessionType;
}

export interface WeaknessCategoryVM {
  category: ImproveCategory;
  label: string;
  icon: string;
  phaseAccuracy: number;       // representative accuracy for the category
  severity: Severity;          // worst sub-weakness severity
  weaknesses: WeaknessVM[];
}

export interface StudyItemVM {
  id: string;
  type: SessionType;
  title: string;
  description: string;
  estMinutes: number;
  status: 'next' | 'queued' | 'done';
  source: 'weakness' | 'send-to-improve';
  weaknessKey: string;
}

export interface WeeklyFocusVM {
  week: number;
  title: string;
  rationale: string;
  sessionsDone: number;
  sessionsTotal: number;
  phaseDeltaPct: number;
  nextSessionN: number;
  weaknessKey: string;
}

export interface SkillAxisVM {
  axis: string;                // Tactics/Openings/Middlegame/Endgame/Positional/Time
  you: number;                 // 0–100
  peers: number;               // 0–100 (dashed reference)
}

/** Chess-specific study goal (not a generic productivity milestone). */
export interface MilestoneVM {
  id: string;
  label: string;               // e.g. "Convert 10 rook endgames"
  current: number;
  target: number;
  unit?: string;
  status: 'achieved' | 'in_progress' | 'future';
  progressPct: number;
}

export interface ImproveData {
  analyzedGames: number;
  hasData: boolean;
  focus: WeeklyFocusVM;
  skills: SkillAxisVM[];
  categories: WeaknessCategoryVM[];
  plan: StudyItemVM[];
  milestones: MilestoneVM[];
}
