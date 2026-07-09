import { supabase } from '../../lib/supabase';
import { resolveCoachConfig, type CoachConfig } from '../config';
import { ChessContextBuilder } from '../context/contextBuilder';
import { SessionMemoryProvider } from '../memory/sessionMemory';
import { TemplatePromptBuilder } from '../prompts/promptBuilder';
import { createProvider } from '../providers/factory';
import { StructuredRetriever } from '../retrieval/retriever';
import { CoachOrchestrator } from './coachOrchestrator';
import { CoachService } from './coachService';

// ─────────────────────────────────────────────────────────────────────────────
// Composition root — the ONE place where the pipeline is assembled and the
// ONLY coach file that touches app singletons (import.meta.env, the supabase
// client). Swapping any stage (provider, retriever, memory, evaluation) is an
// edit here, not in the pipeline.
// ─────────────────────────────────────────────────────────────────────────────

export function createCoachService(config: CoachConfig = resolveCoachConfig()): CoachService {
  const provider = createProvider(config, {
    backend: {
      // The backend requires the caller's verified JWT for per-user rate
      // limiting; a missing session surfaces as 'auth-required'.
      getAccessToken: async () =>
        (await supabase.auth.getSession()).data.session?.access_token ?? null,
    },
  });

  const orchestrator = new CoachOrchestrator({
    contextBuilder: new ChessContextBuilder(),
    retriever: new StructuredRetriever(),
    promptBuilder: new TemplatePromptBuilder(),
    provider,
    memory: new SessionMemoryProvider(),
    // evaluation: intentionally not wired — every evaluation the coach sees
    // today is precomputed and arrives with the request context.
  });

  return new CoachService(orchestrator);
}

let defaultService: CoachService | null = null;

/** Lazily-created app-wide service (one conversation memory per session). */
export function getCoachService(): CoachService {
  if (!defaultService) defaultService = createCoachService();
  return defaultService;
}
