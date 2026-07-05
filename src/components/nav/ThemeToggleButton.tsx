import { Sun, Moon } from 'lucide-react';
import { useThemeStore } from '../../stores/themeStore';

/**
 * Light/dark toggle for the authenticated Ivory shell.
 *
 * Drives the shared `themeStore` — the same source the landing/auth toggle uses
 * — so the choice applies (`data-theme` on <html>) and persists (localStorage
 * `cm.theme`) consistently across every screen and across sessions. Styling is
 * left to the caller's `className` so it can render as a sidebar row or a
 * compact top-bar icon button.
 */
export function ThemeToggleButton({
  showLabel = false,
  className = '',
}: {
  showLabel?: boolean;
  className?: string;
}) {
  const theme = useThemeStore((s) => s.theme);
  const set = useThemeStore((s) => s.set);
  const next = theme === 'dark' ? 'light' : 'dark';

  return (
    <button
      type="button"
      className={className}
      onClick={() => set({ theme: next })}
      aria-label={`Switch to ${next} mode`}
      title={`Switch to ${next} mode`}
    >
      {theme === 'dark' ? <Sun size={16} aria-hidden /> : <Moon size={16} aria-hidden />}
      {showLabel && (
        <span className="ivs-themetoggle__label">{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
      )}
    </button>
  );
}
