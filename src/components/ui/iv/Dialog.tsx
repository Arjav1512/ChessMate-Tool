import React, { useId } from 'react';
import { useModalA11y } from '../../../hooks/useModalA11y';

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  /** Accessible title; rendered as the heading and wired to aria-labelledby. */
  title?: string;
  ariaLabel?: string;
  children: React.ReactNode;
  /** Render as a bottom sheet (mobile). Same fill; swipe/Esc dismiss. */
  sheet?: boolean;
  className?: string;
}

/**
 * Dialog / bottom Sheet (System Design §6 Dialogs/Sheets). Centered scrim panel
 * (or bottom sheet when `sheet`). Focus trapped, Esc closes and restores focus
 * to the trigger (via useModalA11y), scrim click dismisses.
 */
export function Dialog({ open, onClose, title, ariaLabel, children, sheet = false, className = '' }: DialogProps) {
  const { containerRef, dialogProps } = useModalA11y(onClose);
  const uid = useId();
  if (!open) return null;

  // Unique per instance so multiple dialogs never collide on the title id.
  const labelId = title ? `iv-dialog-title-${uid}` : undefined;

  return (
    <div
      className={`iv-scrim ${sheet ? 'iv-scrim--sheet' : ''}`}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        ref={containerRef}
        {...dialogProps}
        aria-labelledby={labelId}
        aria-label={labelId ? undefined : (ariaLabel ?? 'Dialog')}
        className={`${sheet ? 'iv-sheet' : 'iv-dialog'} ${className}`}
      >
        {sheet && <span className="iv-sheet__handle" aria-hidden />}
        {title && (
          <h2 id={labelId} className="iv-h3" style={{ color: 'var(--text-hi)', marginBottom: 'var(--space-4)' }}>
            {title}
          </h2>
        )}
        {children}
      </div>
    </div>
  );
}
