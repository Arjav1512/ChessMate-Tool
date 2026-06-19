import { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';

export function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  useEffect(() => {
    // v2 is dark-first (Direction B "Focused Arena"). Respect a saved
    // preference if the user has chosen one; otherwise default to dark.
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;

    const initialTheme = savedTheme ?? 'dark';
    setTheme(initialTheme);
    applyTheme(initialTheme);
  }, []);

  const applyTheme = (newTheme: 'light' | 'dark') => {
    const root = document.documentElement;

    if (newTheme === 'dark') {
      root.classList.add('dark');
      root.setAttribute('data-color-scheme', 'dark');
    } else {
      root.classList.remove('dark');
      root.setAttribute('data-color-scheme', 'light');
    }

    localStorage.setItem('theme', newTheme);
  };

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    applyTheme(newTheme);
  };

  return (
    <button
      onClick={toggleTheme}
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
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      {theme === 'dark' ? (
        <Sun size={15} />
      ) : (
        <Moon size={15} />
      )}
    </button>
  );
}
