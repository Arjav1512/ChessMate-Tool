import { useEffect } from 'react';
import { CheckCircle, AlertCircle, X } from 'lucide-react';

interface ToastProps {
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
  duration?: number;
}

export function Toast({ message, type, onClose, duration = 4000 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 'var(--space-24)',
        right: 'var(--space-24)',
        zIndex: 10000,
        minWidth: '320px',
        maxWidth: '500px',
        background: type === 'success' ? 'var(--color-success)' : 'var(--color-error)',
        color: 'white',
        padding: 'var(--space-16)',
        borderRadius: 'var(--border-radius)',
        boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-12)',
        animation: 'slideInUp 0.3s ease-out'
      }}
    >
      {type === 'success' ? (
        <CheckCircle style={{ width: '20px', height: '20px', flexShrink: 0 }} />
      ) : (
        <AlertCircle style={{ width: '20px', height: '20px', flexShrink: 0 }} />
      )}
      <div style={{ flex: 1, fontSize: 'var(--font-size-sm)' }}>{message}</div>
      <button
        onClick={onClose}
        style={{
          background: 'transparent',
          border: 'none',
          color: 'white',
          cursor: 'pointer',
          padding: 'var(--space-4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 'var(--border-radius)',
          opacity: 0.8,
          transition: 'opacity 0.2s'
        }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.8')}
      >
        <X style={{ width: '16px', height: '16px' }} />
      </button>
    </div>
  );
}
