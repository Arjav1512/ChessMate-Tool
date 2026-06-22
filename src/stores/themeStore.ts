/**
 * Theme store (Implementation Architecture §7 — global UI state in Zustand).
 *
 * Owns the three System Design §5.10 theme tweaks plus light/dark, persisted to
 * localStorage and reflected onto <html> data-attributes so the Ivory tokens in
 * tokens.css recolor live. This drives the NEW shell only; the legacy app keeps
 * using its own `data-color-scheme` ThemeToggle (strangler — no interference).
 */
import { create } from 'zustand';

export type ThemeMode = 'dark' | 'light';
export type AccentTweak = 'ivory' | 'periwinkle' | 'sage' | 'clay';
export type BoardTweak = 'wood' | 'slate' | 'tournament';
export type DensityTweak = 'cozy' | 'comfortable' | 'spacious';

export interface ThemePrefs {
  theme: ThemeMode;
  accent: AccentTweak;
  board: BoardTweak;
  density: DensityTweak;
}

const STORAGE_KEY = 'cm.theme';
const DEFAULTS: ThemePrefs = { theme: 'dark', accent: 'ivory', board: 'wood', density: 'comfortable' };

const ALLOWED = {
  theme: new Set<ThemeMode>(['dark', 'light']),
  accent: new Set<AccentTweak>(['ivory', 'periwinkle', 'sage', 'clay']),
  board: new Set<BoardTweak>(['wood', 'slate', 'tournament']),
  density: new Set<DensityTweak>(['cozy', 'comfortable', 'spacious']),
} as const;

/** Coerce persisted prefs to known enum values so storage can't inject bad data-attrs. */
function sanitize(raw: unknown): ThemePrefs {
  if (!raw || typeof raw !== 'object') return DEFAULTS;
  const r = raw as Record<string, unknown>;
  return {
    theme: ALLOWED.theme.has(r.theme as ThemeMode) ? (r.theme as ThemeMode) : DEFAULTS.theme,
    accent: ALLOWED.accent.has(r.accent as AccentTweak) ? (r.accent as AccentTweak) : DEFAULTS.accent,
    board: ALLOWED.board.has(r.board as BoardTweak) ? (r.board as BoardTweak) : DEFAULTS.board,
    density: ALLOWED.density.has(r.density as DensityTweak) ? (r.density as DensityTweak) : DEFAULTS.density,
  };
}

function read(): ThemePrefs {
  if (typeof window === 'undefined') return DEFAULTS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? sanitize(JSON.parse(raw)) : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

/** Apply theme prefs to <html> so the Ivory token cascade picks them up. */
export function applyThemeAttributes(prefs: ThemePrefs) {
  if (typeof document === 'undefined') return;
  const el = document.documentElement;
  el.setAttribute('data-theme', prefs.theme);
  el.setAttribute('data-accent', prefs.accent);
  el.setAttribute('data-board', prefs.board);
  el.setAttribute('data-density', prefs.density);
}

interface ThemeState extends ThemePrefs {
  set: (patch: Partial<ThemePrefs>) => void;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  ...read(),
  set: (patch) => {
    const next = { ...get(), ...patch };
    const prefs: ThemePrefs = { theme: next.theme, accent: next.accent, board: next.board, density: next.density };
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs)); } catch { /* ignore */ }
    applyThemeAttributes(prefs);
    set(patch);
  },
}));
