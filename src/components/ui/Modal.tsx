import React from 'react';
import { useModalA11y } from '../../hooks/useModalA11y';

const backdropStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.65)',
  backdropFilter: 'blur(4px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 50,
  padding: '16px',
};

const baseContainerStyle: React.CSSProperties = {
  background: 'var(--cm-bg-surface)',
  border: '1px solid var(--cm-border-default)',
  borderRadius: '12px',
  boxShadow: '0 24px 48px rgba(0,0,0,0.4)',
  width: '100%',
  maxHeight: '90vh',
  overflow: 'auto',
};

interface ModalProps {
  onClose: () => void;
  /** Accessible name for the dialog. Falls back to `title` when omitted. */
  ariaLabel?: string;
  /** Optional header title — also renders the standard close (×) button. */
  title?: string;
  /** Override/extend the container style (e.g. maxWidth, height). */
  containerStyle?: React.CSSProperties;
  children: React.ReactNode;
}

/**
 * Accessible modal shell: dimmed backdrop, focus trap, Escape-to-close,
 * focus restore, and `role="dialog"`/`aria-modal`. Visual styling matches the
 * app's existing modals exactly — this is an a11y wrapper, not a redesign.
 */
export function Modal({ onClose, ariaLabel, title, containerStyle, children }: ModalProps) {
  const { containerRef, dialogProps } = useModalA11y(onClose);

  return (
    <div style={backdropStyle} onClick={onClose}>
      <div
        ref={containerRef}
        {...dialogProps}
        aria-label={ariaLabel ?? title}
        style={{ ...baseContainerStyle, ...containerStyle }}
        onClick={e => e.stopPropagation()}
      >
        {title && <ModalHeader title={title} onClose={onClose} />}
        {children}
      </div>
    </div>
  );
}

function ModalHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '16px 20px',
      borderBottom: '1px solid var(--cm-border-subtle)',
    }}>
      <span style={{ fontWeight: 600, fontSize: '15px', color: 'var(--cm-text-primary)' }}>{title}</span>
      <button
        onClick={onClose}
        aria-label="Close"
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--cm-text-muted)',
          fontSize: '20px',
          lineHeight: 1,
          padding: '4px',
          borderRadius: '4px',
          transition: 'color 0.15s',
          display: 'flex',
          alignItems: 'center',
        }}
        onMouseEnter={e => (e.currentTarget.style.color = 'var(--cm-text-primary)')}
        onMouseLeave={e => (e.currentTarget.style.color = 'var(--cm-text-muted)')}
      >
        ×
      </button>
    </div>
  );
}
