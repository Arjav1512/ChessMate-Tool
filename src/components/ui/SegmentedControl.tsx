import React from 'react';

export interface SegmentItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  /** Optional small count/indicator shown after the label. */
  badge?: React.ReactNode;
}

interface SegmentedControlProps {
  items: SegmentItem[];
  value: string;
  onChange: (id: string) => void;
  /** Accessible label for the group. */
  ariaLabel?: string;
  size?: 'sm' | 'md';
}

/**
 * Tabbed segmented control — the v2 right-panel switcher
 * (Insights / Coach / Lines / Moves). Keyboard-accessible tablist:
 * arrow keys move between tabs, the active tab is elevated.
 */
export function SegmentedControl({
  items,
  value,
  onChange,
  ariaLabel,
  size = 'md',
}: SegmentedControlProps) {
  const pad = size === 'sm' ? '6px 9px' : '9px 11px';
  const fontSize = size === 'sm' ? '12px' : '12.5px';

  const onKeyDown = (e: React.KeyboardEvent, idx: number) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const dir = e.key === 'ArrowRight' ? 1 : -1;
    const next = (idx + dir + items.length) % items.length;
    onChange(items[next].id);
  };

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      style={{ display: 'flex', gap: '4px', width: '100%' }}
    >
      {items.map((item, idx) => {
        const active = item.id === value;
        return (
          <button
            key={item.id}
            role="tab"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(item.id)}
            onKeyDown={e => onKeyDown(e, idx)}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: pad,
              fontSize,
              fontWeight: 600,
              fontFamily: 'inherit',
              cursor: 'pointer',
              borderRadius: '10px',
              border: active ? '1px solid var(--cm-border-default)' : '1px solid transparent',
              background: active ? 'var(--cm-bg-elevated)' : 'transparent',
              color: active ? 'var(--cm-text-primary)' : 'var(--cm-text-muted)',
              transition: 'background var(--dur-micro) var(--ease-out), color var(--dur-micro) var(--ease-out)',
            }}
          >
            {item.icon}
            {item.label}
            {item.badge != null && item.badge !== false && (
              <span
                style={{
                  fontSize: '9.5px',
                  fontFamily: 'var(--font-family-mono)',
                  color: 'var(--cm-secondary)',
                  background: 'var(--cm-secondary-dim)',
                  padding: '1px 5px',
                  borderRadius: '5px',
                }}
              >
                {item.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
