import React from 'react';

interface ChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'accent' | 'ghost';
  icon?: React.ReactNode;
}

/**
 * Small pill action — used for insight-card CTAs ("Why was this bad?",
 * "Drill this pattern", "Show line") and coach follow-up suggestions.
 */
export function Chip({
  children,
  variant = 'accent',
  icon,
  style,
  ...props
}: ChipProps) {
  const variants: Record<string, React.CSSProperties> = {
    accent: { color: 'var(--cm-accent-bright)', background: 'var(--cm-accent-dim)', border: '1px solid transparent' },
    ghost: { color: 'var(--cm-text-secondary)', background: 'var(--cm-bg-surface)', border: '1px solid var(--cm-border-default)' },
  };
  return (
    <button
      type="button"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        padding: '6px 11px',
        fontSize: '11.5px',
        fontWeight: 600,
        fontFamily: 'inherit',
        borderRadius: '8px',
        cursor: 'pointer',
        transition: 'filter var(--dur-micro) var(--ease-out)',
        ...variants[variant],
        ...style,
      }}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}
