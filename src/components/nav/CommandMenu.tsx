import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { COMMAND_DESTINATIONS } from '../../app/navigation';
import { useCommandMenuStore } from '../../stores/commandMenuStore';

interface CommandItem {
  id: string;
  group: 'Go to' | 'Actions';
  label: string;
  glyph: string;
  run: () => void;
}

/**
 * Command menu (System Design §6 Command Menu, §11): ⌘K overlay with grouped
 * results (Go to… / Actions), arrow-key navigation, Enter executes, Esc closes.
 * Focus moves to the input on open and is restored to the trigger on close.
 */
export function CommandMenu() {
  const open = useCommandMenuStore((s) => s.open);
  const setOpen = useCommandMenuStore((s) => s.setOpen);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);

  const items: CommandItem[] = useMemo(() => {
    const goTo: CommandItem[] = COMMAND_DESTINATIONS.map((d) => ({
      id: `go-${d.key}`, group: 'Go to', label: d.label, glyph: d.glyph,
      run: () => navigate(d.path),
    }));
    const actions: CommandItem[] = [
      { id: 'act-import', group: 'Actions', label: 'Import PGN', glyph: '⊕', run: () => navigate('/games/import') },
      { id: 'act-focus', group: 'Actions', label: 'Start focus session', glyph: '▲', run: () => navigate('/improve') },
    ];
    return [...goTo, ...actions];
  }, [navigate]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? items.filter((i) => i.label.toLowerCase().includes(q)) : items;
  }, [items, query]);

  // Open/close lifecycle: capture trigger, focus input, restore on close.
  useEffect(() => {
    if (open) {
      restoreRef.current = document.activeElement as HTMLElement;
      setQuery('');
      setActive(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    } else if (restoreRef.current) {
      restoreRef.current.focus();
    }
  }, [open]);

  if (!open) return null;

  const close = () => setOpen(false);
  const execute = (item?: CommandItem) => {
    const target = item ?? filtered[active];
    if (!target) return;
    close();
    target.run();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { e.preventDefault(); close(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, filtered.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); execute(); }
    else if (e.key === 'Tab') {
      // Focus trap (WCAG 2.4.3 / §11 "dialogs trap focus"). This is a combobox:
      // the input is the only focusable control and options are addressed via
      // aria-activedescendant, so Tab/Shift+Tab loop back to the input rather
      // than escaping to the page behind the scrim.
      e.preventDefault();
      inputRef.current?.focus();
    }
  };

  let lastGroup = '';

  return (
    <div className="ivs-cmdk-scrim" onMouseDown={(e) => { if (e.target === e.currentTarget) close(); }}>
      <div role="dialog" aria-modal="true" aria-label="Command menu" className="ivs-cmdk" onKeyDown={onKeyDown}>
        <input
          ref={inputRef}
          className="ivs-cmdk__input"
          placeholder="Search games, go to… or run an action"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setActive(0); }}
          aria-label="Command menu search"
          aria-activedescendant={filtered[active]?.id}
          role="combobox"
          aria-expanded
          aria-controls="ivs-cmdk-list"
        />
        <div className="ivs-cmdk__list" id="ivs-cmdk-list" role="listbox">
          {filtered.length === 0 && <div className="ivs-cmdk__empty">No results for “{query}”.</div>}
          {filtered.map((item, i) => {
            const showGroup = item.group !== lastGroup;
            lastGroup = item.group;
            return (
              <div key={item.id}>
                {showGroup && <div className="ivs-cmdk__group">{item.group}</div>}
                <button
                  id={item.id}
                  role="option"
                  aria-selected={i === active}
                  tabIndex={-1}
                  className="ivs-cmdk__item"
                  onMouseEnter={() => setActive(i)}
                  onClick={() => execute(item)}
                >
                  <span className="ivs-cmdk__glyph" aria-hidden>{item.glyph}</span>
                  {item.label}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
