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

/** Turns consulted for follow-up context and repeat detection (D1/D4). */
const HISTORY_WINDOW = 5;

/** Question identity for repeat detection: case/punctuation/space-insensitive. */
const normalizeQuestion = (q: string) => q.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

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

    // Conversational awareness (Phase 4A): the last exchange resolves
    // follow-ups; an exact-repeat question rotates the lead knowledge doc and
    // instructs the model to vary. Session-scoped and deterministic.
    const turns = this.deps.memory?.conversation.recent(HISTORY_WINDOW) ?? [];
    const lastTurn = turns[turns.length - 1];
    const repeatedTurn = [...turns]
      .reverse()
      .find((t) => normalizeQuestion(t.question) === normalizeQuestion(question));

    let docs = await this.deps.retriever.retrieve(context, task);
    if (repeatedTurn?.docIds?.length) {
      // The lead doc defined the previous answer's lesson — serve the next
      // best material instead (an empty result is fine: the model expands
      // from the visible previous answer).
      docs = docs.filter((d) => d.id !== repeatedTurn.docIds![0]);
    }

    const prompt = this.deps.promptBuilder.build({
      task,
      question,
      context,
      docs,
      history: lastTurn ? [lastTurn] : undefined,
      repeat: !!repeatedTurn,
      maxChars: this.deps.provider.maxPromptChars,
    });

    const { text } = await this.deps.provider.generate({ prompt, signal: request.signal });

    this.deps.memory?.conversation.record({
      question,
      answer: text,
      task,
      askedAt: new Date().toISOString(),
      docIds: docs.map((d) => d.id),
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
