import React from 'react';
import { Spinner } from './Spinner';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'accent-bright';
export type ButtonSize = 'md' | 'sm';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

/**
 * Ivory primary/secondary/ghost/accent-bright button (System Design §6 Buttons).
 * Real <button>; loading locks width and swaps the label for a spinner while
 * keeping `aria-busy`; label meaning is never conveyed by color alone.
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading = false, fullWidth = false, leftIcon, rightIcon, className = '', children, disabled, type, ...rest },
  ref,
) {
  const classes = [
    'iv-btn',
    `iv-btn--${variant}`,
    `iv-btn--${size}`,
    fullWidth ? 'iv-btn--full' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <button
      ref={ref}
      // Default to type="button" so the primitive never submits a surrounding
      // form unexpectedly; callers can still pass type="submit".
      type={type ?? 'button'}
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? (
        <>
          <Spinner size={size === 'sm' ? 13 : 15} />
          {/* Keep an accessible name while the visible label is swapped out. */}
          {children != null && <span className="iv-sr-only">{children}</span>}
        </>
      ) : (
        <>
          {leftIcon}
          {children}
          {rightIcon}
        </>
      )}
    </button>
  );
});
