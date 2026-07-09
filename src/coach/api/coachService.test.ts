import { describe, expect, it, vi } from 'vitest';
import { ChessContextBuilder } from '../context/contextBuilder';
import type { CoachContext } from '../context/types';
import { CoachUnavailableError } from '../errors';
import { PrecomputedEvaluationProvider } from '../evaluation/precomputedEvaluation';
import type { KnowledgeDoc } from '../knowledge';
import { SessionMemoryProvider } from '../memory/sessionMemory';
import { TemplatePromptBuilder } from '../prompts/promptBuilder';
import type { CoachTask } from '../prompts/templates';
import { createProvider } from '../providers/factory';
import {
  streamFromGenerate,
  type CoachProvider,
  type ProviderHealth,
  type ProviderRequest,
  type ProviderResponse,
} from '../providers/types';
import { StructuredRetriever } from '../retrieval/retriever';
import type { KnowledgeRetriever } from '../retrieval/types';
import { CoachOrchestrator, type CoachOrchestratorDeps } from './coachOrchestrator';
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

/** Default composition with per-test overrides — mirrors defaultCoachService. */
function makeService(overrides: Partial<CoachOrchestratorDeps> & { provider: CoachProvider }) {
  return new CoachService(
    new CoachOrchestrator({
      contextBuilder: new ChessContextBuilder(),
      retriever: new StructuredRetriever(),
      promptBuilder: new TemplatePromptBuilder(),
      ...overrides,
    }),
  );
}

const SICILIAN_PGN = '1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 1-0';

describe('CoachService.ask — pipeline', () => {
  it('assembles context, retrieved knowledge, and the question into one provider prompt', async () => {
    const provider = new MockProvider();
    const service = makeService({ provider });

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
    const service = makeService({ provider });
    await service.ask({
      question: 'Thoughts?',
      context: { game: { pgn: SICILIAN_PGN }, moveHistory: Array(200).fill('Nf3') },
    });
    expect(provider.prompts[0].length).toBeLessThanOrEqual(700);
    expect(provider.prompts[0]).toContain('Thoughts?');
  });

  it('records the exchange in the memory provider', async () => {
    const memory = new SessionMemoryProvider();
    const service = makeService({ provider: new MockProvider(), memory });
    await service.ask({ question: 'Is Nf3 good?' });

    const turns = memory.conversation.recent();
    expect(turns).toHaveLength(1);
    expect(turns[0]).toMatchObject({
      question: 'Is Nf3 good?',
      answer: 'Coach says: develop your pieces.',
      task: 'coach',
    });
  });
});

describe('Phase 3A — production context activates retrieval (zero-result prevention)', () => {
  it('a normal analysis-flow question retrieves knowledge into the prompt', async () => {
    const provider = new MockProvider();
    const service = makeService({ provider });

    // Exactly what CoachTab sends after R1 (via the askChessMentor adapter):
    // pgn + opening + ratings + userColor + the move's phase/motifs/quality.
    await service.ask({
      question: 'What should I have played here?',
      context: {
        game: {
          white: 'Alice',
          black: 'Bob',
          result: '*',
          pgn: SICILIAN_PGN,
          whiteRating: 1600,
          blackRating: 1450,
          userColor: 'black',
        },
        fen: 'r1bqkb1r/pp2pppp/2np1n2/8/3NP3/2N5/PPP2PPP/R1BQKB1R w KQkq - 0 6',
        move: { san: 'Nf6', moveNumber: 5, color: 'black', phase: 'opening' },
      },
    });

    const prompt = provider.prompts[0];
    // Before Phase 3A this prompt carried ZERO knowledge (RETRIEVAL_AUDIT §0).
    expect(prompt).toContain("Reference notes from ChessMate's coaching library");
    // Opening derived from the PGN → the Sicilian doc.
    expect(prompt).toContain('Sicilian Defense (1.e4 c5)');
  });

  it('an uncovered opening falls back to principles instead of nothing (R2)', async () => {
    const provider = new MockProvider();
    const service = makeService({ provider });
    await service.ask({
      question: 'How did my opening go?',
      context: { game: { opening: { name: 'Philidor Defense' }, userColor: 'white' } },
    });
    expect(provider.prompts[0]).toContain('# Opening Principles');
  });

  it('rating-band guidance reaches the prompt via game ratings + user color (R3)', async () => {
    const provider = new MockProvider();
    const service = makeService({ provider });
    // No explicit player.rating — the context builder derives it (1450, black).
    await service.ask({
      question: 'How do I get better?',
      context: {
        game: { whiteRating: 1900, blackRating: 1450, userColor: 'black' },
        move: { san: 'Nf6', phase: 'middlegame' },
      },
    });
    expect(provider.prompts[0]).toContain('# Improving 1200–1800');
  });
});

describe('CoachOrchestrator — swappable stages (future-proofing seams)', () => {
  it('uses any KnowledgeRetriever implementation (a future VectorRetriever plugs in here)', async () => {
    const fakeVectorDoc: KnowledgeDoc = {
      id: 'vector/hit',
      category: 'tactics',
      title: 'Vector Hit',
      tags: [],
      content: 'Semantically retrieved note.',
    };
    const retrieve = vi.fn<(context: CoachContext, task: CoachTask) => Promise<KnowledgeDoc[]>>(
      async () => [fakeVectorDoc],
    );
    const retriever: KnowledgeRetriever = { id: 'fake-vector', retrieve };

    const provider = new MockProvider();
    const service = makeService({ provider, retriever });
    await service.ask({ question: 'Plan?' });

    expect(retriever.retrieve).toHaveBeenCalledOnce();
    expect(provider.prompts[0]).toContain('Semantically retrieved note.');
  });

  it('fills a missing evaluation via the EvaluationProvider, and only then', async () => {
    const fen = '8/8/8/8/8/8/8/K6k w - - 0 1';
    const evaluation = new PrecomputedEvaluationProvider(
      new Map([[fen, { evaluation: '+2.10', isMate: false, bestMove: 'Kb2' }]]),
    );
    const provider = new MockProvider();
    const service = makeService({ provider, evaluation });

    // Gap: context has a FEN but no evaluation → provider fills it.
    await service.ask({ question: 'Assess.', context: { fen } });
    expect(provider.prompts[0]).toContain('Engine evaluation: +2.10');

    // No gap: an evaluation supplied with the request is never overwritten.
    await service.ask({
      question: 'Assess.',
      context: { fen, move: { evaluation: { evaluation: '-0.50', isMate: false } } },
    });
    expect(provider.prompts[1]).toContain('Engine evaluation: -0.50');
    expect(provider.prompts[1]).not.toContain('+2.10');
  });
});

describe('CoachService.ask — graceful errors (façade guarantee)', () => {
  it('rejects an empty question without calling the provider', async () => {
    const provider = new MockProvider();
    const service = makeService({ provider });
    await expect(service.ask({ question: '   ' })).rejects.toMatchObject({ reason: 'no-context' });
    expect(provider.prompts).toHaveLength(0);
  });

  it('passes provider CoachUnavailableErrors through with their reason', async () => {
    const service = makeService({
      provider: new MockProvider({ fail: new CoachUnavailableError('rate-limited') }),
    });
    await expect(service.ask({ question: 'q' })).rejects.toMatchObject({
      reason: 'rate-limited',
      message: expect.stringContaining('request limit'),
    });
  });

  it('normalizes unexpected provider errors to a safe unknown, but reports the original', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const service = makeService({
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
    // The original error is reported to monitoring, not silently swallowed.
    expect(consoleError).toHaveBeenCalledWith(
      'Error:',
      expect.objectContaining({ message: expect.stringContaining('ECONNRESET') }),
      expect.objectContaining({ source: 'coach' }),
    );
    consoleError.mockRestore();
  });

  it('a configured-but-unimplemented provider fails gracefully', async () => {
    const provider = createProvider(
      { provider: 'claude', supabaseUrl: 'https://x.supabase.co' },
      { backend: { getAccessToken: async () => null } },
    );
    const service = makeService({ provider });
    await expect(service.ask({ question: 'q' })).rejects.toMatchObject({ reason: 'not-configured' });
    expect(await provider.health()).toEqual({ ok: false, reason: 'not-configured' });
    const spy = vi.fn();
    await service.ask({ question: 'q' }).catch((e: Error) => spy(e.message));
    expect(spy).toHaveBeenCalledWith(expect.not.stringMatching(/claude|gemini|openai/i));
  });
});

describe('provider factory', () => {
  it('selects the backend-fronted provider for the default config', () => {
    const provider = createProvider(
      { provider: 'gemini', supabaseUrl: 'https://x.supabase.co' },
      { backend: { getAccessToken: async () => 'jwt' } },
    );
    expect(provider.id).toBe('gemini');
    expect(provider.maxPromptChars).toBe(4000);
  });
});
