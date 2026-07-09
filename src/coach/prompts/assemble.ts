import { renderContext } from '../context/contextBuilder';
import type { CoachContext } from '../context/types';
import { CoachUnavailableError } from '../errors';
import type { KnowledgeDoc } from '../knowledge';
import type { ConversationTurn } from '../memory/types';
import { getPromptTemplate, renderTemplate, type CoachTask } from './templates';

// ─────────────────────────────────────────────────────────────────────────────
// Prompt assembly (Coach Foundation, Deliverable 8 + Phase 4A conversation).
//
//   Context + Retrieved docs + Conversation history + Template
//     →  ONE final prompt  →  Provider
//
// The provider never sees the pieces — only the assembled text, guaranteed to
// fit its transport budget. Degradation under budget pressure is ordered and
// deterministic: drop knowledge docs (least essential) first, then the
// conversation history block, then trim context lines from the end; the
// question is never cut.
// ─────────────────────────────────────────────────────────────────────────────

/** Keep the conversation block small and deterministic (Phase 4A / D1). */
const MAX_ANSWER_EXCERPT_CHARS = 320;

export interface AssemblyInput {
  task: CoachTask;
  question: string;
  context: CoachContext;
  docs: KnowledgeDoc[];
  /** The previous exchange(s), newest last — rendered so follow-ups
   *  ("Why?", "What if I played …?") resolve against the prior answer. */
  history?: ConversationTurn[];
  /** The player already asked this question this session — instruct the
   *  model to vary instead of repeating (Phase 4A / D4). */
  repeat?: boolean;
  /** Provider transport cap (CoachProvider.maxPromptChars). */
  maxChars: number;
}

function renderKnowledge(docs: KnowledgeDoc[]): string {
  if (!docs.length) return '';
  const body = docs.map((d) => d.content.trim()).join('\n\n');
  return `Reference notes from ChessMate's coaching library:\n\n${body}`;
}

const REPEAT_DIRECTIVE =
  'The player has already asked this same question in this session — your ' +
  'previous answer is shown above. Do NOT repeat it: go deeper by expanding ' +
  'the explanation, using a different concrete example, or setting a short ' +
  'training exercise instead.';

function renderHistory(history: ConversationTurn[], repeat: boolean): string {
  if (!history.length) return '';
  const turns = history.map((turn) => {
    const answer =
      turn.answer.length > MAX_ANSWER_EXCERPT_CHARS
        ? `${turn.answer.slice(0, MAX_ANSWER_EXCERPT_CHARS)}…`
        : turn.answer;
    return `The player asked: "${turn.question}"\nYou answered: ${answer}`;
  });
  const block = `Earlier in this session:\n${turns.join('\n\n')}`;
  // The directive only makes sense while the previous answer is visible, so
  // it lives (and is shed) with the history block.
  return repeat ? `${block}\n\n${REPEAT_DIRECTIVE}` : block;
}

export function assemblePrompt(input: AssemblyInput): string {
  const template = getPromptTemplate(input.task);
  const question = input.question.trim();

  const render = (contextBlock: string, docs: KnowledgeDoc[], historyBlock: string) =>
    renderTemplate(template, {
      // History reads best between the position data and the reference notes.
      context: [contextBlock, historyBlock].filter(Boolean).join('\n\n'),
      knowledge: renderKnowledge(docs),
      question,
    });

  // The question is non-negotiable — if it alone busts the budget, that is a
  // caller problem, reported in user terms.
  if (render('', [], '').length > input.maxChars) {
    throw new CoachUnavailableError(
      'no-context',
      'That question is too long — please shorten it and try again.',
    );
  }

  const contextBlock = renderContext(input.context);
  let historyBlock = renderHistory(input.history ?? [], input.repeat ?? false);

  // 1. Shed knowledge docs from the end (retrieval ordered them by relevance).
  const docs = [...input.docs];
  let prompt = render(contextBlock, docs, historyBlock);
  while (prompt.length > input.maxChars && docs.length > 0) {
    docs.pop();
    prompt = render(contextBlock, docs, historyBlock);
  }

  // 2. Still over: drop the conversation block (graceful degradation to the
  //    pre-4A single-shot behavior).
  if (prompt.length > input.maxChars && historyBlock) {
    historyBlock = '';
    prompt = render(contextBlock, docs, historyBlock);
  }

  // 3. Still over: trim context lines from the end (renderContext puts the
  //    core game/position/move lines first).
  const contextLines = contextBlock.split('\n');
  while (prompt.length > input.maxChars && contextLines.length > 0) {
    contextLines.pop();
    prompt = render(contextLines.join('\n'), docs, historyBlock);
  }

  return prompt;
}
