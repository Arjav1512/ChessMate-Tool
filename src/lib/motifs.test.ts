import { describe, it, expect } from 'vitest';
import { detectMotifs, type MotifInput } from './motifs';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
// White to move, Black just played 1...d5 → exd5 is a legal capture.
const AFTER_1E4_D5 = 'rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq d6 0 2';
const AFTER_1E4 = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1';

function input(p: Partial<MotifInput> & Pick<MotifInput, 'evalCpBefore' | 'evalCpAfter' | 'classification'>): MotifInput {
  return {
    fenBefore: START,
    san: 'Nf3',
    bestMove: 'g1f3',
    isWhiteMove: true,
    ...p,
  };
}

describe('detectMotifs', () => {
  it('tags a quiet material-losing blunder as hung_piece (+ major blunder)', () => {
    const m = detectMotifs(input({ evalCpBefore: 50, evalCpAfter: -250, classification: 'blunder' }));
    expect(m).toContain('hung_piece');
    expect(m).toContain('major_tactical_blunder');
    expect(m).not.toContain('allowed_material_loss');
  });

  it('tags a losing capture/exchange as allowed_material_loss', () => {
    const m = detectMotifs(input({
      fenBefore: AFTER_1E4_D5, san: 'exd5', bestMove: 'g1f3',
      evalCpBefore: 30, evalCpAfter: -300, classification: 'blunder',
    }));
    expect(m).toContain('allowed_material_loss');
    expect(m).not.toContain('hung_piece');
  });

  it('tags missed_material_gain when the engine best move was a capture', () => {
    const m = detectMotifs(input({
      fenBefore: AFTER_1E4_D5, san: 'Nf3', bestMove: 'e4d5', // exd5 in UCI
      evalCpBefore: 60, evalCpAfter: -220, classification: 'blunder',
    }));
    expect(m).toContain('missed_material_gain');
  });

  it('tags allowed_mate when the move walks into a forced mate', () => {
    const m = detectMotifs(input({ evalCpBefore: 0, evalCpAfter: -10000, classification: 'blunder' }));
    expect(m).toContain('allowed_mate');
    // mate scores suppress material motifs
    expect(m).not.toContain('hung_piece');
  });

  it('tags missed_mate when a forced mate was available and not played', () => {
    const m = detectMotifs(input({ evalCpBefore: 10000, evalCpAfter: 200, classification: 'mistake' }));
    expect(m).toContain('missed_mate');
  });

  it('handles the black side’s perspective', () => {
    // Black to move; White-POV eval rises (good for White) ⇒ Black worsened.
    const m = detectMotifs(input({
      fenBefore: AFTER_1E4, san: 'Nf6', isWhiteMove: false,
      evalCpBefore: -50, evalCpAfter: 300, classification: 'blunder',
    }));
    expect(m).toContain('hung_piece');
  });

  it('returns no motifs for a clean move', () => {
    expect(detectMotifs(input({ evalCpBefore: 20, evalCpAfter: 25, classification: 'good' }))).toEqual([]);
  });

  it('does not tag material motifs for small inaccuracies', () => {
    const m = detectMotifs(input({ evalCpBefore: 30, evalCpAfter: -60, classification: 'inaccuracy' }));
    expect(m).toEqual([]);
  });
});
