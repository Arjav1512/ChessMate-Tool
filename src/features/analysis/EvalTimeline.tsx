import { useId } from 'react';
import type { AnalysisMoveVM } from './types';

export interface EvalTimelineProps {
  moves: AnalysisMoveVM[];
  currentPly: number;          // 0 = start
  turningPoints: number[];
  onSeek: (ply: number) => void;
}

/**
 * Eval timeline (§8): game-length sparkline with a dashed current-move playhead
 * + accent dot, turning-point markers, and prev/next jumps between the biggest
 * eval swings. role="img" + aria-label summarize the trend (§11).
 */
export function EvalTimeline({ moves, currentPly, turningPoints, onSeek }: EvalTimelineProps) {
  const gid = useId();
  const W = 600, H = 64, mid = H / 2;
  const n = moves.length;
  const clamp = (cp: number) => Math.max(-600, Math.min(600, cp));
  const x = (ply: number) => (n <= 1 ? 0 : (ply / n) * W);
  const y = (cp: number) => mid - (clamp(cp) / 600) * (mid - 4);

  // Plot each move's eval at x(ply) so the position-after-move aligns with the
  // playhead (which is at x(currentPly)).
  const pts = moves
    .filter((m) => m.evalCp != null)
    .map((m) => `${x(m.ply).toFixed(1)},${y(m.evalCp as number).toFixed(1)}`);
  const line = pts.length ? `M${pts.join(' L')}` : '';
  const curX = x(currentPly);
  const curMove = currentPly > 0 ? moves[currentPly - 1] : null;

  const sortedTP = [...turningPoints].sort((a, b) => a - b);
  const nextTP = sortedTP.find((p) => p > currentPly);
  const prevTP = [...sortedTP].reverse().find((p) => p < currentPly);

  return (
    <div className="iv-aw__timeline">
      <div className="iv-aw__timeline-head">
        <span className="iv-label" style={{ color: 'var(--text-low)' }}>Eval timeline</span>
        <span className="iv-aw__timeline-move">{curMove ? curMove.san : 'start'}</span>
        <div className="iv-aw__timeline-tp">
          <button className="iv-aw__tp-btn" disabled={prevTP == null} onClick={() => prevTP != null && onSeek(prevTP)} aria-label="Previous turning point">◆ ‹</button>
          <button className="iv-aw__tp-btn" disabled={nextTP == null} onClick={() => nextTP != null && onSeek(nextTP)} aria-label="Next turning point">› ◆</button>
        </div>
      </div>
      <svg
        width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none"
        role="img"
        aria-label={`Evaluation timeline across ${n} moves; ${turningPoints.length} turning points; currently at move ${currentPly}`}
        onClick={(e) => {
          const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
          const ply = Math.round(((e.clientX - rect.left) / rect.width) * n);
          onSeek(Math.max(0, Math.min(n, ply)));
        }}
        style={{ cursor: 'pointer' }}
      >
        <line x1={0} y1={mid} x2={W} y2={mid} stroke="var(--hairline)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
        {line && <path d={line} fill="none" stroke="var(--accent)" strokeWidth={2} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />}
        {/* turning-point markers */}
        {sortedTP.map((p) => (
          <circle key={p} cx={x(p)} cy={y(moves[p - 1]?.evalCp ?? 0)} r={3} fill="var(--mq-blunder)" />
        ))}
        {/* dashed playhead + current dot */}
        <line x1={curX} y1={0} x2={curX} y2={H} stroke="var(--accent)" strokeWidth={1} strokeDasharray="3 3" vectorEffect="non-scaling-stroke" opacity={0.7} />
        {curMove?.evalCp != null && <circle cx={curX} cy={y(curMove.evalCp)} r={4} fill="var(--accent-bright)" stroke="var(--accent)" strokeWidth={1.5} />}
        <defs><clipPath id={`c-${gid}`}><rect width={W} height={H} /></clipPath></defs>
      </svg>
    </div>
  );
}
