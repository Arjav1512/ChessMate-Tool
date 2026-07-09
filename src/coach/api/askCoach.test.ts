import { describe, expect, it } from 'vitest';
import { toCoachContext } from './askCoach';

// R1 regression — the adapter must carry every retrieval-relevant field the
// call sites thread. Before Phase 3A it dropped all of them, and production
// retrieval resolved to zero documents (RETRIEVAL_AUDIT.md §0).
describe('toCoachContext (R1 context threading)', () => {
  it('maps the full CoachTab-shaped context through to CoachContext', () => {
    const context = toCoachContext({
      gameInfo: {
        white_player: 'Alice',
        black_player: 'Bob',
        result: '1-0',
        pgn: '1. e4 c5 1-0',
        opening: { eco: 'B20', name: 'Sicilian Defense' },
        whiteRating: 1600,
        blackRating: 1450,
        userColor: 'black',
      },
      currentPosition: 'fen-here',
      move: {
        san: 'Nf6',
        moveNumber: 12,
        color: 'black',
        phase: 'middlegame',
        motifs: ['hung_piece'],
        classification: 'blunder',
        cpLoss: 350,
        bestMove: 'Qd4',
      },
      evaluation: { evaluation: '+3.50', isMate: false },
      weaknessSummary: 'Known weaknesses: frequently hangs pieces.',
    });

    expect(context.game).toMatchObject({
      white: 'Alice',
      black: 'Bob',
      pgn: '1. e4 c5 1-0',
      opening: { eco: 'B20', name: 'Sicilian Defense' },
      whiteRating: 1600,
      blackRating: 1450,
      userColor: 'black',
    });
    expect(context.move).toMatchObject({
      san: 'Nf6',
      phase: 'middlegame',
      motifs: ['hung_piece'],
      classification: 'blunder',
      cpLoss: 350,
      bestMove: 'Qd4',
      evaluation: { evaluation: '+3.50', isMate: false },
    });
    expect(context.player?.weaknessSummary).toContain('hangs pieces');
  });

  it("normalizes Ivory MoveQuality onto the classifier taxonomy ('brilliant' → 'best')", () => {
    expect(toCoachContext({ move: { san: 'Qg7', classification: 'brilliant' } }).move?.classification).toBe('best');
    expect(toCoachContext({ move: { san: 'Qg7', classification: 'Mistake' } }).move?.classification).toBe('mistake');
    // Unknown labels are dropped, never guessed.
    expect(toCoachContext({ move: { san: 'Qg7', classification: 'dubious' } }).move?.classification).toBeUndefined();
  });

  it('keeps the pre-3A minimal shape working (evaluation-only move)', () => {
    const context = toCoachContext({
      gameInfo: { white_player: 'A', black_player: 'B', result: '*' },
      currentPosition: 'fen',
      evaluation: { evaluation: '-0.30', isMate: false, bestMove: 'e5' },
    });
    expect(context.move).toEqual({ evaluation: { evaluation: '-0.30', isMate: false, bestMove: 'e5' } } as object);
    expect(context.player).toBeUndefined();
  });

  it('carries an explicit player rating', () => {
    expect(toCoachContext({ playerRating: 1500 }).player?.rating).toBe(1500);
  });
});
