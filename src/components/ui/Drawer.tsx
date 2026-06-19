import React from 'react';
import { X } from 'lucide-react';
import { useModalA11y } from '../../hooks/useModalA11y';

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  ariaLabel?: string;
  /** Side the drawer slides in from. Defaults to the right. */
  side?: 'right' | 'left';
  width?: number;
  children: React.ReactNode;
}

/**
 * Slide-in drawer for progressively-disclosed controls — the v2 "Analysis
 * settings" surface (multi-PV count, depth, display toggles) that keeps the
 * default workspace clean. Reuses useModalA11y for focus trap, Escape-to-close,
 * and focus restoration.
 */
export function Drawer({
  open,
  onClose,
  title,
  ariaLabel,
  side = 'right',
  width = 360,
  children,
}: DrawerProps) {
  if (!open) return null;
  return <DrawerInner {...{ onClose, title, ariaLabel, side, width, children }} />;
}

function DrawerInner({
  onClose,
  title,
  ariaLabel,
  side,
  width,
  children,
}: Omit<DrawerProps, 'open'>) {
  const { containerRef, dialogProps } = useModalA11y(onClose);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        backdropFilter: 'blur(2px)',
        zIndex: 60,
        display: 'flex',
        justifyContent: side === 'right' ? 'flex-end' : 'flex-start',
      }}
    >
      <div
        ref={containerRef}
        {...dialogProps}
        aria-label={ariaLabel ?? title}
        onClick={e => e.stopPropagation()}
        style={{
          width,
          maxWidth: '92vw',
          height: '100%',
          background: 'var(--cm-bg-surface)',
          borderLeft: side === 'right' ? '1px solid var(--cm-border-default)' : undefined,
          borderRight: side === 'left' ? '1px solid var(--cm-border-default)' : undefined,
          boxShadow: 'var(--elevation-2)',
          display: 'flex',
          flexDirection: 'column',
          animation: `drawer-in-${side} var(--dur-panel) var(--ease-out)`,
        }}
      >
        {title && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 18px',
              borderBottom: '1px solid var(--cm-border-subtle)',
            }}
          >
            <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--cm-text-primary)' }}>{title}</span>
            <button
              onClick={onClose}
              aria-label="Close"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--cm-text-muted)',
                display: 'flex',
                padding: '4px',
                borderRadius: '6px',
              }}
            >
              <X size={16} />
            </button>
          </div>
        )}
        <div style={{ flex: 1, overflow: 'auto', padding: '16px 18px' }}>{children}</div>
      </div>
      <style>{`
        @keyframes drawer-in-right { from { transform: translateX(100%); } to { transform: translateX(0); } }
        @keyframes drawer-in-left  { from { transform: translateX(-100%); } to { transform: translateX(0); } }
      `}</style>
    </div>
  );
}
