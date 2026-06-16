/// <reference lib="webworker" />

// Parses a PGN blob containing one or many games. Heavy chess.js work
// runs off the main thread so the UI stays interactive on large imports.
//
// Protocol:
//   in : { type: 'parse', text: string }
//   out: { type: 'progress', done: number, total: number }
//   out: { type: 'done', games: ParsedGame[], skipped: number,
//          firstError?: string }
//   out: { type: 'error', message: string }   (fatal)

import { parsePGN, splitPGN, PGNParseError } from '../lib/pgn';

export interface ParsedGame {
  pgnText: string;
  headers: {
    White?: string;
    Black?: string;
    Result?: string;
    Date?: string;
    Event?: string;
  };
  moveCount: number;
}

interface InMessage {
  type: 'parse';
  text: string;
}

self.onmessage = (e: MessageEvent<InMessage>) => {
  if (e.data?.type !== 'parse') return;
  const text = e.data.text;

  try {
    const gameTexts = splitPGN(text);
    const games: ParsedGame[] = [];
    let firstError: string | null = null;
    const total = gameTexts.length;

    for (let i = 0; i < total; i++) {
      const gameText = gameTexts[i];
      try {
        const data = parsePGN(gameText);
        if (data.moves.length > 0) {
          games.push({
            pgnText: gameText,
            headers: {
              White: data.headers.White,
              Black: data.headers.Black,
              Result: data.headers.Result,
              Date: data.headers.Date,
              Event: data.headers.Event,
            },
            moveCount: data.moves.length,
          });
        }
      } catch (parseError) {
        if (!firstError) {
          firstError = parseError instanceof PGNParseError
            ? `${parseError.message}. ${parseError.suggestion || ''}`
            : 'One or more games could not be parsed.';
        }
      }

      // Throttle progress messages — every 5 games is plenty for the UI.
      if (i === total - 1 || i % 5 === 0) {
        (self as DedicatedWorkerGlobalScope).postMessage({
          type: 'progress',
          done: i + 1,
          total,
        });
      }
    }

    const skipped = total - games.length;
    (self as DedicatedWorkerGlobalScope).postMessage({
      type: 'done',
      games,
      skipped,
      firstError: firstError ?? undefined,
    });
  } catch (err) {
    (self as DedicatedWorkerGlobalScope).postMessage({
      type: 'error',
      message: err instanceof Error ? err.message : 'Unknown parser error',
    });
  }
};
