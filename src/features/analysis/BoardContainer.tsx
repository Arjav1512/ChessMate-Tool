import { useMemo, useState } from 'react';
import { Chess, type Square } from 'chess.js';
import type { Orientation } from '../../stores/analysisStepperStore';

export type Promotion = 'q' | 'r' | 'b' | 'n';

export interface BoardContainerProps {
  fen: string;
  orientation?: Orientation;
  /** Highlight the last move's from/to squares (last-move tint, §6). */
  lastMove?: { from: string; to: string } | null;
  /** Read-only mini variant (e.g. Coach board). */
  mini?: boolean;
  className?: string;
  /**
   * Lichess-style analysis: allow the user to click/drag pieces and play legal
   * moves from the shown position to explore their own lines. When set, the
   * board validates moves with chess.js and calls `onMove` with the chosen move.
   * Off by default so the mini/coach boards stay purely presentational.
   */
  interactive?: boolean;
  onMove?: (from: string, to: string, promotion?: Promotion) => void;
  /** Engine/annotation arrows drawn over the board (e.g. the best move). */
  arrows?: Array<{ from: string; to: string; color?: string }>;
}

/** Centre of a square in the board's 0–8 grid space, honouring orientation. */
function squareCenter(sq: string, orientation: Orientation): { x: number; y: number } {
  const file = sq.charCodeAt(0) - 97; // a → 0
  const rank = Number(sq[1]);          // 1 → 8
  const col = orientation === 'w' ? file : 7 - file;
  const row = orientation === 'w' ? 8 - rank : rank - 1;
  return { x: col + 0.5, y: row + 0.5 };
}

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const;
const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'] as const;

const GLYPH: Record<string, string> = {
  wp: '♙', wn: '♘', wb: '♗', wr: '♖', wq: '♕', wk: '♔',
  bp: '♟', bn: '♞', bb: '♝', br: '♜', bq: '♛', bk: '♚',
};

const PROMO_GLYPH: Record<Promotion, { w: string; b: string; label: string }> = {
  q: { w: '♕', b: '♛', label: 'Queen' },
  r: { w: '♖', b: '♜', label: 'Rook' },
  b: { w: '♗', b: '♝', label: 'Bishop' },
  n: { w: '♘', b: '♞', label: 'Knight' },
};

/**
 * Board (System Design §6 Board Containers, §8): 8×8 token-themed grid,
 * aspect-ratio 1/1 (fluid via container queries), Unicode pieces in
 * --piece-* tones, rank/file coordinates, last-move tint, flip via
 * `orientation`. Conventional — never reinvented (§14.6).
 *
 * With `interactive`, it becomes an analysis board: click a piece (or drag it)
 * to see its legal moves as dots and play one, alternating sides freely like the
 * Lichess analysis board. Promotions prompt a piece picker.
 */
export function BoardContainer({
  fen, orientation = 'w', lastMove, mini = false, className = '',
  interactive = false, onMove, arrows,
}: BoardContainerProps) {
  const chess = useMemo(() => {
    const c = new Chess();
    try { c.load(fen); } catch { /* keep default */ }
    return c;
  }, [fen]);

  const [selected, setSelected] = useState<Square | null>(null);
  const [promotion, setPromotion] = useState<{ from: Square; to: Square } | null>(null);

  const files = orientation === 'w' ? FILES : [...FILES].reverse();
  const ranks = orientation === 'w' ? RANKS : [...RANKS].reverse();

  // Legal destinations for the selected/dragged piece (dots + capture rings).
  const targets = useMemo(() => {
    if (!interactive || !selected) return new Map<string, boolean>(); // sq -> isCapture
    const map = new Map<string, boolean>();
    try {
      for (const m of chess.moves({ square: selected, verbose: true })) {
        map.set(m.to, m.captured != null || m.flags.includes('e'));
      }
    } catch { /* no legal moves */ }
    return map;
  }, [interactive, selected, chess]);

  const canPick = (sq: Square) => {
    const p = chess.get(sq);
    return !!p && p.color === chess.turn();
  };

  /** Attempt from→to; open the promotion picker when the move needs a piece. */
  const tryMove = (from: Square, to: Square) => {
    if (!onMove) return;
    let needsPromo = false;
    try {
      needsPromo = chess.moves({ square: from, verbose: true })
        .some((m) => m.to === to && m.promotion);
    } catch { /* ignore */ }
    if (needsPromo) { setPromotion({ from, to }); setSelected(null); return; }
    onMove(from, to);
    setSelected(null);
  };

  const handleSquareClick = (sq: Square) => {
    if (!interactive || promotion) return;
    if (selected) {
      if (targets.has(sq)) { tryMove(selected, sq); return; }
      setSelected(canPick(sq) ? sq : null);
      return;
    }
    if (canPick(sq)) setSelected(sq);
  };

  const finishPromotion = (piece: Promotion) => {
    if (promotion && onMove) onMove(promotion.from, promotion.to, piece);
    setPromotion(null);
  };

  const promoColor = promotion ? (chess.get(promotion.from)?.color ?? 'w') : 'w';

  return (
    <div
      className={`iv-board ${mini ? 'iv-board--mini' : ''} ${interactive ? 'iv-board--interactive' : ''} ${className}`}
      onDragOver={interactive ? (e) => e.preventDefault() : undefined}
    >
      {ranks.map((rank, r) =>
        files.map((file, f) => {
          const square = `${file}${rank}` as Square;
          const piece = chess.get(square);
          const isLight = (r + f) % 2 === 0;
          const isLastMove = !!lastMove && (lastMove.from === square || lastMove.to === square);
          const isSelected = interactive && selected === square;
          const isTarget = interactive && targets.has(square);
          const isCapture = isTarget && targets.get(square);
          return (
            <div
              key={square}
              className={
                `iv-board__sq ${isLight ? 'iv-board__sq--light' : 'iv-board__sq--dark'}` +
                `${isLastMove ? ' iv-board__sq--last' : ''}` +
                `${isSelected ? ' iv-board__sq--selected' : ''}` +
                `${isTarget && !isCapture ? ' iv-board__sq--target' : ''}` +
                `${isCapture ? ' iv-board__sq--capture' : ''}`
              }
              onClick={interactive ? () => handleSquareClick(square) : undefined}
              onDrop={interactive ? (e) => {
                e.preventDefault();
                const from = e.dataTransfer.getData('text/plain') as Square;
                if (from) tryMove(from, square);
                setSelected(null);
              } : undefined}
            >
              {piece && (
                <span
                  className={`iv-board__piece iv-board__piece--${piece.color}`}
                  aria-hidden
                  draggable={interactive && piece.color === chess.turn()}
                  onDragStart={interactive ? (e) => {
                    e.dataTransfer.setData('text/plain', square);
                    e.dataTransfer.effectAllowed = 'move';
                    setSelected(square);
                  } : undefined}
                  onDragEnd={interactive ? () => setSelected(null) : undefined}
                >
                  {GLYPH[piece.color + piece.type]}
                </span>
              )}
              {f === 0 && <span className="iv-board__coord iv-board__coord--rank" aria-hidden>{rank}</span>}
              {r === 7 && <span className="iv-board__coord iv-board__coord--file" aria-hidden>{file}</span>}
            </div>
          );
        }),
      )}

      {arrows && arrows.length > 0 && (
        <svg className="iv-board__arrows" viewBox="0 0 8 8" preserveAspectRatio="none" aria-hidden>
          {arrows.map((a, i) => {
            const p = squareCenter(a.from, orientation);
            const q = squareCenter(a.to, orientation);
            const dx = q.x - p.x, dy = q.y - p.y;
            const len = Math.hypot(dx, dy) || 1;
            const ux = dx / len, uy = dy / len;
            const head = 0.36, halfW = 0.24, width = 0.15;
            const sx = p.x + ux * 0.30, sy = p.y + uy * 0.30;   // start just off the origin
            const ex = q.x - ux * head, ey = q.y - uy * head;    // line meets the head base
            const px = -uy, py = ux;                             // perpendicular
            const color = a.color ?? 'var(--accent)';
            return (
              <g key={i} opacity="0.8">
                <line x1={sx} y1={sy} x2={ex} y2={ey} stroke={color} strokeWidth={width} strokeLinecap="round" />
                <polygon
                  points={`${q.x},${q.y} ${ex + px * halfW},${ey + py * halfW} ${ex - px * halfW},${ey - py * halfW}`}
                  fill={color}
                />
              </g>
            );
          })}
        </svg>
      )}

      {promotion && (
        <div className="iv-board__promo" role="dialog" aria-label="Choose promotion piece">
          {(['q', 'r', 'b', 'n'] as Promotion[]).map((p) => (
            <button
              key={p}
              type="button"
              className="iv-board__promo-btn"
              onClick={() => finishPromotion(p)}
              aria-label={`Promote to ${PROMO_GLYPH[p].label}`}
            >
              <span className={`iv-board__piece iv-board__piece--${promoColor}`} aria-hidden>
                {PROMO_GLYPH[p][promoColor]}
              </span>
            </button>
          ))}
          <button
            type="button"
            className="iv-board__promo-cancel"
            onClick={() => setPromotion(null)}
            aria-label="Cancel promotion"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
