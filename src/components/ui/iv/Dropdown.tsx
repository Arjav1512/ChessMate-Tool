import React, { useEffect, useRef, useState } from 'react';
import { Button } from './Button';

export interface DropdownItem<T extends string> {
  value: T;
  label: string;
}

export interface DropdownProps<T extends string> {
  items: ReadonlyArray<DropdownItem<T>>;
  value?: T;
  onSelect: (value: T) => void;
  /** Trigger label (e.g. current sort). */
  label: string;
  ariaLabel?: string;
  className?: string;
}

/**
 * Dropdown (System Design §6): secondary-button trigger + ▾; menu surface-3 with
 * pop shadow, keyboard navigable, selected item = check + accent text.
 */
export function Dropdown<T extends string>({ items, value, onSelect, label, ariaLabel, className = '' }: DropdownProps<T>) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    // Focus first item for keyboard users.
    menuRef.current?.querySelector<HTMLElement>('.iv-dropdown__item')?.focus();
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const onItemKey = (e: React.KeyboardEvent, i: number) => {
    const buttons = Array.from(menuRef.current?.querySelectorAll<HTMLElement>('.iv-dropdown__item') ?? []);
    if (e.key === 'ArrowDown') { e.preventDefault(); buttons[(i + 1) % buttons.length]?.focus(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); buttons[(i - 1 + buttons.length) % buttons.length]?.focus(); }
  };

  return (
    <div className={`iv-dropdown ${className}`} ref={ref}>
      <Button
        variant="secondary"
        size="sm"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => setOpen((o) => !o)}
        rightIcon={<span aria-hidden>▾</span>}
      >
        {label}
      </Button>
      {open && (
        <div className="iv-dropdown__menu" role="menu" ref={menuRef}>
          {items.map((item, i) => (
            <button
              key={item.value}
              type="button"
              role="menuitemradio"
              aria-checked={item.value === value}
              className={`iv-dropdown__item ${item.value === value ? 'iv-dropdown__item--selected' : ''}`}
              onClick={() => { onSelect(item.value); setOpen(false); }}
              onKeyDown={(e) => onItemKey(e, i)}
            >
              {item.label}
              {item.value === value && <span aria-hidden>✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
