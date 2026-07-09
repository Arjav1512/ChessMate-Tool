import type { ContextBuilder } from '../context/contextBuilder';
import type { CoachContext } from '../context/types';
import { CoachUnavailableError } from '../errors';
import type { EvaluationProvider } from '../evaluation/types';
import type { MemoryProvider } from '../memory/types';
import type { PromptBuilder } from '../prompts/promptBuilder';
import type { CoachTask } from '../prompts/templates';
import type { CoachProvider } from '../providers/types';
import type { KnowledgeRetriever } from '../retrieval/types';
import type { CoachAnswer, CoachRequest } from './types';

// ─────────────────────────────────────────────────────────────────────────────
// Coach orchestrator (Refinement goal 1) — owns the request pipeline:
//
//   validate → context build → (evaluation gap-fill) → retrieval
//            → prompt build → provider.generate → memory record
//
// Every stage is an injected interface, so a stage swaps (VectorRetriever,
// SupabaseMemory, a live EvaluationProvider, any CoachProvider) without this
// file — or anything above it — changing. The orchestrator knows the order of
// the stages and nothing about their internals.
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_TASK: CoachTask = 'coach';

export interface CoachOrchestratorDeps {
  contextBuilder: ContextBuilder;
  retriever: KnowledgeRetriever;
  promptBuilder: PromptBuilder;
  provider: CoachProvider;
  /** Optional: record exchanges; absent facets degrade silently. */
  memory?: MemoryProvider;
  /** Optional: fill a missing evaluation for context.fen. Not wired in the
   *  default composition — context already arrives evaluated today. */
  evaluation?: EvaluationProvider;
}

export class CoachOrchestrator {
  private readonly deps: CoachOrchestratorDeps;

  constructor(deps: CoachOrchestratorDeps) {
    this.deps = deps;
  }

  async run(request: CoachRequest): Promise<CoachAnswer> {
    const task = request.task ?? DEFAULT_TASK;
    const question = request.question.trim();
    if (!question) throw new CoachUnavailableError('no-context');

    let context = await this.deps.contextBuilder.build(request.context ?? {});
    context = await this.fillEvaluationGap(context);

    const docs = await this.deps.retriever.retrieve(context, task);
    const prompt = this.deps.promptBuilder.build({
      task,
      question,
      context,
      docs,
      maxChars: this.deps.provider.maxPromptChars,
    });

    const { text } = await this.deps.provider.generate({ prompt, signal: request.signal });

    this.deps.memory?.conversation.record({
      question,
      answer: text,
      task,
      askedAt: new Date().toISOString(),
    });

    return { text, task, providerId: this.deps.provider.id };
  }

  /** Ask the evaluation strategy for engine truth only when context lacks it. */
  private async fillEvaluationGap(context: CoachContext): Promise<CoachContext> {
    const { evaluation } = this.deps;
    if (!evaluation || !context.fen || context.move?.evaluation) return context;
    const found = await evaluation.evaluate(context.fen);
    if (!found) return context;
    return { ...context, move: { ...context.move, evaluation: found } };
  }
}
