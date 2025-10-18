import { describe, it, expect } from 'vitest';
import { parsePGN, PGNParseError } from './pgn';

describe('PGN Parser', () => {
  describe('parsePGN', () => {
    it('should parse a valid PGN with moves', () => {
      const pgnContent = `[Event "Test Game"]
[White "Player1"]
[Black "Player2"]
[Result "1-0"]

1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 1-0`;

      const result = parsePGN(pgnContent);

      expect(result).toBeDefined();
      expect(result.white_player).toBe('Player1');
      expect(result.black_player).toBe('Player2');
      expect(result.result).toBe('1-0');
      expect(result.event).toBe('Test Game');
      expect(result.pgn_text).toContain('e4');
    });

    it('should parse PGN with default values for missing headers', () => {
      const pgnContent = `1. e4 e5 2. Nf3 1-0`;

      const result = parsePGN(pgnContent);

      expect(result).toBeDefined();
      expect(result.white_player).toBe('Unknown');
      expect(result.black_player).toBe('Unknown');
      expect(result.result).toBe('*');
    });

    it('should throw error for empty PGN', () => {
      expect(() => parsePGN('')).toThrow(PGNParseError);
      expect(() => parsePGN('')).toThrow('Empty or invalid PGN content');
    });

    it('should throw error for PGN with only whitespace', () => {
      expect(() => parsePGN('   \n  \t  ')).toThrow(PGNParseError);
    });

    it('should throw error for PGN with headers but no moves', () => {
      const pgnContent = `[Event "Test"]
[White "Player1"]
[Black "Player2"]`;

      expect(() => parsePGN(pgnContent)).toThrow(PGNParseError);
      expect(() => parsePGN(pgnContent)).toThrow('No valid moves found');
    });

    it('should handle multiple games and return first', () => {
      const pgnContent = `[Event "Game 1"]
1. e4 e5 1-0

[Event "Game 2"]
1. d4 d5 0-1`;

      const result = parsePGN(pgnContent);

      expect(result).toBeDefined();
      expect(result.event).toBe('Game 1');
    });

    it('should extract date correctly', () => {
      const pgnContent = `[Date "2023.10.15"]
[White "Player1"]
[Black "Player2"]

1. e4 e5 1-0`;

      const result = parsePGN(pgnContent);

      expect(result.date).toBe('2023.10.15');
    });

    it('should handle PGN with comments', () => {
      const pgnContent = `[Event "Test"]
1. e4 {good move} e5 2. Nf3 1-0`;

      const result = parsePGN(pgnContent);

      expect(result).toBeDefined();
      expect(result.pgn_text).toContain('e4');
    });

    it('should handle PGN with variations', () => {
      const pgnContent = `[Event "Test"]
1. e4 e5 (1... c5) 2. Nf3 1-0`;

      const result = parsePGN(pgnContent);

      expect(result).toBeDefined();
    });
  });

  describe('PGNParseError', () => {
    it('should create error with message and details', () => {
      const error = new PGNParseError(
        'Test error',
        'Error details',
        'Try this suggestion'
      );

      expect(error.message).toBe('Test error');
      expect(error.details).toBe('Error details');
      expect(error.suggestion).toBe('Try this suggestion');
      expect(error.name).toBe('PGNParseError');
    });

    it('should work without details and suggestion', () => {
      const error = new PGNParseError('Simple error');

      expect(error.message).toBe('Simple error');
      expect(error.details).toBeUndefined();
      expect(error.suggestion).toBeUndefined();
    });
  });
});
