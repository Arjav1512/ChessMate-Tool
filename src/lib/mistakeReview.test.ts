import { describe, it, expect } from 'vitest';
import { buildMistakeReview, type MistakeInput } from './mistakeReview';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

function mk(p: Partial<MistakeInput> & { cpLoss: number }): MistakeInput {
  return {
    gameId: 'g',
    fen: START,
    san: 'Nf3',
    bestMove: 'g1f3',
    classification: 'blunder',
    phase: 'middlegame',
    motifs: [],
    moveNumber: 10,
    color: 'white',
    ...p,
  };
}

describe('buildMistakeReview', () => {
  it('ranks higher centipawn loss first, all else equal', () => {
    const cards = buildMistakeReview([
      mk({ cpLoss: 150 }),
      mk({ cpLoss: 400 }),
      mk({ cpLoss: 250 }),
    ]);
    expect(cards.map((c) => c.cpLoss)).toEqual([400, 250, 150]);
  });

  it('weights motif importance above raw severity', () => {
    const cards = buildMistakeReview([
      mk({ cpLoss: 300, motifs: [] }),                 // 300
      mk({ cpLoss: 120, motifs: ['allowed_mate'] }),   // 120 + 3*150 = 570
    ]);
    expect(cards[0].motifs).toContain('allowed_mate');
  });

  it('factors recurrence (a motif seen across many mistakes ranks up)', () => {
    const recurring = Array.from({ length: 6 }, () => mk({ cpLoss: 200, motifs: ['hung_piece'] }));
    const oneOff = mk({ cpLoss: 260, motifs: ['major_tactical_blunder'] });
    const cards = buildMistakeReview([oneOff, ...recurring]);
    // hung_piece recurs 6× (2*150 + min(6,10)*30 = 480 → 200+480=680) > oneOff (260+150=410)
    expect(cards[0].motifs).toContain('hung_piece');
  });

  it('filters by phase', () => {
    const cards = buildMistakeReview([
      mk({ cpLoss: 200, phase: 'opening' }),
      mk({ cpLoss: 300, phase: 'endgame' }),
    ], { phase: 'endgame' });
    expect(cards).toHaveLength(1);
    expect(cards[0].phase).toBe('endgame');
  });

  it('filters by motif', () => {
    const cards = buildMistakeReview([
      mk({ cpLoss: 200, motifs: ['hung_piece'] }),
      mk({ cpLoss: 300, motifs: ['missed_mate'] }),
    ], { motif: 'missed_mate' });
    expect(cards).toHaveLength(1);
    expect(cards[0].motifs).toContain('missed_mate');
  });

  it('caps the feed at the limit', () => {
    const many = Array.from({ length: 50 }, (_, i) => mk({ cpLoss: 100 + i }));
    expect(buildMistakeReview(many, {}, 24)).toHaveLength(24);
  });

  it('converts the best move to SAN for display', () => {
    const [card] = buildMistakeReview([mk({ cpLoss: 200, fen: START, bestMove: 'e2e4' })]);
    expect(card.bestMoveSan).toBe('e4');
  });
});
