# ChessMate — Project State

> Living snapshot of the ChessMate redesign (Ivory direction). Source of truth for "where are we?" Updated at each phase boundary. Pairs with `IMPLEMENTATION_ROADMAP.md` (plan), `DESIGN_COMPLIANCE_AUDIT.md` (compliance), `DECISION_LOG.md` (why), `LOOP_LOG.md` (chronology).

**Last updated:** 2026-06-23 (end of Phase 5 — Analysis Workspace merged)

## Where we are

| Phase | Title | Status |
|---|---|---|
| 0 | Discovery (gap analysis + roadmap) | ✅ Done |
| 1 | Design Token Foundation | ✅ Done |
| 2 | Core UI System | ✅ Done |
| 3 | App Shell | ✅ Done |
| 3.5 | Shell Compliance Remediation | ✅ Done — merged (PR #21) |
| 4 | Dashboard | ✅ **COMPLETE** — merged (PR #22) |
| 5 | Analysis Workspace | ✅ **COMPLETE** — merged (PR #23) |
| 6 | Improve Hub | ⏳ Next — see `PHASE_6_BACKLOG.md` |
| 7–11 | Library → Hardening | ⏳ Not started |

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
- **Routing:** React Router; routes per Architecture §4. `/dashboard` (flag `ui.screen.dashboard`) and `/analysis/:id` (flag `ui.screen.analysis`) render real screens; remaining routes are placeholders.
- **Dashboard (Phase 4):** `src/features/dashboard/*` + `src/components/charts/{ScoreRing,LineChart}.tsx`. Improvement-system narrative; sample/derived data.
- **Analysis Workspace (Phase 5):** `src/features/analysis/*` + `src/components/charts/EvalBar.tsx` + `src/stores/analysisStepperStore.ts` + `src/lib/analysis/moveQuality.ts`. §8 layout (board+eval/controls/timeline + Tabs Analysis*/Coach/Lines + InsightCard 4 variants + persistent MoveList + Send-to-Improve). Client-side analysis on typed sample/derived data; spec taxonomy (legacy `excellent→best`).

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

## Quality gates (as of the Phase 6 PR)

- typecheck ✅ · lint ✅ (0 errors) · unit/component **215 passing** ✅ · Ivory a11y e2e **14/14** (shell + dashboard + analysis + improve) ✅ · build ✅.
- CI: `.github/workflows/ci.yml` runs lint, type-check+build, unit (w/ coverage), e2e, and a dedicated `accessibility` job (shell + dashboard + analysis + improve + landing axe); triggers on `main`/`prod/**`/`feature/**` PRs.

## Not yet done / known deferrals

- Screens still placeholders: Improve (P6), Games/Import (P7), Coach standalone (P8), Weaknesses/Progress (P9), Settings/Profile (P10).
- Server-side analysis pipeline deferred for v1 (client-side Stockfish; analysis currently runs on typed sample/derived data) — see DECISION_LOG D-001/D-011.
- Differentiator screens build on typed sample/derived data until the data layer lands (Phase 11), incl. `move_analysis` taxonomy migration (`excellent→best`).
- Analysis board is display/stepping only (no click-to-move); analysis-failed error state coded but not yet exercised.
- `color-mix()` fallback, Collections, Improve badge, "Recent games" in ⌘K, Appearance controls — deferred to their phases.
