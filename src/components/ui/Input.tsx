import React, { useId, useState } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

export function Input({
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  fullWidth = false,
  className = '',
  id: idProp,
  ...props
}: InputProps) {
  const [focused, setFocused] = useState(false);
  const autoId = useId();
  const id = idProp ?? `inp-${autoId}`;

  const inputStyle: React.CSSProperties = {
    display: 'block',
    width: '100%',
    padding: leftIcon ? '8px 12px 8px 36px' : rightIcon ? '8px 36px 8px 12px' : '8px 12px',
    background: 'var(--cm-bg-surface)',
    border: `1px solid ${error ? 'var(--cm-error)' : focused ? 'var(--cm-accent)' : 'var(--cm-border-default)'}`,
    borderRadius: '7px',
    color: 'var(--cm-text-primary)',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.15s, box-shadow 0.15s',
    boxShadow: focused ? `0 0 0 3px ${error ? 'rgba(232,85,74,0.2)' : 'var(--cm-accent-ring)'}` : 'none',
    fontFamily: 'inherit',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '12px',
    fontWeight: 500,
    color: 'var(--cm-text-secondary)',
    marginBottom: '5px',
    textTransform: 'uppercase',
    letterSpacing: '0.4px',
  };

  return (
    <div style={{ width: fullWidth ? '100%' : undefined }} className={className}>
      {label && (
        <label style={labelStyle} htmlFor={id}>
          {label}
        </label>
      )}

      <div style={{ position: 'relative' }}>
        {leftIcon && (
          <div style={{
            position: 'absolute', inset: '0 auto 0 0',
            paddingLeft: '10px',
            display: 'flex', alignItems: 'center',
            pointerEvents: 'none',
            color: 'var(--cm-text-muted)'
          }}>
            {leftIcon}
          </div>
        )}

        <input
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : helperText ? `${id}-help` : undefined}
          style={inputStyle}
          onFocus={(e) => { setFocused(true); props.onFocus?.(e); }}
          onBlur={(e) => { setFocused(false); props.onBlur?.(e); }}
          {...props}
        />

        {rightIcon && (
          <div style={{
            position: 'absolute', inset: '0 0 0 auto',
            paddingRight: '10px',
            display: 'flex', alignItems: 'center',
            pointerEvents: 'none',
            color: 'var(--cm-text-muted)'
          }}>
            {rightIcon}
          </div>
        )}
      </div>

      {error && (
        <p id={`${id}-error`} role="alert" style={{ marginTop: '4px', fontSize: '12px', color: 'var(--cm-error-bright)' }}>
          {error}
        </p>
      )}

      {helperText && !error && (
        <p id={`${id}-help`} style={{ marginTop: '4px', fontSize: '12px', color: 'var(--cm-text-muted)' }}>
          {helperText}
        </p>
      )}
    </div>
  );
}
