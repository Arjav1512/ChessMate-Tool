import { buildCoachContext } from '../context/contextBuilder';
import { CoachUnavailableError, toCoachError } from '../errors';
import type { KnowledgeDoc } from '../knowledge';
import type { CoachMemory } from '../memory/types';
import { assemblePrompt } from '../prompts/assemble';
import type { CoachTask } from '../prompts/templates';
import type { CoachProvider } from '../providers/types';
import { queryFromContext, retrieveKnowledge } from '../retrieval/retriever';
import type { CoachAnswer, CoachRequest } from './types';

// ─────────────────────────────────────────────────────────────────────────────
// Coach service — the one entry point the app talks to.
//
//   CoachRequest → context build → structured retrieval → prompt assembly
//                → provider.generate → (memory) → CoachAnswer
//
// Dependencies are injected, so tests run the whole pipeline against a mock
// provider with no API keys, and a future Claude/OpenAI/Ollama provider slots
// in without the service (or the frontend) changing.
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_TASK: CoachTask = 'coach';

export interface CoachServiceDeps {
  provider: CoachProvider;
  /** Override the bundled knowledge base (tests, future remote corpus). */
  knowledge?: KnowledgeDoc[];
  memory?: CoachMemory;
}

export class CoachService {
  private readonly deps: CoachServiceDeps;

  constructor(deps: CoachServiceDeps) {
    this.deps = deps;
  }

  get provider(): CoachProvider {
    return this.deps.provider;
  }

  async ask(request: CoachRequest): Promise<CoachAnswer> {
    const task = request.task ?? DEFAULT_TASK;
    const question = request.question.trim();
    if (!question) throw new CoachUnavailableError('no-context');

    const context = buildCoachContext(request.context ?? {});
    const docs = retrieveKnowledge(queryFromContext(context, task), this.deps.knowledge);
    const prompt = assemblePrompt({
      task,
      question,
      context,
      docs,
      maxChars: this.deps.provider.maxPromptChars,
    });

    let text: string;
    try {
      text = (await this.deps.provider.generate({ prompt, signal: request.signal })).text;
    } catch (err) {
      // Every failure leaves as a CoachUnavailableError with a user-safe
      // message — the UI toasts error.message and must never see vendor detail.
      throw toCoachError(err);
    }

    this.deps.memory?.conversation?.record({
      question,
      answer: text,
      task,
      askedAt: new Date().toISOString(),
    });

    return { text, task, providerId: this.deps.provider.id };
  }
}
