import { Chess, Square } from 'chess.js';
import { useEffect, useState, ReactNode } from 'react';

interface ChessBoardProps {
  fen: string;
  onPositionChange?: (fen: string) => void;
  interactive?: boolean;
  highlightSquares?: string[];
  arrowOverlay?: ReactNode;
}

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'];

export function ChessBoard({ fen, onPositionChange, interactive = false, highlightSquares = [], arrowOverlay }: ChessBoardProps) {
  const [chess] = useState(() => new Chess(fen));
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [possibleMoves, setPossibleMoves] = useState<string[]>([]);

  useEffect(() => {
    try {
      chess.load(fen);
    } catch (error) {
      console.error('Invalid FEN:', error);
    }
  }, [fen, chess]);

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

  return (
    <div style={{ display: 'inline-block', position: 'relative' }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(8, 1fr)',
          gridTemplateRows: 'repeat(8, 1fr)',
          position: 'relative',
          border: '2px solid var(--cm-border-default)',
          borderRadius: '4px',
          overflow: 'hidden',
          boxShadow: '0 0 0 1px var(--cm-border-subtle), 0 12px 40px rgba(0,0,0,0.35)',
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

            const bgColor = isLight ? '#F0D9B5' : '#B58863';

            return (
              <div
                key={square}
                onClick={() => handleSquareClick(square)}
                style={{
                  width: '60px',
                  height: '60px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '42px',
                  position: 'relative',
                  background: bgColor,
                  cursor: interactive ? 'pointer' : 'default',
                  outline: isSelected ? '3px solid var(--cm-accent)' : isHighlighted ? '3px solid rgba(240,168,64,0.7)' : 'none',
                  outlineOffset: '-3px',
                  transition: 'outline 0.1s',
                }}
              >
                {isPossibleMove && (
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      pointerEvents: 'none',
                    }}
                  >
                    {piece ? (
                      <div style={{
                        position: 'absolute',
                        inset: 0,
                        border: `3px solid ${isLight ? 'rgba(0,0,0,0.18)' : 'rgba(0,0,0,0.25)'}`,
                        borderRadius: '50%',
                      }} />
                    ) : (
                      <div style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        background: isLight ? 'rgba(0,0,0,0.18)' : 'rgba(0,0,0,0.25)',
                      }} />
                    )}
                  </div>
                )}

                {piece && (
                  <span
                    style={{
                      userSelect: 'none',
                      color: piece.color === 'w' ? '#FFFAF0' : '#1A1A1A',
                      filter: piece.color === 'w'
                        ? 'drop-shadow(0 1px 2px rgba(0,0,0,0.6)) drop-shadow(0 0 1px rgba(0,0,0,0.4))'
                        : 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))',
                      lineHeight: 1,
                      zIndex: 1,
                      position: 'relative',
                    }}
                  >
                    {getPieceSymbol(piece)}
                  </span>
                )}

                {fileIndex === 0 && (
                  <span style={{
                    position: 'absolute',
                    left: '3px',
                    top: '2px',
                    fontSize: '10px',
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
                    fontSize: '10px',
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
