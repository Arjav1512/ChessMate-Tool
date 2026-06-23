/**
 * Derive Game Library metadata from the stored PGN + analysis presence — no
 * schema expansion (Phase 7 decision; persisted columns land in Phase 11).
 * Lightweight regex header reads (no move parsing) so it's cheap per row.
 */
import type { Game } from '../supabase';
import type { GameOutcome, GameRowVM, GameStatus } from '../../features/games/types';

/** Read a single PGN header tag, e.g. pgnHeader(pgn, 'Opening'). */
export function pgnHeader(pgn: string, key: string): string | null {
  const m = new RegExp(`\\[${key}\\s+"([^"]*)"\\]`).exec(pgn);
  const v = m?.[1]?.trim();
  return v && v !== '?' && v !== '-' ? v : null;
}

export function deriveOpening(pgn: string): string {
  return pgnHeader(pgn, 'Opening') ?? pgnHeader(pgn, 'ECO') ?? 'Unknown opening';
}

/** Format a PGN TimeControl ("600+5" → "10+5"; "300" → "5+0"; else raw/—). */
export function deriveTimeControl(pgn: string): string {
  const tc = pgnHeader(pgn, 'TimeControl');
  if (!tc) return '—';
  const m = /^(\d+)(?:\+(\d+))?$/.exec(tc);
  if (!m) return tc; // e.g. "40/9000" — keep as-is
  const base = Math.round(Number(m[1]) / 60);
  const inc = m[2] ? Number(m[2]) : 0;
  return `${base}+${inc}`;
}

export function outcomeFor(result: string, userColor: 'white' | 'black' | null): GameOutcome {
  if (result === '1/2-1/2') return 'draw';
  if (result !== '1-0' && result !== '0-1') return 'unknown';
  if (userColor === null) return 'unknown';
  const userWon = (result === '1-0' && userColor === 'white') || (result === '0-1' && userColor === 'black');
  return userWon ? 'win' : 'loss';
}

/** Stable signature for dedupe (no schema change): players + date + result. */
export function gameSignature(g: Pick<Game, 'white_player' | 'black_player' | 'date' | 'result'>): string {
  return `${g.white_player}|${g.black_player}|${g.date}|${g.result}`.toLowerCase();
}

export function toGameRowVM(game: Game, analyzed: boolean): GameRowVM {
  const opponent = game.user_color === 'white' ? game.black_player
    : game.user_color === 'black' ? game.white_player
    : `${game.white_player} vs ${game.black_player}`;
  const status: GameStatus = analyzed ? 'analyzed' : 'pending';
  return {
    id: game.id,
    opponent: opponent || 'Unknown',
    userColor: game.user_color,
    whitePlayer: game.white_player || 'Unknown',
    blackPlayer: game.black_player || 'Unknown',
    result: game.result || '*',
    outcome: outcomeFor(game.result, game.user_color),
    opening: deriveOpening(game.pgn),
    timeControl: deriveTimeControl(game.pgn),
    date: game.date || '—',
    event: game.event || '',
    status,
  };
}

const SECONDS = (tc: string) => {
  const m = /^(\d+)\+(\d+)$/.exec(tc);
  return m ? Number(m[1]) : NaN;
};

/** Coarse time-control buckets for the filter dropdown (derived). */
export function timeControlBucket(tc: string): string {
  const mins = SECONDS(tc);
  if (Number.isNaN(mins)) return 'Other';
  if (mins < 3) return 'Bullet';
  if (mins < 10) return 'Blitz';
  if (mins < 30) return 'Rapid';
  return 'Classical';
}
