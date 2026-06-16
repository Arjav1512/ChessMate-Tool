import { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { checkCompatibility } from '../../utils/compatibility';

const DISMISSED_KEY = 'cm_compat_warning_dismissed';

interface CompatibilityWarningProps {
  onDismiss?: () => void;
}

export function CompatibilityWarning({ onDismiss }: CompatibilityWarningProps) {
  const [dismissed, setDismissed] = useState<boolean>(
    () => localStorage.getItem(DISMISSED_KEY) === '1',
  );

  const compatibility = checkCompatibility();

  if (compatibility.supported || dismissed) {
    return null;
  }

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, '1');
    setDismissed(true);
    onDismiss?.();
  };

  return (
    <div style={{
      background: 'var(--cm-warning-dim)',
      border: '1px solid rgba(240,168,64,0.25)',
      borderLeft: '3px solid var(--cm-warning)',
      borderRadius: '8px',
      padding: '12px 16px',
      marginBottom: '16px',
      display: 'flex',
      alignItems: 'flex-start',
      gap: '10px',
    }}>
      <AlertTriangle style={{ width: '16px', height: '16px', color: 'var(--cm-warning)', flexShrink: 0, marginTop: '1px' }} />
      <div style={{ flex: 1 }}>
        <h3 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--cm-warning)', marginBottom: '6px' }}>
          Browser Compatibility Warning
        </h3>
        <p style={{ fontSize: '13px', color: 'var(--cm-text-secondary)', marginBottom: '6px', lineHeight: 1.5 }}>
          Your browser may not fully support all features of ChessMate. Some functionality may be limited.
        </p>
        <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
          {compatibility.missingFeatures.map((feature, index) => (
            <li key={index} style={{ fontSize: '12px', color: 'var(--cm-text-secondary)', paddingLeft: '12px', position: 'relative' }}>
              <span style={{ position: 'absolute', left: 0 }}>·</span>
              {feature}
            </li>
          ))}
        </ul>
        <p style={{ fontSize: '12px', color: 'var(--cm-text-muted)', marginTop: '6px', marginBottom: 0 }}>
          For the best experience, please use Chrome, Firefox, Safari, or Edge.
        </p>
      </div>
      <button
        onClick={handleDismiss}
        title="Dismiss (won't show again)"
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--cm-text-muted)',
          padding: '2px',
          display: 'flex',
          alignItems: 'center',
          borderRadius: '4px',
          transition: 'color 0.15s',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--cm-text-primary)')}
        onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--cm-text-muted)')}
      >
        <X style={{ width: '14px', height: '14px' }} />
      </button>
    </div>
  );
}
