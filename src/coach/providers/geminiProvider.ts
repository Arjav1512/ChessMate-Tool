import type { CoachTransport } from './chessMentorTransport';
import {
  streamFromGenerate,
  type CoachProvider,
  type ProviderHealth,
  type ProviderRequest,
  type ProviderResponse,
} from './types';

// ─────────────────────────────────────────────────────────────────────────────
// Gemini provider — capability declaration + delegation to an injected
// transport. All wire-contract knowledge (URL shape, prompt cap, status→error
// mapping) lives in the transport adapter; all vendor knowledge (the model
// itself, its API key) lives server-side behind it. This class only says WHAT
// the provider can do, so swapping the model is a factory change.
// ─────────────────────────────────────────────────────────────────────────────

export class GeminiProvider implements CoachProvider {
  readonly id = 'gemini';
  readonly displayName = 'ChessMate Coach';

  private readonly transport: CoachTransport;

  constructor(transport: CoachTransport) {
    this.transport = transport;
  }

  get maxPromptChars(): number {
    return this.transport.maxPromptChars;
  }

  async generate(request: ProviderRequest): Promise<ProviderResponse> {
    return { text: await this.transport.send(request.prompt, request.signal) };
  }

  stream(request: ProviderRequest): AsyncIterable<string> {
    return streamFromGenerate(this, request);
  }

  health(): Promise<ProviderHealth> {
    return this.transport.ready();
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
