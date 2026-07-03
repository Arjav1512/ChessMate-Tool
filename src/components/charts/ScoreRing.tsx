import { useId } from 'react';

export interface ScoreRingProps {
  /** 0–100 improvement score. */
  value: number;
  size?: number;
  stroke?: number;
  /** Accessible summary, e.g. "Improvement score 72 of 100, up 6 points". */
  ariaLabel?: string;
}

/**
 * Score Ring (System Design §6 Charts): SVG donut, accent-gradient arc with a
 * soft glow, centered mono value + "of 100". role="img" + aria-label so the
 * value is never conveyed by the arc alone (§11).
 */
export function ScoreRing({ value, size = 108, stroke = 9, ariaLabel }: ScoreRingProps) {
  const v = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = (v / 100) * c;
  const gid = useId();

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={ariaLabel ?? `Improvement score ${Math.round(v)} of 100`}
    >
      <defs>
        <linearGradient id={`ring-${gid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--accent-bright)" />
          <stop offset="100%" stopColor="var(--accent)" />
        </linearGradient>
        <filter id={`glow-${gid}`} x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="var(--accent)" floodOpacity="0.5" />
        </filter>
      </defs>
      {/* track */}
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--progress-track)" strokeWidth={stroke} />
      {/* arc */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={`url(#ring-${gid})`}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${dash} ${c - dash}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        filter={`url(#glow-${gid})`}
      />
      {/* centered value */}
      <text
        x="50%"
        y="48%"
        textAnchor="middle"
        dominantBaseline="central"
        style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: size * 0.28, fill: 'var(--text-hi)' }}
      >
        {Math.round(v)}
      </text>
      <text
        x="50%"
        y="66%"
        textAnchor="middle"
        dominantBaseline="central"
        style={{ fontFamily: 'var(--font-sans)', fontSize: size * 0.1, fill: 'var(--text-low)', letterSpacing: '0.08em' }}
      >
        of 100
      </text>
    </svg>
  );
}
