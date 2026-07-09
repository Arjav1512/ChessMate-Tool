import { describe, expect, it } from 'vitest';
import { CoachUnavailableError } from '../errors';
import type { KnowledgeDoc } from '../knowledge';
import { assemblePrompt } from './assemble';
import { getPromptTemplate, renderTemplate, type CoachTask } from './templates';

const TASKS: CoachTask[] = ['coach', 'lesson', 'review', 'opening', 'mistake'];

const doc = (id: string, content: string): KnowledgeDoc => ({
  id,
  category: 'tactics',
  title: id,
  tags: [id],
  content,
});

describe('prompt templates (externalized)', () => {
  it('every task has a non-empty markdown template with the three slots', () => {
    for (const task of TASKS) {
      const template = getPromptTemplate(task);
      expect(template.length).toBeGreaterThan(50);
      expect(template).toContain('{{context}}');
      expect(template).toContain('{{knowledge}}');
      expect(template).toContain('{{question}}');
    }
  });

  it('renderTemplate fills slots and collapses empty sections', () => {
    const rendered = renderTemplate('A\n\n{{context}}\n\n{{question}}', { question: 'Q?', context: '' });
    expect(rendered).toBe('A\n\nQ?');
  });
});

describe('assemblePrompt', () => {
  const baseInput = {
    task: 'coach' as const,
    question: 'Why is this losing?',
    context: { fen: '8/8/8/8/8/8/8/8 w - - 0 1', moveHistory: ['e4', 'c5'] },
    maxChars: 4000,
  };

  it('assembles context + knowledge + question into one prompt', () => {
    const prompt = assemblePrompt({ ...baseInput, docs: [doc('pins', '# Pins\nPin knowledge.')] });
    expect(prompt).toContain('Position (FEN): 8/8/8/8/8/8/8/8 w - - 0 1');
    expect(prompt).toContain('Pin knowledge.');
    expect(prompt).toContain('Why is this losing?');
    // Question last — it is what the model answers.
    expect(prompt.indexOf('Why is this losing?')).toBeGreaterThan(prompt.indexOf('Pin knowledge.'));
  });

  it('sheds knowledge docs (least relevant first) to fit the budget', () => {
    const prompt = assemblePrompt({
      ...baseInput,
      maxChars: 600,
      docs: [doc('keep', 'K'.repeat(80)), doc('drop', 'D'.repeat(1000))],
    });
    expect(prompt.length).toBeLessThanOrEqual(600);
    expect(prompt).toContain('K'.repeat(80));
    expect(prompt).not.toContain('D'.repeat(1000));
    expect(prompt).toContain('Why is this losing?');
  });

  it('trims context lines from the end when knowledge alone is not enough', () => {
    const prompt = assemblePrompt({
      ...baseInput,
      maxChars: 320,
      context: { fen: '8/8/8/8/8/8/8/8 w - - 0 1', moveHistory: Array(60).fill('Nf3') },
      docs: [doc('d', 'X'.repeat(500))],
    });
    expect(prompt.length).toBeLessThanOrEqual(320);
    // The FEN (first context line) survives; the trailing history line goes.
    expect(prompt).toContain('Position (FEN)');
    expect(prompt).not.toContain('Moves so far');
    expect(prompt).toContain('Why is this losing?');
  });

  it('never truncates the question — an oversize question fails gracefully', () => {
    expect(() =>
      assemblePrompt({ ...baseInput, question: 'q'.repeat(5000), docs: [] }),
    ).toThrowError(CoachUnavailableError);
  });
});
