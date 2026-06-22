interface ProgressBarBase {
  /** 0–1 (fraction) or pass `value`/`max` for explicit ratio. */
  value: number;
  max?: number;
  variant?: 'accent' | 'success';
  glow?: boolean;
  className?: string;
}

/**
 * A `role="progressbar"` must have an accessible name (§11), so the type
 * requires exactly one of `ariaLabel` / `ariaLabelledby`.
 */
export type ProgressBarProps = ProgressBarBase &
  (
    | { ariaLabel: string; ariaLabelledby?: never }
    | { ariaLabelledby: string; ariaLabel?: never }
  );

/**
 * Progress bar (System Design §6 Charts). Track + pill fill = accent or
 * semantic. Numeric inputs are guarded so bad data can't leak NaN/Infinity
 * into `aria-valuenow` or the CSS width.
 */
export function ProgressBar(props: ProgressBarProps) {
  const { value, max = 1, variant = 'accent', glow = false, className = '' } = props;
  const safeMax = Number.isFinite(max) && max > 0 ? max : 1;
  const ratio = Number.isFinite(value) ? value / safeMax : 0;
  const pct = Math.max(0, Math.min(100, ratio * 100));
  return (
    <div
      className={`iv-progress ${variant === 'success' ? 'iv-progress--success' : ''} ${glow ? 'iv-progress--glow' : ''} ${className}`}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={'ariaLabel' in props ? props.ariaLabel : undefined}
      aria-labelledby={'ariaLabelledby' in props ? props.ariaLabelledby : undefined}
    >
      <span className="iv-progress__fill" style={{ width: `${pct}%` }} />
    </div>
  );
}
