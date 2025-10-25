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
    <div className="inline-block" style={{ position: 'relative' }}>
      <div className="grid grid-cols-8 gap-0 border-4 border-slate-700 rounded-lg overflow-hidden shadow-2xl" style={{ position: 'relative' }}>
        {RANKS.map((rank, rankIndex) =>
          FILES.map((file, fileIndex) => {
            const square = `${file}${rank}`;
            const piece = chess.get(square as Square);
            const isLight = (rankIndex + fileIndex) % 2 === 0;
            const isSelected = selectedSquare === square;
            const isPossibleMove = possibleMoves.includes(square);
            const isHighlighted = highlightSquares.includes(square);

            return (
              <div
                key={square}
                onClick={() => handleSquareClick(square)}
                className={`
                  aspect-square flex items-center justify-center text-5xl relative
                  ${isLight ? 'bg-slate-200' : 'bg-slate-400'}
                  ${interactive ? 'cursor-pointer hover:opacity-80' : ''}
                  ${isSelected ? 'ring-4 ring-blue-500 ring-inset' : ''}
                  ${isHighlighted ? 'ring-4 ring-yellow-400 ring-inset' : ''}
                  transition-all
                `}
              >
                {isPossibleMove && (
                  <div
                    className={`absolute inset-0 flex items-center justify-center ${
                      piece ? 'opacity-0 hover:opacity-100' : ''
                    }`}
                  >
                    <div className="w-4 h-4 bg-green-500 rounded-full opacity-40"></div>
                  </div>
                )}
                {piece && (
                  <span
                    className={`select-none ${piece.color === 'w' ? 'text-white drop-shadow-lg' : 'text-slate-900'}`}
                    style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}
                  >
                    {getPieceSymbol(piece)}
                  </span>
                )}
                {fileIndex === 0 && (
                  <span className="absolute left-1 top-1 text-xs font-semibold opacity-40">
                    {rank}
                  </span>
                )}
                {rankIndex === 7 && (
                  <span className="absolute right-1 bottom-1 text-xs font-semibold opacity-40">
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
