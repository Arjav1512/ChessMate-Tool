import { CoachUnavailableError } from '../errors';
import {
  streamFromGenerate,
  type CoachProvider,
  type ProviderHealth,
  type ProviderRequest,
  type ProviderResponse,
} from './types';

// ─────────────────────────────────────────────────────────────────────────────
// Gemini provider — wraps the existing `chess-mentor` Supabase edge function.
//
// The wire contract is unchanged: POST { question } with the caller's verified
// JWT; the edge function applies its own persona/format prompt, rate limits
// per user, and calls Gemini server-side (the API key never reaches the
// client). This class only maps that transport onto the CoachProvider
// interface and translates transport failures into vendor-neutral errors.
// ─────────────────────────────────────────────────────────────────────────────

/** Matches MAX_QUESTION_CHARS in supabase/functions/chess-mentor/index.ts. */
const EDGE_MAX_QUESTION_CHARS = 4000;

export interface GeminiProviderDeps {
  /** Supabase project URL the edge function is deployed under. */
  baseUrl: string | null;
  /** Returns the caller's JWT, or null when there is no valid session. */
  getAccessToken: () => Promise<string | null>;
  /** Injectable for tests; defaults to global fetch. */
  fetchFn?: typeof fetch;
}

export class GeminiProvider implements CoachProvider {
  readonly id = 'gemini';
  readonly displayName = 'ChessMate Coach';
  readonly maxPromptChars = EDGE_MAX_QUESTION_CHARS;

  private readonly deps: GeminiProviderDeps;

  constructor(deps: GeminiProviderDeps) {
    this.deps = deps;
  }

  async generate(request: ProviderRequest): Promise<ProviderResponse> {
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
        body: JSON.stringify({ question: request.prompt }),
        signal: request.signal,
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
    return { text: data.answer };
  }

  stream(request: ProviderRequest): AsyncIterable<string> {
    return streamFromGenerate(this, request);
  }

  // Local readiness only — no network ping, because every edge-function call
  // consumes the user's rate budget and there is no free health route.
  async health(): Promise<ProviderHealth> {
    if (!this.deps.baseUrl) return { ok: false, reason: 'not-configured' };
    const token = await this.deps.getAccessToken();
    if (!token) return { ok: false, reason: 'auth-required' };
    return { ok: true };
  }

  supportsVision(): boolean {
    return false;
  }

  supportsStreaming(): boolean {
    // The edge function returns a single JSON body; stream() pseudo-streams.
    return false;
  }

  supportsToolCalling(): boolean {
    return false;
  }
}
