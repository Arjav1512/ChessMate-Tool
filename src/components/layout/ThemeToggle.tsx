import { useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';
import { useThemeStore, applyThemeAttributes } from '../../stores/themeStore';

/**
 * Mirror the theme onto the legacy Obsidian attributes (`data-color-scheme` +
 * `.dark`). The Ivory tokens read `data-theme`; the legacy `--cm-*` app (still
 * live post-auth until cutover) reads `data-color-scheme`. This one shared
 * toggle drives both so light/dark works on every surface.
 */
function applyLegacyColorScheme(theme: 'light' | 'dark') {
  const root = document.documentElement;
  root.classList.toggle('dark', theme === 'dark');
  root.setAttribute('data-color-scheme', theme);
}

/**
 * Light/dark toggle for the Ivory surfaces (landing + auth) and the legacy app.
 *
 * Previously this wrote only `data-color-scheme` / a `.dark` class, which the
 * Ivory tokens ignore — so on the Ivory pages the button did nothing. It now
 * drives the shared `themeStore` (which sets `data-theme`, what the Ivory
 * tokens in tokens.css respond to, and persists to localStorage) and mirrors
 * the choice to the legacy attributes. One source of truth, every surface.
 */
export function ThemeToggle() {
  const theme = useThemeStore((s) => s.theme);
  const accent = useThemeStore((s) => s.accent);
  const board = useThemeStore((s) => s.board);
  const density = useThemeStore((s) => s.density);
  const set = useThemeStore((s) => s.set);

  // Ensure the persisted preference is reflected on <html> even when this
  // toggle mounts outside the authenticated shell (landing / auth pages).
  useEffect(() => {
    applyThemeAttributes({ theme, accent, board, density });
    applyLegacyColorScheme(theme);
  }, [theme, accent, board, density]);

  const next = theme === 'light' ? 'dark' : 'light';

  return (
    <button
      onClick={() => set({ theme: next })}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '32px',
        height: '32px',
        background: 'var(--cm-bg-hover)',
        border: '1px solid var(--cm-border-default)',
        borderRadius: '6px',
        cursor: 'pointer',
        color: 'var(--cm-text-secondary)',
        transition: 'all 0.15s',
        flexShrink: 0,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--cm-border-strong)';
        e.currentTarget.style.color = 'var(--cm-text-primary)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--cm-border-default)';
        e.currentTarget.style.color = 'var(--cm-text-secondary)';
      }}
      aria-label={`Switch to ${next} mode`}
    >
      {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
    </button>
  );
}
