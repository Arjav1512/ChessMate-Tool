import { describe, expect, it } from 'vitest';
import { KNOWLEDGE_BASE } from '../knowledge';
import { queryFromContext, ratingBandOf, retrieveKnowledge } from './retriever';

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

  it('R2: adds the opening fallback theme for opening-phase questions', () => {
    // Known opening, whole-game question → name + fallback.
    const known = queryFromContext({ game: { opening: { name: 'Sicilian Defense' } } }, 'coach');
    expect(known.opening).toBe('Sicilian Defense');
    expect(known.theme).toBe('opening');

    // Opening phase without a recognized opening → fallback still fires.
    const unnamed = queryFromContext({ move: { san: 'e4', phase: 'opening' } }, 'coach');
    expect(unnamed.theme).toBe('opening');

    // Middlegame questions must not drag opening docs in.
    const middlegame = queryFromContext(
      { game: { opening: { name: 'Sicilian Defense' } }, move: { san: 'Nf6', phase: 'middlegame' } },
      'coach',
    );
    expect(middlegame.opening).toBeUndefined();
    expect(middlegame.theme).toBeUndefined();

    // No context at all → no needless principles spam.
    expect(queryFromContext({}, 'coach').theme).toBeUndefined();
  });

  it('R2: closes the Defense-name gap — uncovered openings retrieve principles, never nothing', () => {
    const uncovered = ['Philidor Defense', 'Petrov Defense', 'Dutch Defense', 'Benoni Defense', 'Grünfeld Defense', 'Vienna Game', 'Scotch Game'];
    for (const name of uncovered) {
      const docs = retrieveKnowledge(queryFromContext({ game: { opening: { name } } }, 'coach'));
      expect(docs.map((d) => d.id), name).toEqual(['principles/opening_principles']);
    }
    // Covered openings keep their dedicated doc first, principles alongside.
    const covered = retrieveKnowledge(
      queryFromContext({ game: { opening: { name: 'Sicilian Defense' } } }, 'coach'),
    );
    expect(covered.map((d) => d.id)).toEqual(['openings/sicilian', 'principles/opening_principles']);
  });

  it('R3: maps ratings to deterministic bands', () => {
    expect(ratingBandOf(null)).toBeUndefined();
    expect(ratingBandOf(undefined)).toBeUndefined();
    expect(ratingBandOf(0)).toBeUndefined();
    expect(ratingBandOf(800)).toBe('under 1200');
    expect(ratingBandOf(1199)).toBe('under 1200');
    expect(ratingBandOf(1200)).toBe('intermediate');
    expect(ratingBandOf(1800)).toBe('intermediate');
    expect(ratingBandOf(1801)).toBe('advanced');
    expect(ratingBandOf(2400)).toBe('advanced');
  });

  it('R3: retrieves the band doc, but only into a spare slot', () => {
    // Rating alone (e.g. a general question): the band doc is the answer.
    const bands: Array<[number, string]> = [
      [900, 'rating/improving_under_1200'],
      [1500, 'rating/improving_1200_1800'],
      [2000, 'rating/improving_above_1800'],
    ];
    for (const [rating, docId] of bands) {
      const docs = retrieveKnowledge(
        queryFromContext({ player: { rating }, move: { san: 'Nf3', phase: 'middlegame' } }, 'coach'),
      );
      expect(docs.map((d) => d.id)).toEqual([docId]);
    }
    // With two position-specific matches, the band doc is displaced.
    const full = retrieveKnowledge(
      queryFromContext({ game: { opening: { name: 'Sicilian Defense' } }, player: { rating: 1500 } }, 'coach'),
    );
    expect(full.map((d) => d.id)).toEqual(['openings/sicilian', 'principles/opening_principles']);
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
