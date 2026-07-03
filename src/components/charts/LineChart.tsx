import { useId } from 'react';

export interface LinePoint {
  /** x label (e.g. month) shown on the axis, mono. */
  label?: string;
  value: number;
}

export interface LineChartProps {
  data: LinePoint[];
  height?: number;
  /** Quieter treatment (lighter area, thinner stroke) when the chart is a
   *  supporting companion rather than a hero — e.g. the rating trend (§7). */
  subtle?: boolean;
  /** Accessible summary of the trend (§11). */
  ariaLabel: string;
}

/**
 * Line Chart (System Design §6 Charts): SVG polyline, 2px accent stroke,
 * gradient area fill (accent 26%→0), faint gridlines, last-point dot with glow,
 * mono axis labels. Responsive via viewBox. role="img" + aria-label (§11).
 */
export function LineChart({ data, height = 160, subtle = false, ariaLabel }: LineChartProps) {
  const areaTop = subtle ? '0.12' : '0.26';
  const strokeW = subtle ? 1.5 : 2;
  const gid = useId();
  const W = 600; // viewBox width; scales to container
  const H = height;
  const padX = 8;
  const padTop = 12;
  const padBottom = 22;

  if (data.length < 2) {
    return (
      <div role="img" aria-label={ariaLabel} style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-low)', fontSize: 13 }}>
        Not enough data yet
      </div>
    );
  }

  const values = data.map((d) => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const innerW = W - padX * 2;
  const innerH = H - padTop - padBottom;

  const x = (i: number) => padX + (i / (data.length - 1)) * innerW;
  const y = (val: number) => padTop + (1 - (val - min) / span) * innerH;

  const line = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(d.value).toFixed(1)}`).join(' ');
  const area = `${line} L${x(data.length - 1).toFixed(1)},${(padTop + innerH).toFixed(1)} L${x(0).toFixed(1)},${(padTop + innerH).toFixed(1)} Z`;
  const last = data[data.length - 1];

  // ~4 gridlines
  const gridY = [0, 0.33, 0.66, 1].map((f) => padTop + f * innerH);

  return (
    <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label={ariaLabel}>
      <defs>
        <linearGradient id={`area-${gid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity={areaTop} />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
        </linearGradient>
        <filter id={`dot-${gid}`} x="-200%" y="-200%" width="500%" height="500%">
          <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="var(--accent)" floodOpacity="0.6" />
        </filter>
      </defs>
      {gridY.map((gy, i) => (
        <line key={i} x1={padX} y1={gy} x2={W - padX} y2={gy} stroke="rgba(255,255,255,0.05)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
      ))}
      <path d={area} fill={`url(#area-${gid})`} />
      <path d={line} fill="none" stroke="var(--accent)" strokeWidth={strokeW} vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={x(data.length - 1)} cy={y(last.value)} r={3.5} fill="var(--accent-bright)" filter={`url(#dot-${gid})`} />
      {/* axis labels (mono) — show a sparse subset to avoid clutter */}
      {data.map((d, i) => {
        const showEvery = Math.ceil(data.length / 6);
        if (d.label && i % showEvery === 0) {
          return (
            <text key={i} x={x(i)} y={H - 6} textAnchor="middle" style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fill: 'var(--text-faint)' }}>
              {d.label}
            </text>
          );
        }
        return null;
      })}
    </svg>
  );
}
