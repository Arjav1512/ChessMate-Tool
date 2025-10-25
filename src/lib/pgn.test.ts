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
      expect(result.headers.White).toBe('Player1');
      expect(result.headers.Black).toBe('Player2');
      expect(result.headers.Result).toBe('1-0');
      expect(result.headers.Event).toBe('Test Game');
      expect(result.moves).toContain('e4');
      expect(result.moves.length).toBeGreaterThan(0);
      expect(result.fen.length).toBe(result.moves.length + 1);
    });

    it('should parse PGN with default values for missing headers', () => {
      const pgnContent = `1. e4 e5 2. Nf3 1-0`;

      const result = parsePGN(pgnContent);

      expect(result).toBeDefined();
      expect(result.headers.White).toBeUndefined();
      expect(result.headers.Black).toBeUndefined();
      expect(result.headers.Result).toBeUndefined();
      expect(result.moves.length).toBeGreaterThan(0);
    });

    it('should throw error for empty PGN', () => {
      expect(() => parsePGN('')).toThrow(PGNParseError);
      expect(() => parsePGN('')).toThrow('Empty PGN content');
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

    it('should handle single game with result notation', () => {
      const pgnContent = `[Event "Game 1"]
[White "Player1"]
[Black "Player2"]
[Result "1-0"]

1. e4 e5 2. Nf3 Nc6 1-0`;

      const result = parsePGN(pgnContent);

      expect(result).toBeDefined();
      expect(result.headers.Event).toBe('Game 1');
      expect(result.headers.White).toBe('Player1');
      expect(result.headers.Result).toBe('1-0');
    });

    it('should extract date correctly', () => {
      const pgnContent = `[Date "2023.10.15"]
[White "Player1"]
[Black "Player2"]

1. e4 e5 1-0`;

      const result = parsePGN(pgnContent);

      expect(result.headers.Date).toBe('2023.10.15');
    });

    it('should handle PGN with comments', () => {
      const pgnContent = `[Event "Test"]
1. e4 {good move} e5 2. Nf3 1-0`;

      const result = parsePGN(pgnContent);

      expect(result).toBeDefined();
      expect(result.moves).toContain('e4');
      expect(result.moves.length).toBeGreaterThan(0);
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
