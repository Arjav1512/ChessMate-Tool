import type { CoachContext } from '../context/types';
import type { CoachTask } from '../prompts/templates';

export interface CoachRequest {
  /** What kind of coaching this is; defaults to 'coach' (Q&A). */
  task?: CoachTask;
  question: string;
  /** Pre-gathered chess context — assembled by ChessMate, never by the LLM. */
  context?: CoachContext;
  signal?: AbortSignal;
}

export interface CoachAnswer {
  text: string;
  task: CoachTask;
  /** Which configured provider answered (for telemetry — never shown in UI). */
  providerId: string;
}
