import type { Weakness } from '../../lib/weaknessProfile';
import type { CoachTask } from '../prompts/templates';

// ─────────────────────────────────────────────────────────────────────────────
// Memory interfaces (Coach Foundation, Deliverable 7).
//
// Interfaces + orchestration only — no database migration in Phase 1. The
// session implementation (sessionMemory.ts) keeps conversation turns in
// memory; persistent implementations (Supabase-backed UserMemory/GameMemory/
// WeaknessMemory/RecentLessons) plug in later without changing the service.
// ─────────────────────────────────────────────────────────────────────────────

export interface ConversationTurn {
  question: string;
  answer: string;
  task: CoachTask;
  askedAt: string; // ISO timestamp
}

/** Short-term dialogue memory for one coaching session. */
export interface ConversationMemory {
  record(turn: ConversationTurn): void;
  /** Most recent turns, oldest first, capped by the implementation. */
  recent(limit?: number): ConversationTurn[];
  clear(): void;
}

/** Long-lived facts about the player (rating, goals, preferences). */
export interface UserMemory {
  getRating(): Promise<number | null>;
  getPreferences(): Promise<Record<string, string>>;
}

/** What the coach has already said about a specific game. */
export interface GameMemory {
  getDiscussedPlies(gameId: string): Promise<number[]>;
  markDiscussed(gameId: string, ply: number): Promise<void>;
}

/** The player's weakness profile as coaching memory. */
export interface WeaknessMemory {
  getWeaknesses(): Promise<Weakness[]>;
  getSummaryLine(): Promise<string>;
}

export interface LessonRecord {
  topic: string;
  task: CoachTask;
  givenAt: string; // ISO timestamp
}

/** Recently delivered lessons, so the coach does not repeat itself. */
export interface RecentLessons {
  list(limit?: number): Promise<LessonRecord[]>;
  add(record: LessonRecord): Promise<void>;
}

/** Everything the coach can remember, injected as one optional bundle. */
export interface CoachMemory {
  conversation?: ConversationMemory;
  user?: UserMemory;
  game?: GameMemory;
  weaknesses?: WeaknessMemory;
  lessons?: RecentLessons;
}
