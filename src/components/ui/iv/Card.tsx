import React from 'react';

export type CardVariant = 'standard' | 'hero' | 'category';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  /** Apply default 20px padding (§5.4). */
  padded?: boolean;
  /** Hover lift + click target; pass onClick. Renders keyboard-operable. */
  clickable?: boolean;
  selected?: boolean;
  /** Left accent color for category variant (a move-quality/semantic token). */
  accentColor?: string;
}

/**
 * Card (System Design §6 Cards): standard / hero (accent border + halo) /
 * category (left semantic accent). Hero renders a decorative ambient halo.
 */
export const Card = React.forwardRef<HTMLDivElement, CardProps>(function Card(
  { variant = 'standard', padded = true, clickable = false, selected = false, accentColor, className = '', children, onClick, ...rest },
  ref,
) {
  const classes = [
    'iv-card',
    padded ? 'iv-card--pad' : '',
    variant === 'hero' ? 'iv-card--hero' : '',
    variant === 'category' ? 'iv-card--category' : '',
    clickable ? 'iv-card--clickable' : '',
    selected ? 'iv-card--selected' : '',
    className,
  ].filter(Boolean).join(' ');

  const interactiveProps = clickable
    ? {
        role: 'button' as const,
        tabIndex: 0,
        onClick,
        onKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            (onClick as ((e: unknown) => void) | undefined)?.(e);
          }
        },
      }
    : { onClick };

  return (
    <div
      ref={ref}
      className={classes}
      style={variant === 'category' && accentColor ? { borderLeftColor: accentColor } : undefined}
      {...interactiveProps}
      {...rest}
    >
      {variant === 'hero' && <span className="iv-halo" style={{ inset: '-40% -20% auto auto', width: 240, height: 240 }} aria-hidden />}
      {variant === 'hero' ? <div style={{ position: 'relative' }}>{children}</div> : children}
    </div>
  );
});
