import type { CoachContext, CoachMoveContext } from '../context/types';
import type { MoveClassification } from '../../utils/moveClassifier';
import type { Phase } from '../../lib/moveAnalysis';
import { getCoachService } from './defaultCoachService';

// ─────────────────────────────────────────────────────────────────────────────
// Frontend entry point — same call shape the UI used before the provider
// abstraction existed, extended (Phase 3A / R1) so call sites can thread the
// analysis context they already hold: PGN, opening, ratings, and the current
// move's phase/motifs/classification. Retrieval needs this — without it every
// production query resolved to zero documents (RETRIEVAL_AUDIT.md §0).
// The frontend never knows (or names) the model behind it.
// ─────────────────────────────────────────────────────────────────────────────

export interface MentorGameInfo {
  white_player?: string;
  black_player?: string;
  result?: string;
  event?: string;
  date?: string;
  /** Full PGN — lets the context builder derive the opening when absent. */
  pgn?: string;
  /** Opening if the caller already knows it (GameVM carries eco/opening). */
  opening?: { eco?: string; name: string };
  whiteRating?: number | null;
  blackRating?: number | null;
  userColor?: 'white' | 'black' | null;
}

export interface MentorEvaluation {
  evaluation: string;
  isMate: boolean;
  bestMove?: string;
}

/** The move under discussion, in whatever fields the caller has on hand. */
export interface MentorMoveInfo {
  san?: string | null;
  moveNumber?: number;
  color?: 'white' | 'black';
  phase?: Phase;
  motifs?: string[];
  /** Either taxonomy: legacy classifier or Ivory MoveQuality ('brilliant'). */
  classification?: string | null;
  cpLoss?: number | null;
  bestMove?: string | null;
}

export interface MentorContext {
  gameInfo?: MentorGameInfo;
  currentPosition?: string;
  moveHistory?: string[];
  evaluation?: MentorEvaluation;
  move?: MentorMoveInfo;
  /** The user's own rating, when the caller can identify it. */
  playerRating?: number | null;
  /** Compact summary of the player's known weaknesses (lib/weaknessProfile). */
  weaknessSummary?: string;
}

// Both UI taxonomies normalize onto the classifier taxonomy the context
// renderer understands; unknown values are dropped rather than guessed.
const CLASSIFICATION_ALIASES: Record<string, MoveClassification> = {
  brilliant: 'best', // Ivory MoveQuality only — closest classifier value
  best: 'best',
  excellent: 'excellent',
  good: 'good',
  inaccuracy: 'inaccuracy',
  mistake: 'mistake',
  blunder: 'blunder',
};

function toMoveContext(context: MentorContext): CoachMoveContext | undefined {
  const { move, evaluation } = context;
  if (!move && !evaluation) return undefined;
  const classification = move?.classification
    ? CLASSIFICATION_ALIASES[move.classification.toLowerCase()]
    : undefined;
  return {
    san: move?.san ?? undefined,
    moveNumber: move?.moveNumber,
    color: move?.color,
    phase: move?.phase,
    motifs: move?.motifs,
    classification,
    cpLoss: move?.cpLoss ?? undefined,
    bestMove: move?.bestMove ?? undefined,
    evaluation,
  };
}

/** Exported for tests — pure mapping from the UI shape to CoachContext. */
export function toCoachContext(context: MentorContext): CoachContext {
  return {
    game: context.gameInfo
      ? {
          white: context.gameInfo.white_player,
          black: context.gameInfo.black_player,
          result: context.gameInfo.result,
          event: context.gameInfo.event,
          date: context.gameInfo.date,
          pgn: context.gameInfo.pgn,
          opening: context.gameInfo.opening,
          whiteRating: context.gameInfo.whiteRating,
          blackRating: context.gameInfo.blackRating,
          userColor: context.gameInfo.userColor,
        }
      : undefined,
    fen: context.currentPosition,
    moveHistory: context.moveHistory,
    move: toMoveContext(context),
    player:
      context.weaknessSummary || context.playerRating != null
        ? { weaknessSummary: context.weaknessSummary, rating: context.playerRating }
        : undefined,
  };
}

/**
 * Ask the coach a question about the current game/position. Throws
 * CoachUnavailableError with a user-safe message on any failure.
 */
export async function askChessMentor(question: string, context: MentorContext): Promise<string> {
  const answer = await getCoachService().ask({
    task: 'coach',
    question,
    context: toCoachContext(context),
  });
  return answer.text;
}
