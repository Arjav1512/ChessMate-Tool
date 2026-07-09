import coachPrompt from './coach_prompt.md?raw';
import lessonPrompt from './lesson_prompt.md?raw';
import mistakePrompt from './mistake_prompt.md?raw';
import openingPrompt from './opening_prompt.md?raw';
import reviewPrompt from './review_prompt.md?raw';

// ─────────────────────────────────────────────────────────────────────────────
// Prompt templates (Coach Foundation, Deliverable 4).
//
// Prompts live in the sibling .md files, NOT in TypeScript — they are imported
// as raw text at build time, so editing coaching language never touches code.
// Templates use {{placeholder}} slots filled by the assembly pipeline.
// ─────────────────────────────────────────────────────────────────────────────

/** The kinds of coaching ChessMate can ask a provider for. */
export type CoachTask = 'coach' | 'lesson' | 'review' | 'opening' | 'mistake';

const TEMPLATES: Record<CoachTask, string> = {
  coach: coachPrompt,
  lesson: lessonPrompt,
  review: reviewPrompt,
  opening: openingPrompt,
  mistake: mistakePrompt,
};

export function getPromptTemplate(task: CoachTask): string {
  return TEMPLATES[task];
}

/**
 * Fill {{name}} slots. Unknown slots collapse to '' (a template must render
 * even when a section — e.g. knowledge — is empty), and surplus blank lines
 * left by collapsed sections are squeezed.
 */
export function renderTemplate(template: string, vars: Record<string, string>): string {
  return template
    .replace(/\{\{(\w+)\}\}/g, (_, name: string) => vars[name] ?? '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
