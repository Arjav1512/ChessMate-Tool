import { assemblePrompt, type AssemblyInput } from './assemble';

// ─────────────────────────────────────────────────────────────────────────────
// Prompt-builder abstraction (Refinement goal 5).
//
// One job: context + knowledge + template + question → exactly one assembled
// prompt. No retrieval, no orchestration, no provider knowledge — the
// orchestrator hands it fully-resolved inputs and a budget. Sync on purpose:
// prompt rendering is pure; anything that needs I/O belongs upstream.
// ─────────────────────────────────────────────────────────────────────────────

export type PromptInput = AssemblyInput;

export interface PromptBuilder {
  build(input: PromptInput): string;
}

/** The default builder: the externalized .md templates + budgeted assembly. */
export class TemplatePromptBuilder implements PromptBuilder {
  build(input: PromptInput): string {
    return assemblePrompt(input);
  }
}
