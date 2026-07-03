import React from 'react';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  body?: string;
  /** Single primary action (System Design §6 — never a blank region). */
  action?: React.ReactNode;
  className?: string;
}

/** Empty state (System Design §6): centered icon + one line + single action. */
export function EmptyState({ icon, title, body, action, className = '' }: EmptyStateProps) {
  return (
    <div className={`iv-state ${className}`}>
      {icon && <span className="iv-state__icon" aria-hidden>{icon}</span>}
      <span className="iv-state__title">{title}</span>
      {body && <span className="iv-state__body">{body}</span>}
      {action}
    </div>
  );
}
