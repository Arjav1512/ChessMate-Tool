import { useId } from 'react';

export interface RadarAxis {
  axis: string;
  you: number;   // 0–100
  peers: number; // 0–100
}

export interface RadarChartProps {
  data: RadarAxis[];
  /** Accessible summary; auto-generated from strongest/weakest if omitted. */
  ariaLabel?: string;
}

// Wider-than-tall viewBox so the longest axis labels ("Middlegame", "Positional")
// never clip at the sides (§6 — guarantee horizontal label margin).
const VBW = 420, VBH = 320;
const CX = VBW / 2, CY = VBH / 2;
const R = 104;
const RINGS = [0.25, 0.5, 0.75, 1];

function point(angle: number, radius: number): [number, number] {
  return [CX + radius * Math.cos(angle), CY + radius * Math.sin(angle)];
}

/**
 * Radar / skill-profile chart (System Design §6, §9). 6 axes, concentric rings,
 * "you" polygon (accent) over dashed "peers". Labels sit outside the rings with
 * margin to avoid clipping (§6). role="img" + descriptive aria-label (§11);
 * meaning is never color-only (axis labels + values carry it).
 */
export function RadarChart({ data, ariaLabel }: RadarChartProps) {
  const gid = useId();
  const n = data.length;
  const angleOf = (i: number) => (2 * Math.PI * i) / n - Math.PI / 2;

  const poly = (key: 'you' | 'peers') =>
    data.map((d, i) => point(angleOf(i), (Math.max(0, Math.min(100, d[key])) / 100) * R).join(',')).join(' ');

  const strongest = [...data].sort((a, b) => b.you - a.you)[0];
  const weakest = [...data].sort((a, b) => a.you - b.you)[0];
  const label = ariaLabel
    ?? `Skill profile. Strongest: ${strongest.axis} ${strongest.you}. Weakest: ${weakest.axis} ${weakest.you}.`;

  return (
    <div className="iv-radar">
      <svg viewBox={`0 0 ${VBW} ${VBH}`} width="100%" role="img" aria-label={label} className="iv-radar__svg">
        <defs>
          <radialGradient id={`r-${gid}`}>
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.12" />
          </radialGradient>
        </defs>
        {/* rings */}
        {RINGS.map((f) => (
          <polygon key={f}
            points={data.map((_, i) => point(angleOf(i), R * f).join(',')).join(' ')}
            fill="none" stroke="var(--hairline)" strokeWidth={1} />
        ))}
        {/* spokes */}
        {data.map((_, i) => {
          const [x, y] = point(angleOf(i), R);
          return <line key={i} x1={CX} y1={CY} x2={x} y2={y} stroke="var(--hairline)" strokeWidth={1} />;
        })}
        {/* peers (dashed reference) */}
        <polygon points={poly('peers')} fill="none" stroke="var(--text-faint)" strokeWidth={1.5} strokeDasharray="4 3" />
        {/* you */}
        <polygon points={poly('you')} fill={`url(#r-${gid})`} stroke="var(--accent)" strokeWidth={2} />
        {data.map((d, i) => {
          const [x, y] = point(angleOf(i), (d.you / 100) * R);
          return <circle key={i} cx={x} cy={y} r={3} fill="var(--accent-bright)" />;
        })}
        {/* axis labels (outside the rings, with margin) */}
        {data.map((d, i) => {
          const a = angleOf(i);
          const [lx, ly] = point(a, R + 16);
          const anchor = Math.abs(Math.cos(a)) < 0.3 ? 'middle' : Math.cos(a) > 0 ? 'start' : 'end';
          return (
            <text key={d.axis} x={lx} y={ly} textAnchor={anchor} dominantBaseline="middle"
              className="iv-radar__label">{d.axis}</text>
          );
        })}
      </svg>
      <div className="iv-radar__legend">
        <span><span className="iv-radar__swatch iv-radar__swatch--you" aria-hidden /> You</span>
        <span><span className="iv-radar__swatch iv-radar__swatch--peers" aria-hidden /> Peers</span>
      </div>
    </div>
  );
}
