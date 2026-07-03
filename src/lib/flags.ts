/**
 * Feature flag infrastructure (Implementation Architecture §23).
 *
 * Phase 3 implements the *client* evaluation layer used by the strangler
 * migration (§22). Flags default OFF, so the legacy production app is the
 * default experience until a flag is explicitly turned on.
 *
 * Resolution order (highest priority first):
 *   1. URL override   — `?ff=ui.newShell,ui.screen.dashboard` (enables listed),
 *                       `?ff=-ui.newShell` to force-disable. Great for previews.
 *   2. localStorage   — persisted per-browser toggles (the dev/QA switch).
 *   3. Defaults       — all OFF.
 *
 * A future phase adds the server source (`profiles.prefs.flags` per §23); this
 * module is the single client entry point, so that swap is localized here.
 */
import { create } from 'zustand';

export const FLAG_KEYS = [
  'ui.newShell',
  'ui.screen.dashboard',
  'ui.screen.games',
  'ui.screen.analysis',
  'ui.screen.improve',
  'ui.screen.coach',
  'ui.screen.weaknesses',
  'ui.screen.progress',
  'ui.screen.settings',
  'ui.screen.profile',
] as const;

export type FlagKey = (typeof FLAG_KEYS)[number];

export type FlagMap = Record<FlagKey, boolean>;

const STORAGE_KEY = 'cm.flags';

function emptyFlags(): FlagMap {
  return FLAG_KEYS.reduce((acc, k) => { acc[k] = false; return acc; }, {} as FlagMap);
}

/**
 * Cutover (Architecture §22, screen-by-screen): the Ivory shell + the four
 * production-ready screens are ON by default. Coach/Weaknesses/Progress/Settings/
 * Profile stay OFF (graceful PlaceholderPage) until their phases ship.
 * Instant rollback is preserved via URL override, e.g. `?ff=-ui.newShell`.
 */
const DEFAULT_ON: readonly FlagKey[] = [
  'ui.newShell',
  'ui.screen.dashboard',
  'ui.screen.analysis',
  'ui.screen.improve',
  'ui.screen.games',
];

function defaultFlags(): FlagMap {
  const f = emptyFlags();
  for (const k of DEFAULT_ON) f[k] = true;
  return f;
}

const FLAG_KEY_SET = new Set<string>(FLAG_KEYS);

/** Keep only known keys with strict boolean values; drop anything tampered/unknown. */
function sanitize(raw: unknown): Partial<FlagMap> {
  if (!raw || typeof raw !== 'object') return {};
  const out: Partial<FlagMap> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (FLAG_KEY_SET.has(k) && typeof v === 'boolean') out[k as FlagKey] = v;
  }
  return out;
}

function readStorage(): Partial<FlagMap> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? sanitize(JSON.parse(raw)) : {};
  } catch {
    return {};
  }
}

function writeStorage(flags: FlagMap) {
  if (typeof window === 'undefined') return;
  try {
    // Only persist the enabled subset to keep the payload small and forward-compatible.
    const enabled = Object.fromEntries(Object.entries(flags).filter(([, v]) => v));
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(enabled));
  } catch { /* ignore quota / privacy-mode errors */ }
}

/** Parse `?ff=` overrides. `name` enables, `-name` disables. Unknown keys ignored. */
function readUrlOverrides(): Partial<FlagMap> {
  if (typeof window === 'undefined') return {};
  const out: Partial<FlagMap> = {};
  const params = new URLSearchParams(window.location.search);
  const raw = params.get('ff');
  if (!raw) return out;
  for (const token of raw.split(',').map((t) => t.trim()).filter(Boolean)) {
    const disable = token.startsWith('-');
    const key = (disable ? token.slice(1) : token) as FlagKey;
    if ((FLAG_KEYS as readonly string[]).includes(key)) out[key] = !disable;
  }
  return out;
}

/** Compose the initial flag state from defaults ← storage ← URL. */
export function resolveInitialFlags(): FlagMap {
  return { ...defaultFlags(), ...readStorage(), ...readUrlOverrides() };
}

interface FlagsState {
  flags: FlagMap;
  isEnabled: (key: FlagKey) => boolean;
  setFlag: (key: FlagKey, value: boolean) => void;
  reset: () => void;
}

export const useFlagsStore = create<FlagsState>((set, get) => ({
  flags: resolveInitialFlags(),
  isEnabled: (key) => get().flags[key] ?? false,
  setFlag: (key, value) => set((s) => {
    const flags = { ...s.flags, [key]: value };
    writeStorage(flags);
    return { flags };
  }),
  reset: () => {
    const flags = defaultFlags();
    writeStorage(flags);
    set({ flags });
  },
}));

/** React hook: subscribe to a single flag. */
export function useFlag(key: FlagKey): boolean {
  return useFlagsStore((s) => s.flags[key] ?? false);
}
