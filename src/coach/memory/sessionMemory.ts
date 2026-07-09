import type { ConversationMemory, ConversationTurn, MemoryProvider } from './types';

/** Turns kept per session — enough for follow-up questions, small enough to
 *  never threaten the prompt budget if a future phase includes them. */
const MAX_TURNS = 10;

/**
 * In-memory ConversationMemory for the current session (Phase 1's only
 * implementation — no persistence, no schema). One instance per CoachService.
 */
export class SessionConversationMemory implements ConversationMemory {
  private turns: ConversationTurn[] = [];

  record(turn: ConversationTurn): void {
    this.turns.push(turn);
    if (this.turns.length > MAX_TURNS) this.turns = this.turns.slice(-MAX_TURNS);
  }

  recent(limit = MAX_TURNS): ConversationTurn[] {
    return this.turns.slice(-limit);
  }

  clear(): void {
    this.turns = [];
  }
}

/**
 * The Phase-1 MemoryProvider: everything lives in this browser session.
 * Persistent backends (Supabase, Redis, localStorage) implement the same
 * interface later and swap in at the composition root.
 */
export class SessionMemoryProvider implements MemoryProvider {
  readonly id = 'session';
  readonly conversation: ConversationMemory;

  constructor(conversation: ConversationMemory = new SessionConversationMemory()) {
    this.conversation = conversation;
  }
}
