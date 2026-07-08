import type { CoachConfig } from '../config';
import { CoachUnavailableError } from '../errors';
import { ChessMentorTransport, type ChessMentorTransportDeps } from './chessMentorTransport';
import { GeminiProvider } from './geminiProvider';
import {
  streamFromGenerate,
  type CoachProvider,
  type ProviderHealth,
  type ProviderRequest,
  type ProviderResponse,
} from './types';

// ─────────────────────────────────────────────────────────────────────────────
// Provider factory — the single place that maps configuration to an
// implementation (and the last layer that may name a vendor). Configured-but-
// unimplemented providers (claude/openai/ollama, Phase 2+) resolve to a stub
// that fails gracefully at call time, so a bad config value degrades to
// "AI Coach unavailable" instead of a crash.
// ─────────────────────────────────────────────────────────────────────────────

class UnimplementedProvider implements CoachProvider {
  readonly displayName = 'ChessMate Coach';
  // Placeholder budget for a provider that never sends anything.
  readonly maxPromptChars = 4000;

  constructor(readonly id: string) {}

  async generate(): Promise<ProviderResponse> {
    throw new CoachUnavailableError('not-configured');
  }

  stream(request: ProviderRequest): AsyncIterable<string> {
    return streamFromGenerate(this, request);
  }

  async health(): Promise<ProviderHealth> {
    return { ok: false, reason: 'not-configured' };
  }

  supportsVision(): boolean {
    return false;
  }

  supportsStreaming(): boolean {
    return false;
  }

  supportsToolCalling(): boolean {
    return false;
  }
}

export interface ProviderFactoryDeps {
  /** Auth/transport wiring for providers fronted by the ChessMate backend. */
  backend: Omit<ChessMentorTransportDeps, 'baseUrl'>;
}

export function createProvider(config: CoachConfig, deps: ProviderFactoryDeps): CoachProvider {
  switch (config.provider) {
    case 'gemini':
      return new GeminiProvider(
        new ChessMentorTransport({ ...deps.backend, baseUrl: config.supabaseUrl }),
      );
    case 'claude':
    case 'openai':
    case 'ollama':
      return new UnimplementedProvider(config.provider);
  }
}
