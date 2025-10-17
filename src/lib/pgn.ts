/**
 * PGN (Portable Game Notation) Parser
 * Parses chess games in PGN format with robust error handling
 */

import { Chess } from 'chess.js';

export interface PGNData {
  headers: {
    Event?: string;
    Site?: string;
    Date?: string;
    Round?: string;
    White?: string;
    Black?: string;
    Result?: string;
    [key: string]: string | undefined;
  };
  moves: string[];
  fen: string[];
}

export class PGNParseError extends Error {
  constructor(
    message: string,
    public readonly details?: string,
    public readonly suggestion?: string
  ) {
    super(message);
    this.name = 'PGNParseError';
  }
}

/**
 * Clean PGN text by removing comments and variations
 */
function cleanPGN(pgnText: string): string {
  let cleaned = pgnText.trim();

  // Normalize line endings
  cleaned = cleaned.replace(/\r\n/g, '\n');
  cleaned = cleaned.replace(/\r/g, '\n');

  // Remove comments in braces
  cleaned = cleaned.replace(/\{[^}]*\}/g, '');

  // Remove comments starting with semicolon
  cleaned = cleaned.replace(/;[^\n]*/g, '');

  // Remove variations in parentheses
  cleaned = cleaned.replace(/\([^)]*\)/g, '');

  return cleaned;
}

/**
 * Parse PGN text into structured game data
 * @throws {PGNParseError} If PGN cannot be parsed
 */
export function parsePGN(pgnText: string): PGNData {
  if (!pgnText || pgnText.trim().length === 0) {
    throw new PGNParseError(
      'Empty PGN content',
      'The provided PGN text is empty',
      'Please provide a valid PGN file with chess moves'
    );
  }

  const cleanedPGN = cleanPGN(pgnText);

  // Extract headers
  const headers: PGNData['headers'] = {};
  const headerRegex = /\[(\w+)\s+"([^"]*)"\]/g;
  let match;

  while ((match = headerRegex.exec(cleanedPGN)) !== null) {
    headers[match[1]] = match[2];
  }

  // Try multiple parsing strategies
  const chess = new Chess();
  let loadSuccess = false;
  let lastError: Error | null = null;

  const strategies = [
    {
      name: 'Standard (non-strict)',
      fn: () => chess.loadPgn(cleanedPGN, { strict: false }),
    },
    {
      name: 'Standard (strict)',
      fn: () => chess.loadPgn(cleanedPGN),
    },
    {
      name: 'Moves-only extraction',
      fn: () => {
        const movesOnly = cleanedPGN
          .split('\n')
          .filter((line) => !line.startsWith('[') && line.trim())
          .join(' ')
          .trim();

        if (!movesOnly) {
          throw new Error('No moves found after header extraction');
        }

        const wrappedPGN = `[Event "Game"]\n[White "White"]\n[Black "Black"]\n\n${movesOnly}`;
        chess.loadPgn(wrappedPGN, { strict: false });
      },
    },
  ];

  for (const strategy of strategies) {
    try {
      strategy.fn();
      loadSuccess = true;
      break;
    } catch (error) {
      lastError = error as Error;
    }
  }

  if (!loadSuccess) {
    throw new PGNParseError(
      'Failed to parse PGN',
      lastError?.message || 'Invalid PGN format',
      'Ensure the PGN contains valid chess moves in standard notation (e.g., 1. e4 e5 2. Nf3 Nc6)'
    );
  }

  // Extract moves
  const history = chess.history();

  if (history.length === 0) {
    throw new PGNParseError(
      'No valid moves found',
      'The PGN file was parsed but contains no chess moves',
      'Verify that your PGN includes the actual game moves, not just headers'
    );
  }

  // Replay game to get FEN positions
  const moves: string[] = [];
  const fenPositions: string[] = [];

  chess.reset();
  fenPositions.push(chess.fen());

  for (const moveSan of history) {
    try {
      chess.move(moveSan);
      moves.push(moveSan);
      fenPositions.push(chess.fen());
    } catch (error) {
      throw new PGNParseError(
        'Invalid move in sequence',
        `Move "${moveSan}" could not be replayed`,
        'The PGN may be corrupted or contain invalid moves'
      );
    }
  }

  return {
    headers,
    moves,
    fen: fenPositions,
  };
}

/**
 * Validate if a PGN string is parseable
 */
export function validatePGN(pgnText: string): { valid: boolean; error?: string } {
  try {
    parsePGN(pgnText);
    return { valid: true };
  } catch (error) {
    if (error instanceof PGNParseError) {
      return {
        valid: false,
        error: `${error.message}${error.suggestion ? '. ' + error.suggestion : ''}`,
      };
    }
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Unknown validation error',
    };
  }
}

/**
 * Convert UCI move notation to SAN (Standard Algebraic Notation)
 */
export function moveToSAN(from: string, to: string, promotion?: string): string {
  const chess = new Chess();
  try {
    const move = chess.move({ from, to, promotion });
    return move ? move.san : '';
  } catch {
    return '';
  }
}
