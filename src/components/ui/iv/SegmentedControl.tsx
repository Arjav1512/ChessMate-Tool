import React from 'react';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

export interface SegmentedControlProps<T extends string> {
  options: ReadonlyArray<SegmentedOption<T>>;
  value: T;
  onChange: (value: T) => void;
  /** Accessible group name (e.g. "Chart range", "Weakness category"). */
  ariaLabel: string;
  className?: string;
}

/**
 * Segmented control (System Design §6) — a single-select radio group.
 * Selected item = accent fill + on-accent text (§5.9). Arrow keys move
 * selection per the radiogroup pattern.
 */
export function SegmentedControl<T extends string>({ options, value, onChange, ariaLabel, className = '' }: SegmentedControlProps<T>) {
  const idx = options.findIndex((o) => o.value === value);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      onChange(options[(idx + 1) % options.length].value);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      onChange(options[(idx - 1 + options.length) % options.length].value);
    }
  };

  return (
    <div className={`iv-seg ${className}`} role="radiogroup" aria-label={ariaLabel} onKeyDown={onKeyDown}>
      {options.map((o) => {
        const checked = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={checked ? 0 : -1}
            className="iv-seg__item"
            onClick={() => onChange(o.value)}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
