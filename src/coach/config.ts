// ─────────────────────────────────────────────────────────────────────────────
// Coach configuration (Coach Foundation, Deliverable 9).
//
// The active AI provider is selected by configuration, never by the frontend:
//   VITE_AI_PROVIDER=gemini | claude | openai | ollama
// Only Gemini is implemented in Phase 1; the others are recognized so that a
// future provider drops in without a config-format change. An unknown value
// falls back to the default rather than breaking the app.
// ─────────────────────────────────────────────────────────────────────────────

export const PROVIDER_IDS = ['gemini', 'claude', 'openai', 'ollama'] as const;
export type ProviderId = (typeof PROVIDER_IDS)[number];

export const DEFAULT_PROVIDER: ProviderId = 'gemini';

export interface CoachConfig {
  provider: ProviderId;
  /** Base URL of the backend that fronts the provider (Supabase project URL). */
  supabaseUrl: string | null;
}

function isProviderId(value: unknown): value is ProviderId {
  return typeof value === 'string' && (PROVIDER_IDS as readonly string[]).includes(value);
}

/**
 * Resolve the coach configuration from an env-shaped record. `env` is
 * injectable so tests never depend on import.meta.env or real keys.
 */
export function resolveCoachConfig(
  env: Record<string, string | undefined> = import.meta.env as Record<string, string | undefined>,
): CoachConfig {
  const raw = env.VITE_AI_PROVIDER?.trim().toLowerCase();
  let provider: ProviderId = DEFAULT_PROVIDER;
  if (isProviderId(raw)) {
    provider = raw;
  } else if (raw) {
    console.warn(`Unknown VITE_AI_PROVIDER "${raw}" — falling back to "${DEFAULT_PROVIDER}".`);
  }
  return {
    provider,
    supabaseUrl: env.VITE_SUPABASE_URL?.trim() || null,
  };
}
