/**
 * Information architecture (System Design §3) as data.
 *
 * Single source consumed by the router, Sidebar, BottomTabBar, user menu, and
 * CommandMenu so navigation order/labels never drift. Order mirrors the
 * improvement loop exactly (§3). Glyphs are the icons specified in §3.
 *
 * IA placement rules (§3), enforced here:
 *  - Primary nav (sidebar): Dashboard · Games · Analysis · Improve · Coach.
 *  - Weakness Profile + Progress are "sub-views within Improve" — NOT primary
 *    nav; reachable inside Improve and via ⌘K.
 *  - Game Import is a "route off Games" — reached from Games, via ⌘K action.
 *  - Settings + Profile live in the "user/profile menu pinned bottom of sidebar".
 */
import type { FlagKey } from '../lib/flags';

export interface NavDestination {
  key: string;
  label: string;
  glyph: string;
  path: string;
  /** Per-screen flag (§23). Until a screen ships, its route shows a placeholder. */
  flag?: FlagKey;
  /** Roadmap phase that replaces the placeholder with the real screen. */
  phase: number;
  purpose: string;
  /** Whether the real screen is shipped. Unbuilt destinations are hidden from
   *  navigation (Phase S1) and show a branded "Coming soon" if reached directly.
   *  The route + flag are retained so re-listing is a one-line change. */
  built: boolean;
}

/** Primary nav — persistent left sidebar (desktop), per §3 order. */
export const PRIMARY_NAV: NavDestination[] = [
  { key: 'dashboard', label: 'Dashboard', glyph: '◉', path: '/dashboard', flag: 'ui.screen.dashboard', phase: 4, purpose: 'Orientation + momentum. How am I doing / what next?', built: true },
  { key: 'games', label: 'Games', glyph: '▦', path: '/games', flag: 'ui.screen.games', phase: 7, purpose: 'Manage & locate every imported game.', built: true },
  { key: 'analysis', label: 'Analysis', glyph: '◎', path: '/analysis', flag: 'ui.screen.analysis', phase: 5, purpose: 'Understand a single game move-by-move.', built: true },
  { key: 'improve', label: 'Improve', glyph: '▲', path: '/improve', flag: 'ui.screen.improve', phase: 6, purpose: 'Weaknesses → plan → milestones.', built: true },
  { key: 'coach', label: 'Coach', glyph: '✦', path: '/coach', flag: 'ui.screen.coach', phase: 8, purpose: 'On-demand guided explanation & review.', built: false },
];

/** Mobile bottom tab bar — 4 items (Home/Games/Analysis/Improve), §3/§4.11. */
export const BOTTOM_TABS = ['dashboard', 'games', 'analysis', 'improve'] as const;

/**
 * User/profile menu (§3 "user/profile menu pinned bottom of sidebar").
 * Settings + Profile belong here, not in primary nav.
 */
export const USER_MENU: NavDestination[] = [
  { key: 'profile', label: 'Profile', glyph: '◯', path: '/profile', flag: 'ui.screen.profile', phase: 10, purpose: 'Identity, rating, history, achievements.', built: false },
  { key: 'settings', label: 'Settings', glyph: '⚙', path: '/settings', flag: 'ui.screen.settings', phase: 10, purpose: 'Account, platforms, analysis depth, appearance.', built: false },
];

/** Sub-views within Improve (§3) — reachable inside Improve + via ⌘K, not primary nav. */
export const IMPROVE_SUBVIEWS: NavDestination[] = [
  { key: 'weaknesses', label: 'Weakness Profile', glyph: '◍', path: '/weaknesses', flag: 'ui.screen.weaknesses', phase: 9, purpose: 'Deep view of recurring weaknesses by rating impact.', built: false },
  { key: 'progress', label: 'Progress', glyph: '↗', path: '/progress', flag: 'ui.screen.progress', phase: 9, purpose: 'Make improvement felt over time.', built: false },
];

/** Owned route off Games (§3) — import flow. */
export const IMPORT_ROUTE: NavDestination = { key: 'import', label: 'Import games', glyph: '⊕', path: '/games/import', flag: 'ui.screen.games', phase: 7, purpose: 'Get games in with zero friction.', built: true };

/** Param routes that render placeholders in Phase 3 (real screens later). */
export const PARAM_ROUTES: Array<Pick<NavDestination, 'key' | 'label' | 'path' | 'phase' | 'purpose'>> = [
  { key: 'analysis-detail', label: 'Analysis Workspace', path: '/analysis/:id', phase: 5, purpose: 'Single-game analysis workspace.' },
  { key: 'game-detail', label: 'Game', path: '/games/:id', phase: 7, purpose: 'Game summary (pre/post analysis).' },
];

/** Everything reachable via the ⌘K "Go to" group (§6 Command Menu).
 *  Only built destinations are surfaced (Phase S1 — no dead-ends in ⌘K). */
export const COMMAND_DESTINATIONS: NavDestination[] = [
  ...PRIMARY_NAV,
  ...IMPROVE_SUBVIEWS,
  ...USER_MENU,
].filter((d) => d.built);

/** All concrete (non-param) destinations, for route/placeholder lookup. */
export const ALL_DESTINATIONS: NavDestination[] = [
  ...PRIMARY_NAV,
  ...IMPROVE_SUBVIEWS,
  ...USER_MENU,
  IMPORT_ROUTE,
];
