export interface MetricCardProps {
  label: string;
  /** Value is rendered in mono (§14.14 — mono for data). */
  value: string | number;
  delta?: { value: string | number; direction: 'up' | 'down' | 'flat' };
  sublabel?: string;
  className?: string;
}

/**
 * Metric Card (System Design §6 Metric Cards): label + mono value + optional
 * delta (▲/▼ + value, never color-only) + sublabel. Used in clusters of 2–4.
 */
export function MetricCard({ label, value, delta, sublabel, className = '' }: MetricCardProps) {
  const arrow = delta ? (delta.direction === 'up' ? '▲' : delta.direction === 'down' ? '▼' : '→') : null;
  return (
    <div className={`iv-metric ${className}`}>
      <span className="iv-metric__label">{label}</span>
      <div className="iv-metric__row">
        <span className="iv-metric__value">{value}</span>
        {delta && (
          <span className={`iv-metric__delta iv-metric__delta--${delta.direction}`}>
            <span aria-hidden>{arrow}</span>
            {/* Direction is announced for screen readers, not just shown as an arrow. */}
            <span className="iv-sr-only">{delta.direction === 'up' ? 'up ' : delta.direction === 'down' ? 'down ' : 'no change '}</span>
            {delta.value}
          </span>
        )}
      </div>
      {sublabel && <span className="iv-metric__sub">{sublabel}</span>}
    </div>
  );
}
