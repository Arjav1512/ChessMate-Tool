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

function cleanPGN(pgnText: string): string {
  let cleaned = pgnText.trim();
  cleaned = cleaned.replace(/\r\n/g, '\n');
  cleaned = cleaned.replace(/\r/g, '\n');
  cleaned = cleaned.replace(/\{[^}]*\}/g, '');
  cleaned = cleaned.replace(/;[^\n]*/g, '');
  cleaned = cleaned.replace(/\([^)]*\)/g, '');
  return cleaned;
}

export function parsePGN(pgnText: string): PGNData {
  console.log('=== PGN PARSING START ===');
  console.log('Original length:', pgnText.length);
  console.log('First 500 chars:', pgnText.substring(0, 500));

  const cleanedPGN = cleanPGN(pgnText);
  console.log('Cleaned length:', cleanedPGN.length);
  console.log('Cleaned preview:', cleanedPGN.substring(0, 500));

  const headers: PGNData['headers'] = {};
  const headerRegex = /\[(\w+)\s+"([^"]*)"\]/g;
  let match;

  while ((match = headerRegex.exec(cleanedPGN)) !== null) {
    headers[match[1]] = match[2];
  }
  console.log('Extracted headers:', headers);

  const chess = new Chess();
  let loadSuccess = false;
  let lastError: Error | null = null;

  const attempts = [
    {
      name: 'Attempt 1: Non-strict mode',
      fn: () => {
        chess.loadPgn(cleanedPGN, { strict: false });
      }
    },
    {
      name: 'Attempt 2: Strict mode (default)',
      fn: () => {
        chess.loadPgn(cleanedPGN);
      }
    },
    {
      name: 'Attempt 3: Extract and wrap moves only',
      fn: () => {
        const movesOnly = cleanedPGN
          .split('\n')
          .filter(line => !line.startsWith('[') && line.trim())
          .join(' ')
          .trim();
        console.log('Extracted moves only:', movesOnly.substring(0, 200));
        const wrappedPGN = `[Event "Game"]\n[White "White"]\n[Black "Black"]\n\n${movesOnly}`;
        chess.loadPgn(wrappedPGN, { strict: false });
      }
    }
  ];

  for (const attempt of attempts) {
    try {
      console.log(attempt.name);
      attempt.fn();
      console.log('✓ Success!');
      loadSuccess = true;
      break;
    } catch (error) {
      console.error('✗ Failed:', error);
      lastError = error as Error;
    }
  }

  if (!loadSuccess) {
    console.error('=== ALL ATTEMPTS FAILED ===');
    console.error('Last error:', lastError);
    throw new Error(
      `Could not parse PGN. ${lastError?.message || 'Invalid format'}. Please check the console for details.`
    );
  }

  const history = chess.history();
  console.log('Move history length:', history.length);
  console.log('Moves:', history);

  if (history.length === 0) {
    throw new Error('No valid moves found in PGN file');
  }

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
      console.error('Error replaying move:', moveSan, error);
    }
  }

  console.log('Final moves count:', moves.length);
  console.log('Final FEN positions count:', fenPositions.length);
  console.log('=== PGN PARSING COMPLETE ===');

  return {
    headers,
    moves,
    fen: fenPositions
  };
}

export function validatePGN(pgnText: string): boolean {
  try {
    parsePGN(pgnText);
    return true;
  } catch (error) {
    console.error('PGN validation error:', error);
    return false;
  }
}

export function moveToSAN(from: string, to: string, promotion?: string): string {
  const chess = new Chess();
  try {
    const move = chess.move({ from, to, promotion });
    return move ? move.san : '';
  } catch {
    return '';
  }
}
