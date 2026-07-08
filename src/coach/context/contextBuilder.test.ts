import { describe, expect, it } from 'vitest';
import { buildCoachContext, renderContext } from './contextBuilder';
import type { CoachContext } from './types';

const SICILIAN_PGN = `[Event "Test"]
[Result "1-0"]

1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 1-0`;

describe('buildCoachContext', () => {
  it('derives the opening from the PGN when none is supplied', () => {
    const context = buildCoachContext({ game: { pgn: SICILIAN_PGN } });
    expect(context.game?.opening?.name).toContain('Sicilian');
    expect(context.game?.opening?.eco).toMatch(/^B/);
  });

  it('keeps a caller-supplied opening over derivation', () => {
    const context = buildCoachContext({
      game: { pgn: SICILIAN_PGN, opening: { eco: 'C00', name: 'French Defense' } },
    });
    expect(context.game?.opening?.name).toBe('French Defense');
  });

  it('does not mutate its input', () => {
    const input: CoachContext = { game: { pgn: SICILIAN_PGN } };
    buildCoachContext(input);
    expect(input.game?.opening).toBeUndefined();
  });
});

describe('renderContext', () => {
  it('renders every supplied section as labeled lines', () => {
    const rendered = renderContext({
      game: {
        white: 'Alice',
        black: 'Bob',
        whiteRating: 1500,
        result: '1-0',
        userColor: 'white',
        opening: { eco: 'B20', name: 'Sicilian Defense' },
      },
      fen: 'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
      move: {
        san: 'Nf6',
        moveNumber: 12,
        color: 'black',
        classification: 'blunder',
        cpLoss: 350,
        motifs: ['hung_piece'],
        phase: 'middlegame',
        bestMove: 'Qd4',
        evaluation: { evaluation: '+3.50', isMate: false },
      },
      moveHistory: ['e4', 'c5', 'Nf3'],
      player: {
        rating: 1450,
        accuracy: 78,
        weaknessSummary: 'Known weaknesses: frequently hangs pieces.',
        recentMistakes: ['12...Nf6?? hung a knight'],
        recentGames: ['Loss as Black in the Sicilian'],
      },
      improveQueue: [{ san: 'Nf6', motif: 'hung_piece', phase: 'middlegame' }],
    });

    expect(rendered).toContain('Game: Alice (1500) vs Bob, result 1-0 — the player is White');
    expect(rendered).toContain('Opening: B20 Sicilian Defense');
    expect(rendered).toContain('Position (FEN): rnbqkbnr');
    expect(rendered).toContain('Move under discussion: 12...Nf6 (blunder, lost 350cp); engine preferred Qd4; phase: middlegame; motifs: hung_piece');
    expect(rendered).toContain('Engine evaluation: +3.50');
    expect(rendered).toContain('Moves so far: e4 c5 Nf3');
    expect(rendered).toContain('Player rating: 1450');
    expect(rendered).toContain("Player's average accuracy: 78%");
    expect(rendered).toContain('Known weaknesses: frequently hangs pieces.');
    expect(rendered).toContain('Recent mistake: 12...Nf6?? hung a knight');
    expect(rendered).toContain('Recent game: Loss as Black in the Sicilian');
    expect(rendered).toContain('Positions the player queued for study: Nf6 (hung piece, middlegame)');
  });

  it('omits absent sections instead of fabricating them', () => {
    expect(renderContext({})).toBe('');
    const rendered = renderContext({ fen: '8/8/8/8/8/8/8/8 w - - 0 1' });
    expect(rendered).toBe('Position (FEN): 8/8/8/8/8/8/8/8 w - - 0 1');
  });

  it('caps a long move history at its tail with an ellipsis', () => {
    const history = Array.from({ length: 100 }, (_, i) => `m${i + 1}`);
    const rendered = renderContext({ moveHistory: history });
    expect(rendered).toContain('… ');
    expect(rendered).toContain('m100');
    expect(rendered).not.toContain('m50 ');
  });
});
