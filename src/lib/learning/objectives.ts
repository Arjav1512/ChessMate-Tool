/**
 * Curated learning-objectives catalog (Architecture §12). Maps a weakness to a
 * pedagogically-sound objective + the session types that train it. Curated +
 * versioned — NOT generated — because the differentiator must be trustworthy
 * (§24). Keyed by weakness key, with a per-category fallback.
 */
import type { ImproveCategory, SessionType } from '../improve/types';

export interface LearningObjective {
  objective: string;                 // the title shown on the Weekly Focus
  rationaleTemplate: string;         // {pct}/{n} filled from the user's data
  sessionTypes: SessionType[];       // ordered training plan for this objective
  positionSet: string;               // curated drill set id (sample for v1)
  estMinutes: Partial<Record<SessionType, number>>;
}

const CATALOG: Record<string, LearningObjective> = {
  rook_conversion: {
    objective: 'Convert winning rook endgames',
    rationaleTemplate: 'Endgame conversion is your biggest rating leak — it shows up in {pct}% of your analyzed games. Highest-impact fix this week.',
    sessionTypes: ['drill', 'replay', 'tactics', 'coach_review'],
    positionSet: 'rook_endgames',
    estMinutes: { drill: 12, replay: 8, tactics: 10, coach_review: 5 },
  },
  hanging_pieces: {
    objective: 'Stop hanging pieces',
    rationaleTemplate: 'One-move blunders show up in {pct}% of your games. A short tactics habit fixes most of these.',
    sessionTypes: ['tactics', 'replay', 'coach_review'],
    positionSet: 'hanging_pieces',
    estMinutes: { tactics: 10, replay: 6, coach_review: 5 },
  },
  back_rank: {
    objective: 'Guard the back rank',
    rationaleTemplate: 'Back-rank motifs appeared in {pct}% of your games. Pattern drills make these automatic.',
    sessionTypes: ['tactics', 'drill'],
    positionSet: 'back_rank',
    estMinutes: { tactics: 8, drill: 8 },
  },
  opening_prep: {
    objective: 'Tighten your opening prep',
    rationaleTemplate: 'You leave book early as Black and concede the center in {pct}% of games.',
    sessionTypes: ['replay', 'drill'],
    positionSet: 'opening_lines',
    estMinutes: { replay: 8, drill: 10 },
  },
};

const FALLBACK: Record<ImproveCategory, LearningObjective> = {
  tactical: { objective: 'Sharpen your tactics', rationaleTemplate: 'Tactical lapses recur in {pct}% of games.', sessionTypes: ['tactics', 'replay'], positionSet: 'tactics_mixed', estMinutes: { tactics: 10, replay: 6 } },
  opening: { objective: 'Improve your openings', rationaleTemplate: 'Opening inaccuracies show up in {pct}% of games.', sessionTypes: ['replay', 'drill'], positionSet: 'opening_lines', estMinutes: { replay: 8, drill: 10 } },
  endgame: { objective: 'Master key endgames', rationaleTemplate: 'Endgame accuracy is your lowest phase.', sessionTypes: ['drill', 'replay', 'coach_review'], positionSet: 'endgames_mixed', estMinutes: { drill: 12, replay: 8, coach_review: 5 } },
  positional: { objective: 'Build positional understanding', rationaleTemplate: 'Positional drift recurs in {pct}% of games.', sessionTypes: ['drill', 'coach_review'], positionSet: 'positional_mixed', estMinutes: { drill: 10, coach_review: 5 } },
};

export function objectiveFor(key: string, category: ImproveCategory): LearningObjective {
  return CATALOG[key] ?? FALLBACK[category];
}

const TYPE_VERB: Record<SessionType, string> = {
  drill: 'Drill', replay: 'Replay', tactics: 'Tactics', coach_review: 'Coach review',
};

/** Human title for a session given its type + the weakness it trains. */
export function sessionTitle(type: SessionType, weaknessName: string): string {
  if (type === 'replay') return `Replay your ${weaknessName.toLowerCase()} games`;
  if (type === 'coach_review') return `Coach review: ${weaknessName.toLowerCase()}`;
  return `${TYPE_VERB[type]}: ${weaknessName.toLowerCase()}`;
}

export { TYPE_VERB };
