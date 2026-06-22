import React from 'react';

export type BadgeImpact = 'high' | 'medium' | 'low';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  impact?: BadgeImpact;
}

/** Impact/severity badge (System Design §6 — High/Medium/Low). */
export function Badge({ impact = 'low', className = '', children, ...rest }: BadgeProps) {
  return (
    <span className={`iv-badge iv-badge--${impact} ${className}`} {...rest}>
      {children}
    </span>
  );
}
