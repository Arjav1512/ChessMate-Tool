import { useEffect } from 'react';
import { CheckCircle, AlertCircle, X } from 'lucide-react';

interface ToastProps {
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
  duration?: number;
  /** Position in the current stack — used to stagger vertically so toasts don't overlap. */
  stackIndex?: number;
}

export function Toast({ message, type, onClose, duration = 4000, stackIndex = 0 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const isSuccess = type === 'success';

  return (
    <div
      style={{
        position: 'fixed',
        bottom: `${24 + stackIndex * 68}px`,
        right: '24px',
        zIndex: 10000,
        minWidth: '300px',
        maxWidth: '420px',
        background: 'var(--cm-bg-elevated)',
        border: '1px solid var(--cm-border-default)',
        borderLeft: `3px solid ${isSuccess ? 'var(--cm-success)' : 'var(--cm-error)'}`,
        borderRadius: '8px',
        padding: '12px 16px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        animation: 'slideInUp 0.25s ease-out',
      }}
    >
      {isSuccess ? (
        <CheckCircle style={{ width: '18px', height: '18px', color: 'var(--cm-success)', flexShrink: 0 }} />
      ) : (
        <AlertCircle style={{ width: '18px', height: '18px', color: 'var(--cm-error)', flexShrink: 0 }} />
      )}
      <div style={{ flex: 1, fontSize: '13px', color: 'var(--cm-text-primary)', lineHeight: 1.4 }}>
        {message}
      </div>
      <button
        onClick={onClose}
        style={{
          background: 'transparent',
          border: 'none',
          color: 'var(--cm-text-muted)',
          cursor: 'pointer',
          padding: '2px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '4px',
          transition: 'color 0.15s',
          flexShrink: 0,
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--cm-text-primary)')}
        onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--cm-text-muted)')}
      >
        <X style={{ width: '15px', height: '15px' }} />
      </button>
    </div>
  );
}
