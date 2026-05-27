import { Chess, Square } from 'chess.js';
import { useMemo, useState, ReactNode } from 'react';

interface ChessBoardProps {
  fen: string;
  squareSize?: number;          // pixels per square — default 60, reduce for mobile
  onPositionChange?: (fen: string) => void;
  interactive?: boolean;
  highlightSquares?: string[];
  arrowOverlay?: ReactNode;
}

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'];

export function ChessBoard({
  fen,
  squareSize = 60,
  onPositionChange,
  interactive = false,
  highlightSquares = [],
  arrowOverlay,
}: ChessBoardProps) {
  // Derive the Chess instance from the FEN prop — no mutable state that silently lags behind
  const chess = useMemo(() => {
    const instance = new Chess();
    try {
      instance.load(fen);
    } catch {
      // keep default starting position if FEN is invalid
    }
    return instance;
  }, [fen]);

  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [possibleMoves, setPossibleMoves] = useState<string[]>([]);

  const handleSquareClick = (square: string) => {
    if (!interactive) return;

    if (selectedSquare) {
      const move = chess.move({
        from: selectedSquare,
        to: square,
        promotion: 'q',
      });

      if (move) {
        onPositionChange?.(chess.fen());
        setSelectedSquare(null);
        setPossibleMoves([]);
      } else if (chess.get(square as Square)) {
        const moves = chess.moves({ square: square as Square, verbose: true });
        setSelectedSquare(square);
        setPossibleMoves(moves.map(m => m.to));
      } else {
        setSelectedSquare(null);
        setPossibleMoves([]);
      }
    } else {
      const piece = chess.get(square as Square);
      if (piece) {
        const moves = chess.moves({ square: square as Square, verbose: true });
        setSelectedSquare(square);
        setPossibleMoves(moves.map(m => m.to));
      }
    }
  };

  const getPieceSymbol = (piece: { type: string; color: string } | null) => {
    if (!piece) return null;
    const symbols: Record<string, string> = {
      'wp': '♙', 'wn': '♘', 'wb': '♗', 'wr': '♖', 'wq': '♕', 'wk': '♔',
      'bp': '♟', 'bn': '♞', 'bb': '♝', 'br': '♜', 'bq': '♛', 'bk': '♚',
    };
    return symbols[piece.color + piece.type] || null;
  };

  // Font + dot scale linearly with square size
  const fontSize   = Math.round(squareSize * 0.70);
  const dotSize    = Math.round(squareSize * 0.33);
  const labelSize  = Math.max(8, Math.round(squareSize * 0.167));
  const boardSize  = squareSize * 8;

  return (
    <div style={{ display: 'inline-block', position: 'relative' }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(8, ${squareSize}px)`,
          gridTemplateRows:    `repeat(8, ${squareSize}px)`,
          width:  boardSize,
          height: boardSize,
          position: 'relative',
          border: '1px solid var(--cm-border-subtle)',
          borderRadius: '4px',
          overflow: 'hidden',
          boxShadow: '0 0 0 3px var(--cm-bg-surface), 0 0 0 4px var(--cm-border-subtle), 0 16px 48px rgba(0,0,0,0.4)',
        }}
      >
        {RANKS.map((rank, rankIndex) =>
          FILES.map((file, fileIndex) => {
            const square = `${file}${rank}`;
            const piece = chess.get(square as Square);
            const isLight = (rankIndex + fileIndex) % 2 === 0;
            const isSelected = selectedSquare === square;
            const isPossibleMove = possibleMoves.includes(square);
            const isHighlighted = highlightSquares.includes(square);

            const bgColor = isLight ? 'var(--cm-board-light)' : 'var(--cm-board-dark)';

            return (
              <div
                key={square}
                onClick={() => handleSquareClick(square)}
                style={{
                  width:   squareSize,
                  height:  squareSize,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize,
                  position: 'relative',
                  background: bgColor,
                  cursor: interactive ? 'pointer' : 'default',
                  outline: isSelected
                    ? '3px solid var(--cm-accent)'
                    : isHighlighted
                    ? '3px solid var(--cm-accent-ring)'
                    : 'none',
                  outlineOffset: '-3px',
                  transition: 'outline 0.1s',
                }}
              >
                {isPossibleMove && (
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    pointerEvents: 'none',
                  }}>
                    {piece ? (
                      <div style={{
                        position: 'absolute',
                        inset: 0,
                        border: `3px solid ${isLight ? 'rgba(0,0,0,0.18)' : 'rgba(0,0,0,0.25)'}`,
                        borderRadius: '50%',
                      }} />
                    ) : (
                      <div style={{
                        width:   dotSize,
                        height:  dotSize,
                        borderRadius: '50%',
                        background: isLight ? 'rgba(0,0,0,0.18)' : 'rgba(0,0,0,0.25)',
                      }} />
                    )}
                  </div>
                )}

                {piece && (
                  <span style={{
                    userSelect: 'none',
                    color: piece.color === 'w' ? '#FFFAF0' : '#1A1A1A',
                    filter: piece.color === 'w'
                      ? 'drop-shadow(0 1px 2px rgba(0,0,0,0.6)) drop-shadow(0 0 1px rgba(0,0,0,0.4))'
                      : 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))',
                    lineHeight: 1,
                    zIndex: 1,
                    position: 'relative',
                  }}>
                    {getPieceSymbol(piece)}
                  </span>
                )}

                {fileIndex === 0 && (
                  <span style={{
                    position: 'absolute',
                    left: '3px',
                    top: '2px',
                    fontSize: labelSize,
                    fontWeight: 600,
                    color: isLight ? 'rgba(181,136,99,0.75)' : 'rgba(240,217,181,0.75)',
                    lineHeight: 1,
                    userSelect: 'none',
                  }}>
                    {rank}
                  </span>
                )}

                {rankIndex === 7 && (
                  <span style={{
                    position: 'absolute',
                    right: '3px',
                    bottom: '2px',
                    fontSize: labelSize,
                    fontWeight: 600,
                    color: isLight ? 'rgba(181,136,99,0.75)' : 'rgba(240,217,181,0.75)',
                    lineHeight: 1,
                    userSelect: 'none',
                  }}>
                    {file}
                  </span>
                )}
              </div>
            );
          })
        )}
        {arrowOverlay}
      </div>
    </div>
  );
}
