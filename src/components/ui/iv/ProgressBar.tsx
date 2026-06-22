export interface ProgressBarProps {
  /** 0–1 (fraction) or pass `value`/`max` for explicit ratio. */
  value: number;
  max?: number;
  variant?: 'accent' | 'success';
  glow?: boolean;
  /** Accessible label describing what is progressing. */
  ariaLabel?: string;
  className?: string;
}

/**
 * Progress bar (System Design §6 Charts). Track #211d18, pill fill = accent or
 * semantic. Exposes role="progressbar" with value text for screen readers.
 */
export function ProgressBar({ value, max = 1, variant = 'accent', glow = false, ariaLabel, className = '' }: ProgressBarProps) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div
      className={`iv-progress ${variant === 'success' ? 'iv-progress--success' : ''} ${glow ? 'iv-progress--glow' : ''} ${className}`}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={ariaLabel}
    >
      <span className="iv-progress__fill" style={{ width: `${pct}%` }} />
    </div>
  );
}
