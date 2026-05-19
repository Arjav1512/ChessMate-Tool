
interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  text?: string;
}

const sizeMap: Record<string, string> = {
  sm: '16px',
  md: '22px',
  lg: '32px',
};

export function LoadingSpinner({ size = 'md', className = '', text }: LoadingSpinnerProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }} className={className}>
      <div
        role="status"
        aria-label="Loading"
        style={{
          width: sizeMap[size],
          height: sizeMap[size],
          border: '2px solid var(--cm-border-default)',
          borderTopColor: 'var(--cm-accent)',
          borderRadius: '50%',
          animation: 'spin 0.65s linear infinite',
          flexShrink: 0,
        }}
      />
      {text && (
        <span style={{ fontSize: '13px', color: 'var(--cm-text-secondary)' }}>
          {text}
        </span>
      )}
    </div>
  );
}
