import { useMemo } from 'react';
import { Chess, type Square } from 'chess.js';
import type { Orientation } from '../../stores/analysisStepperStore';

export interface BoardContainerProps {
  fen: string;
  orientation?: Orientation;
  /** Highlight the last move's from/to squares (last-move tint, §6). */
  lastMove?: { from: string; to: string } | null;
  /** Read-only mini variant (e.g. Coach board). */
  mini?: boolean;
  className?: string;
}

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const;
const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'] as const;

const GLYPH: Record<string, string> = {
  wp: '♙', wn: '♘', wb: '♗', wr: '♖', wq: '♕', wk: '♔',
  bp: '♟', bn: '♞', bb: '♝', br: '♜', bq: '♛', bk: '♚',
};

/**
 * Board (System Design §6 Board Containers, §8): 8×8 token-themed grid,
 * aspect-ratio 1/1 (fluid via container queries), Unicode pieces in
 * --piece-* tones, rank/file coordinates, last-move tint, flip via
 * `orientation`. Conventional — never reinvented (§14.6).
 */
export function BoardContainer({ fen, orientation = 'w', lastMove, mini = false, className = '' }: BoardContainerProps) {
  const chess = useMemo(() => {
    const c = new Chess();
    try { c.load(fen); } catch { /* keep default */ }
    return c;
  }, [fen]);

  const files = orientation === 'w' ? FILES : [...FILES].reverse();
  const ranks = orientation === 'w' ? RANKS : [...RANKS].reverse();

  return (
    <div className={`iv-board ${mini ? 'iv-board--mini' : ''} ${className}`}>
      {ranks.map((rank, r) =>
        files.map((file, f) => {
          const square = `${file}${rank}`;
          const piece = chess.get(square as Square);
          const isLight = (r + f) % 2 === 0;
          const isLastMove = !!lastMove && (lastMove.from === square || lastMove.to === square);
          return (
            <div
              key={square}
              className={`iv-board__sq ${isLight ? 'iv-board__sq--light' : 'iv-board__sq--dark'} ${isLastMove ? 'iv-board__sq--last' : ''}`}
            >
              {piece && (
                <span className={`iv-board__piece iv-board__piece--${piece.color}`} aria-hidden>
                  {GLYPH[piece.color + piece.type]}
                </span>
              )}
              {f === 0 && <span className="iv-board__coord iv-board__coord--rank" aria-hidden>{rank}</span>}
              {r === 7 && <span className="iv-board__coord iv-board__coord--file" aria-hidden>{file}</span>}
            </div>
          );
        }),
      )}
    </div>
  );
}
