import { renderContext } from '../context/contextBuilder';
import type { CoachContext } from '../context/types';
import { CoachUnavailableError } from '../errors';
import type { KnowledgeDoc } from '../knowledge';
import { getPromptTemplate, renderTemplate, type CoachTask } from './templates';

// ─────────────────────────────────────────────────────────────────────────────
// Prompt assembly (Coach Foundation, Deliverable 8).
//
//   Context + Retrieved docs + Template  →  ONE final prompt  →  Provider
//
// The provider never sees the pieces — only the assembled text, guaranteed to
// fit its transport budget. Degradation under budget pressure is ordered and
// deterministic: drop knowledge docs (least essential) first, then trim
// context lines from the end; the question is never cut.
// ─────────────────────────────────────────────────────────────────────────────

export interface AssemblyInput {
  task: CoachTask;
  question: string;
  context: CoachContext;
  docs: KnowledgeDoc[];
  /** Provider transport cap (CoachProvider.maxPromptChars). */
  maxChars: number;
}

function renderKnowledge(docs: KnowledgeDoc[]): string {
  if (!docs.length) return '';
  const body = docs.map((d) => d.content.trim()).join('\n\n');
  return `Reference notes from ChessMate's coaching library:\n\n${body}`;
}

export function assemblePrompt(input: AssemblyInput): string {
  const template = getPromptTemplate(input.task);
  const question = input.question.trim();

  const render = (contextBlock: string, docs: KnowledgeDoc[]) =>
    renderTemplate(template, {
      context: contextBlock,
      knowledge: renderKnowledge(docs),
      question,
    });

  // The question is non-negotiable — if it alone busts the budget, that is a
  // caller problem, reported in user terms.
  if (render('', []).length > input.maxChars) {
    throw new CoachUnavailableError(
      'no-context',
      'That question is too long — please shorten it and try again.',
    );
  }

  const contextBlock = renderContext(input.context);

  // 1. Shed knowledge docs from the end (retrieval ordered them by relevance).
  const docs = [...input.docs];
  let prompt = render(contextBlock, docs);
  while (prompt.length > input.maxChars && docs.length > 0) {
    docs.pop();
    prompt = render(contextBlock, docs);
  }

  // 2. Still over: trim context lines from the end (renderContext puts the
  //    core game/position/move lines first).
  const contextLines = contextBlock.split('\n');
  while (prompt.length > input.maxChars && contextLines.length > 0) {
    contextLines.pop();
    prompt = render(contextLines.join('\n'), docs);
  }

  return prompt;
}
