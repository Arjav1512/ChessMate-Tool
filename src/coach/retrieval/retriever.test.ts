import { describe, expect, it } from 'vitest';
import { KNOWLEDGE_BASE } from '../knowledge';
import { queryFromContext, retrieveKnowledge } from './retriever';

describe('retrieveKnowledge', () => {
  it('matches an opening by name', () => {
    const docs = retrieveKnowledge({ opening: 'Sicilian Defense' });
    expect(docs[0]?.id).toBe('openings/sicilian');
  });

  it('matches motif ids from lib/motifs', () => {
    const docs = retrieveKnowledge({ motifs: ['hung_piece'] });
    expect(docs.map((d) => d.id)).toContain('motifs/hanging_pieces');
  });

  it('matches a mistake classification to the calculation principle', () => {
    const docs = retrieveKnowledge({ mistake: 'blunder' });
    expect(docs.map((d) => d.id)).toContain('principles/calculation');
  });

  it('prioritizes opening > theme > motif > mistake and respects the limit', () => {
    const docs = retrieveKnowledge({
      opening: 'French Defense',
      theme: 'endgame',
      mistake: 'blunder',
      motifs: ['hung_piece'],
    });
    expect(docs).toHaveLength(2);
    expect(docs[0].id).toBe('openings/french');
    expect(docs[1].category).toBe('endgames');
  });

  it('deduplicates and is deterministic', () => {
    const query = { motifs: ['allowed_mate', 'allowed_mate', 'missed_mate'] };
    const first = retrieveKnowledge(query, KNOWLEDGE_BASE, 4);
    const second = retrieveKnowledge(query, KNOWLEDGE_BASE, 4);
    expect(first).toEqual(second);
    expect(new Set(first.map((d) => d.id)).size).toBe(first.length);
  });

  it('returns nothing for an empty or unmatched query', () => {
    expect(retrieveKnowledge({})).toEqual([]);
    expect(retrieveKnowledge({ opening: 'Orangutan Hyperaccelerated' })).toEqual([]);
  });

  it('matches tags as whole words only — no fragment or needle-in-tag hits', () => {
    // 'pins' must not fire inside 'Pinsk'; a short term must not match a
    // longer tag that merely contains it ('material' ⊄ 'missed_material_gain').
    expect(retrieveKnowledge({ opening: 'Pinsk Variation' })).toEqual([]);
    expect(retrieveKnowledge({ theme: 'material' })).toEqual([]);
  });

  it('falls back to general principles for openings literally named "… Opening"', () => {
    // No dedicated doc exists for Van't Kruijs — the 'opening' tag catches it.
    const fallback = retrieveKnowledge({ opening: "Van't Kruijs Opening" });
    expect(fallback.map((d) => d.id)).toEqual(['principles/opening_principles']);

    // A covered "… Opening" gets its own doc first, principles alongside.
    const english = retrieveKnowledge({ opening: 'English Opening' });
    expect(english.map((d) => d.id)).toEqual(['openings/english', 'principles/opening_principles']);
  });
});

describe('queryFromContext', () => {
  it('uses the opening for opening tasks and opening-phase moves', () => {
    const context = { game: { opening: { name: 'Sicilian Defense' } } };
    expect(queryFromContext(context, 'opening').opening).toBe('Sicilian Defense');
    expect(queryFromContext(context, 'coach').opening).toBe('Sicilian Defense');
  });

  it('switches to the phase theme outside the opening', () => {
    const query = queryFromContext(
      {
        game: { opening: { name: 'Sicilian Defense' } },
        move: { san: 'Kd4', phase: 'endgame' },
      },
      'coach',
    );
    expect(query.opening).toBeUndefined();
    expect(query.theme).toBe('endgame');
  });

  it('carries classification and motifs only for real errors', () => {
    const blunder = queryFromContext(
      { move: { san: 'Nf6', classification: 'blunder', motifs: ['hung_piece'] } },
      'mistake',
    );
    expect(blunder.mistake).toBe('blunder');
    expect(blunder.motifs).toEqual(['hung_piece']);

    const fine = queryFromContext({ move: { san: 'Nf3', classification: 'good' } }, 'coach');
    expect(fine.mistake).toBeUndefined();
  });
});
