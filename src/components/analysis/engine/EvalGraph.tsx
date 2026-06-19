/**
 * EvalGraph — SVG sparkline of the evaluation across all game positions.
 * Presentational; extracted verbatim from EnginePanel so it can live in the
 * v2 Insights tab. Click-to-seek preserved.
 */

interface EvalGraphProps {
  evals: number[];          // one per position (0 = start, 1 = after move 1 …)
  currentIndex: number;
  onSeek?: (index: number) => void;
}

export function EvalGraph({ evals, currentIndex, onSeek }: EvalGraphProps) {
  const W = 260, H = 72;
  if (evals.length < 2) return null;

  const clamp = (v: number) => Math.max(-6, Math.min(6, v));
  const yPct = (v: number) => 50 - (clamp(v) / 6) * 50; // percent from top

  const pts = evals.map((e, i) => ({
    x: (i / (evals.length - 1)) * W,
    y: (yPct(e) / 100) * H,
    e,
  }));

  const midY = H / 2;
  let whitePath = `M0,${midY}`;
  pts.forEach(({ x, y }) => {
    whitePath += ` L${x},${Math.min(y, midY)}`;
  });
  whitePath += ` L${W},${midY} Z`;

  let blackPath = `M0,${midY}`;
  pts.forEach(({ x, y }) => {
    blackPath += ` L${x},${Math.max(y, midY)}`;
  });
  blackPath += ` L${W},${midY} Z`;

  const linePath = pts.map(({ x, y }, i) => `${i === 0 ? 'M' : 'L'}${x},${y}`).join(' ');

  const curX = currentIndex < evals.length
    ? (currentIndex / (evals.length - 1)) * W
    : W;

  return (
    <svg
      width={W}
      height={H}
      style={{ display: 'block', cursor: onSeek ? 'pointer' : 'default', borderRadius: '4px', overflow: 'hidden' }}
      onClick={onSeek ? (e) => {
        const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
        const relX = e.clientX - rect.left;
        const idx = Math.round((relX / rect.width) * (evals.length - 1));
        onSeek(Math.max(0, Math.min(evals.length - 1, idx)));
      } : undefined}
    >
      <rect x={0} y={0} width={W} height={H} fill="var(--cm-bg-elevated)" />
      <path d={blackPath} fill="rgba(20,20,30,0.85)" />
      <path d={whitePath} fill="rgba(230,230,240,0.85)" />
      <path d={linePath} fill="none" stroke="rgba(100,200,120,0.6)" strokeWidth={1.2} />
      <line x1={0} y1={midY} x2={W} y2={midY} stroke="var(--cm-border-subtle)" strokeWidth={0.8} />
      <line x1={curX} y1={0} x2={curX} y2={H} stroke="var(--cm-accent)" strokeWidth={1.5} opacity={0.8} />
    </svg>
  );
}
