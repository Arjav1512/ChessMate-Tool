import React from 'react';

type BadgeTone = 'neutral' | 'accent' | 'success' | 'warning' | 'error' | 'info';

interface BadgeProps {
  children: React.ReactNode;
  tone?: BadgeTone;
  /** Monospace rendering for counts/percentages. */
  mono?: boolean;
  style?: React.CSSProperties;
}

const tones: Record<BadgeTone, { color: string; bg: string }> = {
  neutral: { color: 'var(--cm-text-secondary)', bg: 'var(--cm-bg-elevated)' },
  accent:  { color: 'var(--cm-accent-bright)',  bg: 'var(--cm-accent-dim)' },
  success: { color: 'var(--cm-success)',        bg: 'var(--cm-success-dim)' },
  warning: { color: 'var(--cm-warning)',        bg: 'var(--cm-warning-dim)' },
  error:   { color: 'var(--cm-error)',          bg: 'var(--cm-error-dim)' },
  info:    { color: 'var(--cm-info)',           bg: 'var(--cm-info-dim)' },
};

/**
 * Compact status/count label — result chips ("1–0"), accuracy ("92%"),
 * move-quality counts, segmented-control counts.
 */
export function Badge({ children, tone = 'neutral', mono = false, style }: BadgeProps) {
  const t = tones[tone];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        fontSize: '10.5px',
        fontWeight: 700,
        letterSpacing: '0.2px',
        padding: '2px 7px',
        borderRadius: '6px',
        color: t.color,
        background: t.bg,
        fontFamily: mono ? 'var(--font-family-mono)' : 'inherit',
        ...style,
      }}
    >
      {children}
    </span>
  );
}
