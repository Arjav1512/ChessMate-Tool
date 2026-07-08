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

  it('prioritizes opening > theme > mistake > motif and respects the limit', () => {
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
