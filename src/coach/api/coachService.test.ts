import { describe, expect, it, vi } from 'vitest';
import { CoachUnavailableError } from '../errors';
import { SessionConversationMemory } from '../memory/sessionMemory';
import { createProvider } from '../providers/factory';
import {
  streamFromGenerate,
  type CoachProvider,
  type ProviderHealth,
  type ProviderRequest,
  type ProviderResponse,
} from '../providers/types';
import { CoachService } from './coachService';

// The whole pipeline runs against this mock — no API keys, no network.
class MockProvider implements CoachProvider {
  readonly id = 'mock';
  readonly displayName = 'Mock';
  readonly maxPromptChars: number;
  readonly prompts: string[] = [];
  private readonly fail?: CoachUnavailableError | Error;

  constructor(opts: { maxPromptChars?: number; fail?: CoachUnavailableError | Error } = {}) {
    this.maxPromptChars = opts.maxPromptChars ?? 4000;
    this.fail = opts.fail;
  }

  async generate(request: ProviderRequest): Promise<ProviderResponse> {
    this.prompts.push(request.prompt);
    if (this.fail) throw this.fail;
    return { text: 'Coach says: develop your pieces.' };
  }

  stream(request: ProviderRequest): AsyncIterable<string> {
    return streamFromGenerate(this, request);
  }

  async health(): Promise<ProviderHealth> {
    return { ok: true };
  }

  supportsVision() {
    return false;
  }
  supportsStreaming() {
    return false;
  }
  supportsToolCalling() {
    return false;
  }
}

const SICILIAN_PGN = '1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 1-0';

describe('CoachService.ask — pipeline', () => {
  it('assembles context, retrieved knowledge, and the question into one provider prompt', async () => {
    const provider = new MockProvider();
    const service = new CoachService({ provider });

    const answer = await service.ask({
      task: 'mistake',
      question: 'What did 12...Nf6 miss?',
      context: {
        game: { white: 'Alice', black: 'Bob', pgn: SICILIAN_PGN },
        fen: 'r1bqkb1r/pp2pppp/2np1n2/8/3NP3/2N5/PPP2PPP/R1BQKB1R w KQkq - 0 6',
        move: { san: 'Nf6', classification: 'blunder', motifs: ['hung_piece'], phase: 'middlegame' },
      },
    });

    expect(answer).toEqual({
      text: 'Coach says: develop your pieces.',
      task: 'mistake',
      providerId: 'mock',
    });

    const prompt = provider.prompts[0];
    expect(prompt).toContain('Game: Alice vs Bob');
    // Context builder derived the opening from the PGN.
    expect(prompt).toContain('Sicilian');
    // Structured retrieval pulled the motif doc for the blunder.
    expect(prompt).toContain('Hanging Pieces');
    expect(prompt).toContain('What did 12...Nf6 miss?');
    expect(prompt.length).toBeLessThanOrEqual(provider.maxPromptChars);
  });

  it('respects the provider prompt budget', async () => {
    const provider = new MockProvider({ maxPromptChars: 700 });
    const service = new CoachService({ provider });
    await service.ask({
      question: 'Thoughts?',
      context: { game: { pgn: SICILIAN_PGN }, moveHistory: Array(200).fill('Nf3') },
    });
    expect(provider.prompts[0].length).toBeLessThanOrEqual(700);
    expect(provider.prompts[0]).toContain('Thoughts?');
  });

  it('records the exchange in conversation memory', async () => {
    const conversation = new SessionConversationMemory();
    const service = new CoachService({ provider: new MockProvider(), memory: { conversation } });
    await service.ask({ question: 'Is Nf3 good?' });

    const turns = conversation.recent();
    expect(turns).toHaveLength(1);
    expect(turns[0]).toMatchObject({
      question: 'Is Nf3 good?',
      answer: 'Coach says: develop your pieces.',
      task: 'coach',
    });
  });
});

describe('CoachService.ask — graceful errors (Deliverable 10)', () => {
  it('rejects an empty question without calling the provider', async () => {
    const provider = new MockProvider();
    const service = new CoachService({ provider });
    await expect(service.ask({ question: '   ' })).rejects.toMatchObject({ reason: 'no-context' });
    expect(provider.prompts).toHaveLength(0);
  });

  it('passes provider CoachUnavailableErrors through with their reason', async () => {
    const service = new CoachService({
      provider: new MockProvider({ fail: new CoachUnavailableError('rate-limited') }),
    });
    await expect(service.ask({ question: 'q' })).rejects.toMatchObject({
      reason: 'rate-limited',
      message: expect.stringContaining('request limit'),
    });
  });

  it('normalizes unexpected provider errors to a safe unknown', async () => {
    const service = new CoachService({
      provider: new MockProvider({ fail: new Error('ECONNRESET at vendor-sdk.js:42') }),
    });
    const err: CoachUnavailableError = await service.ask({ question: 'q' }).then(
      () => {
        throw new Error('expected rejection');
      },
      (e: CoachUnavailableError) => e,
    );
    expect(err).toBeInstanceOf(CoachUnavailableError);
    expect(err.reason).toBe('unknown');
    expect(err.message).not.toContain('vendor-sdk');
  });

  it('a configured-but-unimplemented provider fails gracefully', async () => {
    const provider = createProvider(
      { provider: 'claude', supabaseUrl: 'https://x.supabase.co' },
      { gemini: { getAccessToken: async () => null } },
    );
    const service = new CoachService({ provider });
    await expect(service.ask({ question: 'q' })).rejects.toMatchObject({ reason: 'not-configured' });
    expect(await provider.health()).toEqual({ ok: false, reason: 'not-configured' });
    const spy = vi.fn();
    await service.ask({ question: 'q' }).catch((e: Error) => spy(e.message));
    expect(spy).toHaveBeenCalledWith(expect.not.stringMatching(/claude|gemini|openai/i));
  });
});

describe('provider factory', () => {
  it('selects the Gemini provider for the default config', () => {
    const provider = createProvider(
      { provider: 'gemini', supabaseUrl: 'https://x.supabase.co' },
      { gemini: { getAccessToken: async () => 'jwt' } },
    );
    expect(provider.id).toBe('gemini');
  });
});
