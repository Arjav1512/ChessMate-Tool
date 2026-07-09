import type { CoachContext } from '../context/types';
import { getCoachService } from './defaultCoachService';

// ─────────────────────────────────────────────────────────────────────────────
// Frontend entry point — same call shape the UI used before the provider
// abstraction existed, so CoachTab/GameViewer keep working unchanged. The
// frontend never knows (or names) the model behind it.
// ─────────────────────────────────────────────────────────────────────────────

export interface MentorGameInfo {
  white_player?: string;
  black_player?: string;
  result?: string;
  event?: string;
  date?: string;
}

export interface MentorEvaluation {
  evaluation: string;
  isMate: boolean;
  bestMove?: string;
}

export interface MentorContext {
  gameInfo?: MentorGameInfo;
  currentPosition?: string;
  moveHistory?: string[];
  evaluation?: MentorEvaluation;
  /** Compact summary of the player's known weaknesses (lib/weaknessProfile). */
  weaknessSummary?: string;
}

function toCoachContext(context: MentorContext): CoachContext {
  return {
    game: context.gameInfo
      ? {
          white: context.gameInfo.white_player,
          black: context.gameInfo.black_player,
          result: context.gameInfo.result,
          event: context.gameInfo.event,
          date: context.gameInfo.date,
        }
      : undefined,
    fen: context.currentPosition,
    moveHistory: context.moveHistory,
    move: context.evaluation ? { evaluation: context.evaluation } : undefined,
    player: context.weaknessSummary ? { weaknessSummary: context.weaknessSummary } : undefined,
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
