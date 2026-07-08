import { CoachUnavailableError } from '../errors';
import type { ProviderHealth } from './types';

// ─────────────────────────────────────────────────────────────────────────────
// chess-mentor transport adapter — the ONE place that knows the deployed
// backend's wire contract (Refinement goal 7: deployment coupling isolated
// behind a single adapter).
//
// Contract with supabase/functions/chess-mentor/index.ts (deployed, must not
// break): POST { question } with the caller's verified JWT; the function
// applies its own persona/format prompt, rate limits per user, and calls the
// model server-side (API keys never reach the client). Any server-fronted
// provider reuses this adapter; a direct-API provider (e.g. local Ollama)
// would implement its own CoachTransport instead.
// ─────────────────────────────────────────────────────────────────────────────

/** What a provider needs from a backend: send one prompt, get one answer. */
export interface CoachTransport {
  /** Hard cap the backend enforces on the assembled prompt. */
  readonly maxPromptChars: number;
  /** Resolve the answer text or throw a CoachUnavailableError. */
  send(prompt: string, signal?: AbortSignal): Promise<string>;
  /** Cheap local readiness check — must not spend backend budget. */
  ready(): Promise<ProviderHealth>;
}

/** Matches MAX_QUESTION_CHARS in supabase/functions/chess-mentor/index.ts. */
const EDGE_MAX_QUESTION_CHARS = 4000;

export interface ChessMentorTransportDeps {
  /** Supabase project URL the edge function is deployed under. */
  baseUrl: string | null;
  /** Returns the caller's JWT, or null when there is no valid session. */
  getAccessToken: () => Promise<string | null>;
  /** Injectable for tests; defaults to global fetch. */
  fetchFn?: typeof fetch;
}

export class ChessMentorTransport implements CoachTransport {
  readonly maxPromptChars = EDGE_MAX_QUESTION_CHARS;

  private readonly deps: ChessMentorTransportDeps;

  constructor(deps: ChessMentorTransportDeps) {
    this.deps = deps;
  }

  async send(prompt: string, signal?: AbortSignal): Promise<string> {
    if (!this.deps.baseUrl) throw new CoachUnavailableError('not-configured');

    // The edge function identifies the caller for DB-backed rate limiting and
    // rejects requests without a verified JWT — surface that as a session
    // problem instead of silently retrying with the public anon key.
    const token = await this.deps.getAccessToken();
    if (!token) throw new CoachUnavailableError('auth-required');

    const fetchFn = this.deps.fetchFn ?? fetch;
    let response: Response;
    try {
      response = await fetchFn(`${this.deps.baseUrl}/functions/v1/chess-mentor`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ question: prompt }),
        signal,
      });
    } catch {
      throw new CoachUnavailableError('offline');
    }

    if (!response.ok) {
      // Map status → reason. Server error details (which may name the vendor
      // or its config) are intentionally not forwarded to the UI.
      if (response.status === 429) throw new CoachUnavailableError('rate-limited');
      if (response.status === 401 || response.status === 403) {
        throw new CoachUnavailableError('auth-required');
      }
      if (response.status === 500) throw new CoachUnavailableError('not-configured');
      throw new CoachUnavailableError('unknown');
    }

    let data: { answer?: unknown };
    try {
      data = await response.json();
    } catch {
      throw new CoachUnavailableError('unknown');
    }
    if (typeof data.answer !== 'string' || !data.answer) {
      throw new CoachUnavailableError('unknown');
    }
    return data.answer;
  }

  // Local readiness only — no network ping, because every edge-function call
  // consumes the user's rate budget and there is no free health route.
  async ready(): Promise<ProviderHealth> {
    if (!this.deps.baseUrl) return { ok: false, reason: 'not-configured' };
    const token = await this.deps.getAccessToken();
    if (!token) return { ok: false, reason: 'auth-required' };
    return { ok: true };
  }
}
