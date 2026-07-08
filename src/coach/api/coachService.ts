import { toCoachError } from '../errors';
import type { CoachOrchestrator } from './coachOrchestrator';
import type { CoachAnswer, CoachRequest } from './types';

// ─────────────────────────────────────────────────────────────────────────────
// Coach service — the thin public façade the app talks to. Its whole contract:
// delegate to the orchestrator, and guarantee that every failure leaves as a
// CoachUnavailableError with a user-safe message (the UI toasts error.message
// and must never see vendor or transport detail). Pipeline logic lives in
// CoachOrchestrator; composition lives in defaultCoachService.
// ─────────────────────────────────────────────────────────────────────────────

export class CoachService {
  private readonly orchestrator: CoachOrchestrator;

  constructor(orchestrator: CoachOrchestrator) {
    this.orchestrator = orchestrator;
  }

  async ask(request: CoachRequest): Promise<CoachAnswer> {
    try {
      return await this.orchestrator.run(request);
    } catch (err) {
      throw toCoachError(err);
    }
  }
}
