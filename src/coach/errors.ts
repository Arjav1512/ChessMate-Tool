// ─────────────────────────────────────────────────────────────────────────────
// Coach error taxonomy (Coach Foundation, Deliverable 10).
//
// Every failure the coach can hit is mapped to a small set of reasons with
// user-safe messages. The UI toasts `error.message` directly, so no message
// here may name a vendor, an env var, or any other implementation detail —
// "AI Coach unavailable", never "GEMINI_API_KEY missing".
// ─────────────────────────────────────────────────────────────────────────────

export type CoachUnavailableReason =
  | 'not-configured' // no provider configured / provider not implemented
  | 'offline'        // provider transport unreachable
  | 'rate-limited'   // provider budget exhausted
  | 'auth-required'  // caller has no valid session
  | 'no-context'     // request had no usable question/context
  | 'unknown';       // anything else — details stay server-side

const USER_MESSAGES: Record<CoachUnavailableReason, string> = {
  'not-configured': 'AI Coach is not available yet — it has not been set up for this environment.',
  offline: 'AI Coach is unreachable right now. Check your connection and try again.',
  'rate-limited': 'AI Coach has hit its request limit. Please try again in a minute.',
  'auth-required': 'Your session has expired. Please sign in again.',
  'no-context': 'Ask the coach a question about the game or position first.',
  unknown: 'AI Coach could not answer right now. Please try again.',
};

export class CoachUnavailableError extends Error {
  readonly reason: CoachUnavailableReason;

  constructor(reason: CoachUnavailableReason, message?: string) {
    super(message ?? USER_MESSAGES[reason]);
    this.name = 'CoachUnavailableError';
    this.reason = reason;
  }
}

/** Normalize any thrown value to a CoachUnavailableError with a safe message. */
export function toCoachError(err: unknown): CoachUnavailableError {
  if (err instanceof CoachUnavailableError) return err;
  return new CoachUnavailableError('unknown');
}
