import type { CoachUnavailableReason } from '../errors';

// ─────────────────────────────────────────────────────────────────────────────
// Provider interface (Coach Foundation, Deliverable 2).
//
// A provider is a dumb inference transport: it receives ONE fully assembled
// prompt (context + retrieved knowledge + template + question, built by the
// prompt-assembly pipeline) and returns text. It never fetches chess data,
// never builds prompts, and never leaks vendor details in errors — that keeps
// Gemini/Claude/OpenAI/Ollama interchangeable behind configuration.
// ─────────────────────────────────────────────────────────────────────────────

export interface ProviderRequest {
  /** The single fully-assembled prompt. Providers must not append to it. */
  prompt: string;
  signal?: AbortSignal;
}

export interface ProviderResponse {
  text: string;
}

export type ProviderHealth =
  | { ok: true }
  | { ok: false; reason: CoachUnavailableReason };

export interface CoachProvider {
  readonly id: string;
  readonly displayName: string;
  /** Hard transport cap for the assembled prompt; the assembler respects it. */
  readonly maxPromptChars: number;

  generate(request: ProviderRequest): Promise<ProviderResponse>;
  /**
   * Stream the answer as text chunks. Providers without native streaming
   * (supportsStreaming() === false) yield the full generate() result once, so
   * callers can consume every provider through the same loop.
   */
  stream(request: ProviderRequest): AsyncIterable<string>;
  /** Cheap local readiness check — must not spend provider budget. */
  health(): Promise<ProviderHealth>;

  supportsVision(): boolean;
  supportsStreaming(): boolean;
  supportsToolCalling(): boolean;
}

/** Shared pseudo-stream for providers without native streaming. */
export async function* streamFromGenerate(
  provider: Pick<CoachProvider, 'generate'>,
  request: ProviderRequest,
): AsyncIterable<string> {
  const { text } = await provider.generate(request);
  yield text;
}
