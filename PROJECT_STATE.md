# ChessMate — Project State

> Living snapshot of the ChessMate redesign (Ivory direction). Source of truth for "where are we?" Updated at each phase boundary. Pairs with `IMPLEMENTATION_ROADMAP.md` (plan), `DESIGN_COMPLIANCE_AUDIT.md` (compliance), `DECISION_LOG.md` (why), `LOOP_LOG.md` (chronology).

**Last updated:** 2026-06-23 (end of Phase 4 implementation)

## Where we are

| Phase | Title | Status |
|---|---|---|
| 0 | Discovery (gap analysis + roadmap) | ✅ Done |
| 1 | Design Token Foundation | ✅ Done |
| 2 | Core UI System | ✅ Done |
| 3 | App Shell | ✅ Done |
| 3.5 | Shell Compliance Remediation | ✅ Done — merged (PR #21) |
| 4 | Dashboard | ✅ Built + refined — PR open, awaiting review |
| 5–11 | Analysis → Hardening | ⏳ Not started |

## Migration model (strangler, Architecture §22)

- New Ivory shell + components live behind feature flags; legacy production app is the default.
- **`ui.newShell` = OFF by default.** Authenticated users get the legacy modal app unless the flag is on.
- Per-screen flags (`ui.screen.*`) gate each future screen; until on, the route renders a placeholder.
- Dev preview surfaces (removed at cutover): `?styleguide`, `?components`, `?shell`.
- Cutover (Phase 11): flip flags to 100%, delete legacy `--cm-*` tokens + legacy components, promote `components/ui/iv` → `components/ui`.

## Architecture in place

- **Tokens:** `src/styles/tokens.css` (Ivory, §5) — dark/light + Accent/Board/Density tweaks. Legacy `--cm-*` untouched.
- **Type primitives:** `src/styles/globals.css` (`.iv-display…/.iv-data`).
- **UI primitives:** `src/components/ui/iv/*` (18 components + `iv.css`).
- **Shell:** `src/app/{AppRouter,AppShell,navigation,PlaceholderPage}.tsx` + `src/components/nav/{Sidebar,BottomTabBar,CommandMenu,UserMenu}.tsx` + `shell.css`.
- **State:** TanStack Query (`src/services/queryClient.ts`) + Zustand (`src/stores/{ui,theme,commandMenu}Store.ts`).
- **Flags:** `src/lib/flags.ts` (URL `?ff=` → localStorage → defaults-off).
- **Routing:** React Router; routes per Architecture §4. `/dashboard` renders the real screen behind `ui.screen.dashboard` (placeholder otherwise); all others still placeholders.
- **Dashboard (Phase 4):** `src/features/dashboard/*` (page, cards, hooks, typed sample adapter) + `src/components/charts/{ScoreRing,LineChart}.tsx`. Improvement-system narrative; sample/derived data until the data layer lands (Phase 11).

## Responsive states (§10) — as implemented

| Tier | Width | Navigation |
|---|---|---|
| Mobile | ≤767 | Top bar (brand · ⌘K · account menu) + fixed bottom tab bar (Home/Games/Analysis/Improve) |
| Tablet | 768–1023 | Sidebar auto-collapsed to **icon rail** (glyphs only, no toggle) |
| Laptop | 1024–1279 | Full 232px sidebar + collapse toggle |
| Desktop | ≥1280 | Full 232px sidebar + collapse toggle |

Command menu (⌘K) is global on every tier. Coach is reached contextually, not from the bottom bar.

## Compliance

- Shell audit (`DESIGN_COMPLIANCE_AUDIT.md`): all 10 items ✅ after Phase 3.5. Deferred items are data/feature-phase dependent (Collections→P7, Appearance controls→P10, color-mix fallback→pre-GA).

## Quality gates (local, end of Phase 3.5)

- typecheck ✅ · lint ✅ (0 errors) · unit/component 177 passing ✅ · a11y e2e 4/4 ✅ · build ✅.
- CI: `.github/workflows/ci.yml` runs lint, type-check+build, unit (w/ coverage), e2e, and a dedicated `accessibility` job; triggers broadened to `prod/**` + `feature/**` PRs.

## Not yet done / known deferrals

- No screen implementations (Dashboard…Profile are placeholders).
- Server-side analysis pipeline deferred for v1 (client-side Stockfish stays) — see DECISION_LOG.
- Differentiator screens will build on typed sample/derived data until the data layer lands (Phase 11).
- `color-mix()` fallback, Collections, Improve badge, "Recent games" in ⌘K, Appearance controls — deferred to their phases.
