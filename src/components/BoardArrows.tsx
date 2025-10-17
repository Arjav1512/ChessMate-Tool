import { useEffect, useRef } from 'react';

interface Arrow {
  from: string;
  to: string;
  opacity: number;
  color: string;
}

interface BoardArrowsProps {
  arrows: Arrow[];
  squareSize: number;
}

export function BoardArrows({ arrows, squareSize }: BoardArrowsProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    arrows.forEach((arrow) => {
      drawArrow(ctx, arrow, squareSize);
    });
  }, [arrows, squareSize]);

  const squareToCoords = (square: string): { x: number; y: number } => {
    const file = square.charCodeAt(0) - 'a'.charCodeAt(0);
    const rank = 8 - parseInt(square[1]);
    return {
      x: file * squareSize + squareSize / 2,
      y: rank * squareSize + squareSize / 2
    };
  };

  const drawArrow = (ctx: CanvasRenderingContext2D, arrow: Arrow, size: number) => {
    const from = squareToCoords(arrow.from);
    const to = squareToCoords(arrow.to);

    const headLength = size * 0.4;
    const headWidth = size * 0.35;
    const bodyWidth = size * 0.15;

    const angle = Math.atan2(to.y - from.y, to.x - from.x);
    const distance = Math.sqrt(Math.pow(to.x - from.x, 2) + Math.pow(to.y - from.y, 2));

    const shortenBy = size * 0.25;
    const newDistance = distance - shortenBy * 2;

    const startX = from.x + Math.cos(angle) * shortenBy;
    const startY = from.y + Math.sin(angle) * shortenBy;
    const endX = startX + Math.cos(angle) * newDistance;
    const endY = startY + Math.sin(angle) * newDistance;

    ctx.globalAlpha = arrow.opacity;
    ctx.fillStyle = arrow.color;
    ctx.strokeStyle = arrow.color;
    ctx.lineWidth = 2;

    ctx.beginPath();

    const perpAngle = angle + Math.PI / 2;
    ctx.moveTo(
      startX + Math.cos(perpAngle) * bodyWidth / 2,
      startY + Math.sin(perpAngle) * bodyWidth / 2
    );
    ctx.lineTo(
      startX - Math.cos(perpAngle) * bodyWidth / 2,
      startY - Math.sin(perpAngle) * bodyWidth / 2
    );

    const arrowBaseX = endX - Math.cos(angle) * headLength;
    const arrowBaseY = endY - Math.sin(angle) * headLength;

    ctx.lineTo(
      arrowBaseX - Math.cos(perpAngle) * bodyWidth / 2,
      arrowBaseY - Math.sin(perpAngle) * bodyWidth / 2
    );
    ctx.lineTo(
      arrowBaseX - Math.cos(perpAngle) * headWidth / 2,
      arrowBaseY - Math.sin(perpAngle) * headWidth / 2
    );

    ctx.lineTo(endX, endY);

    ctx.lineTo(
      arrowBaseX + Math.cos(perpAngle) * headWidth / 2,
      arrowBaseY + Math.sin(perpAngle) * headWidth / 2
    );
    ctx.lineTo(
      arrowBaseX + Math.cos(perpAngle) * bodyWidth / 2,
      arrowBaseY + Math.sin(perpAngle) * bodyWidth / 2
    );

    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.globalAlpha = 1.0;
  };

  return (
    <canvas
      ref={canvasRef}
      width={squareSize * 8}
      height={squareSize * 8}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        pointerEvents: 'none',
        zIndex: 10
      }}
    />
  );
}
