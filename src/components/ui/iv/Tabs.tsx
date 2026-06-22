import React, { useId } from 'react';

export interface TabItem<T extends string> {
  value: T;
  label: string;
}

export interface TabsProps<T extends string> {
  tabs: ReadonlyArray<TabItem<T>>;
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  className?: string;
}

/**
 * Underline tabs (System Design §6 Tabs, §8).
 *
 * CONTRACT (System Design §14.7, §8): this component is *controlled* — the
 * parent owns which tab is active. It never auto-selects a tab on mount, so the
 * Analysis workspace can guarantee "Analysis is default, Coach is never
 * auto-opened". Use `<TabPanel>` for the matching panels.
 *
 * Active tab = --text-hi + 2px accent underline; inactive = --text-low.
 * Roving tabindex + arrow keys per the WAI-ARIA tabs pattern.
 */
export function Tabs<T extends string>({ tabs, value, onChange, ariaLabel, className = '' }: TabsProps<T>) {
  const baseId = useId();
  const idx = tabs.findIndex((t) => t.value === value);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      onChange(tabs[(idx + 1) % tabs.length].value);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      onChange(tabs[(idx - 1 + tabs.length) % tabs.length].value);
    } else if (e.key === 'Home') {
      e.preventDefault();
      onChange(tabs[0].value);
    } else if (e.key === 'End') {
      e.preventDefault();
      onChange(tabs[tabs.length - 1].value);
    }
  };

  return (
    <div className={`iv-tabs ${className}`} role="tablist" aria-label={ariaLabel} onKeyDown={onKeyDown}>
      {tabs.map((t) => {
        const selected = t.value === value;
        return (
          <button
            key={t.value}
            type="button"
            role="tab"
            id={`${baseId}-tab-${t.value}`}
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            className="iv-tab"
            onClick={() => onChange(t.value)}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

export interface TabPanelProps {
  /** Must match the active tab's value to be shown. */
  active: boolean;
  children: React.ReactNode;
}

export function TabPanel({ active, children }: TabPanelProps) {
  if (!active) return null;
  // tabIndex=0 lets keyboard users scroll the panel; role=tabpanel for SR.
  return <div role="tabpanel" tabIndex={0}>{children}</div>;
}
