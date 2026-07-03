import React from 'react';
import { Button } from './Button';

export interface ErrorStateProps {
  icon?: React.ReactNode;
  title?: string;
  /** Plain-language cause — never a raw code (System Design §6, Arch §17). */
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}

/**
 * Error state (System Design §6): semantic error-accented, plain-language cause
 * + recovery action. Announced assertively for screen readers (§11).
 */
export function ErrorState({ icon, title = 'Something went wrong', message, onRetry, retryLabel = 'Retry', className = '' }: ErrorStateProps) {
  return (
    <div className={`iv-state iv-state--error ${className}`} role="alert" aria-live="assertive">
      {icon && <span className="iv-state__icon" aria-hidden>{icon}</span>}
      <span className="iv-state__title">{title}</span>
      <span className="iv-state__body">{message}</span>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>{retryLabel}</Button>
      )}
    </div>
  );
}
