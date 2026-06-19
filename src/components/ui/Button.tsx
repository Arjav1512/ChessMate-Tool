import React from 'react';
import { LoadingSpinner } from './LoadingSpinner';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

const variantStyles: Record<string, React.CSSProperties> = {
  primary: {
    background: 'var(--cm-accent-strong)',
    color: 'var(--cm-text-inverse)',
    border: '1px solid transparent',
  },
  secondary: {
    background: 'var(--cm-bg-elevated)',
    color: 'var(--cm-text-primary)',
    border: '1px solid var(--cm-border-default)',
  },
  outline: {
    background: 'transparent',
    color: 'var(--cm-text-primary)',
    border: '1px solid var(--cm-border-default)',
  },
  ghost: {
    background: 'transparent',
    color: 'var(--cm-text-secondary)',
    border: '1px solid transparent',
  },
  danger: {
    background: 'var(--cm-error)',
    color: '#fff',
    border: '1px solid transparent',
  },
};

const sizeStyles: Record<string, React.CSSProperties> = {
  sm: { padding: '5px 10px', fontSize: '12px', borderRadius: '6px', gap: '4px' },
  md: { padding: '7px 14px', fontSize: '13px', borderRadius: '7px', gap: '6px' },
  lg: { padding: '10px 18px', fontSize: '14px', borderRadius: '8px', gap: '6px' },
};

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  className = '',
  disabled,
  style,
  ...props
}: ButtonProps) {
  const baseStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 500,
    lineHeight: 1.4,
    cursor: (disabled || loading) ? 'not-allowed' : 'pointer',
    transition: 'all 0.15s ease',
    outline: 'none',
    textDecoration: 'none',
    position: 'relative',
    opacity: (disabled || loading) ? 0.5 : 1,
    width: fullWidth ? '100%' : undefined,
    ...variantStyles[variant],
    ...sizeStyles[size],
    ...style,
  };

  return (
    <button
      style={baseStyle}
      className={className}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <LoadingSpinner size="sm" />
      ) : (
        <>
          {leftIcon && <span style={{ display: 'flex', alignItems: 'center' }}>{leftIcon}</span>}
          {children}
          {rightIcon && <span style={{ display: 'flex', alignItems: 'center' }}>{rightIcon}</span>}
        </>
      )}
    </button>
  );
}
