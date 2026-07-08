import { supabase } from '../../lib/supabase';
import { resolveCoachConfig, type CoachConfig } from '../config';
import { SessionConversationMemory } from '../memory/sessionMemory';
import { createProvider } from '../providers/factory';
import { CoachService } from './coachService';

// ─────────────────────────────────────────────────────────────────────────────
// Composition root — the ONLY place the coach touches app singletons
// (import.meta.env, the supabase client). Everything below this file is
// dependency-injected and testable without keys or network.
// ─────────────────────────────────────────────────────────────────────────────

export function createCoachService(config: CoachConfig = resolveCoachConfig()): CoachService {
  const provider = createProvider(config, {
    gemini: {
      // The edge function requires the caller's verified JWT for per-user
      // rate limiting; a missing session surfaces as 'auth-required'.
      getAccessToken: async () =>
        (await supabase.auth.getSession()).data.session?.access_token ?? null,
    },
  });
  return new CoachService({
    provider,
    memory: { conversation: new SessionConversationMemory() },
  });
}

let defaultService: CoachService | null = null;

/** Lazily-created app-wide service (one conversation memory per session). */
export function getCoachService(): CoachService {
  if (!defaultService) defaultService = createCoachService();
  return defaultService;
}
