# ChessMate — Project State

> ⚠️ **Superseded (2026-07-08).** The canonical, current state doc is
> **`CURRENT_PROJECT_STATE.md`**. This file is a phase-boundary snapshot kept for
> history; its phase table below reflects the state as of 2026-07-05 (pre production-audit
> remediation, PR #55). Do not rely on it for "where are we?" — read the canonical doc.

> Living snapshot of the ChessMate redesign (Ivory direction). Pairs with `IMPLEMENTATION_ROADMAP.md` (plan), `DECISION_LOG.md` (why). (Referenced compliance/loop docs now live under `docs/archive/`.)

**Last updated:** 2026-07-05 (Ivory cutover shipped as default; Games, Insights, interactive analysis board + live engine merged; Insights data-linkage + security hardening in review)

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
| 6 | Improve Hub | ✅ **COMPLETE** — merged (PR #24, hotfix #25) |
| 6.x | Improve · Review Mistakes (sub-view; tracked as the "Phase 7" workstream) | ✅ **COMPLETE** — merged (PR #26) |
| 7 | Game Library + Import | ✅ **COMPLETE** — merged (PR #27) |
| 8A | Product simplification (coaching-first, one hero per screen) | ✅ **COMPLETE** — merged |
| 11 | **Cutover** — Ivory shell + 4 screens the default (`ui.newShell` ON) | ✅ **COMPLETE** — merged |
| — | Real-data wiring (Dashboard/Analysis/Improve on real games) | ✅ **COMPLETE** — merged |
| — | Interactive analysis board (click/drag, variations, promotion) | ✅ **COMPLETE** — merged (PR #46) |
| — | Live Stockfish feedback (eval, best-move arrow, verdict) | ✅ **COMPLETE** — merged (PR #47) |
| — | **Insights** screen (usage, strengths, streak, progression, opponents) | ✅ **COMPLETE** — merged (PR #47); data-linkage fix in review (PR #48) |
| — | Security hardening (edge fn, deps, headers) | 🔎 In review (PR #49) |
| 8–10 | Coach → Settings/Profile | ⏳ Not started (routes render a branded placeholder) |

## Migration model (strangler, Architecture §22)

- Cutover shipped: the Ivory shell is now the **default** authenticated experience.
- **`ui.newShell` = ON by default.** The legacy modal app is one rollback flag away (`?ff=-ui.newShell`).
- Per-screen flags (`ui.screen.*`) are ON for shipped screens (dashboard, insights, games, analysis, improve); unbuilt screens (coach/settings/profile) stay off and render a branded placeholder.
- Dev preview surfaces (removed at cutover): `?styleguide`, `?components`, `?shell`.
- Cutover (Phase 11): flip flags to 100%, delete legacy `--cm-*` tokens + legacy components, promote `components/ui/iv` → `components/ui`.

## Architecture in place

- **Tokens:** `src/styles/tokens.css` (Ivory, §5) — dark/light + Accent/Board/Density tweaks. Legacy `--cm-*` untouched.
- **Type primitives:** `src/styles/globals.css` (`.iv-display…/.iv-data`).
- **UI primitives:** `src/components/ui/iv/*` (18 components + `iv.css`).
- **Shell:** `src/app/{AppRouter,AppShell,navigation,PlaceholderPage}.tsx` + `src/components/nav/{Sidebar,BottomTabBar,CommandMenu,UserMenu}.tsx` + `shell.css`.
- **State:** TanStack Query (`src/services/queryClient.ts`) + Zustand (`src/stores/{ui,theme,commandMenu}Store.ts`).
- **Flags:** `src/lib/flags.ts` (URL `?ff=` → localStorage → defaults-off).
- **Routing:** React Router; routes per Architecture §4. `/dashboard`, `/analysis/:id`, and `/improve` (+ nested `/improve/mistakes`) render real screens behind their flags; remaining routes are placeholders.
- **Dashboard (Phase 4):** `src/features/dashboard/*` + `src/components/charts/{ScoreRing,LineChart}.tsx`. Improvement-system narrative; sample/derived data.
- **Analysis Workspace (Phase 5):** `src/features/analysis/*` + `src/components/charts/EvalBar.tsx` + `src/stores/analysisStepperStore.ts` + `src/lib/analysis/moveQuality.ts`. §8 layout (board+eval/controls/timeline + Tabs Analysis*/Coach/Lines + InsightCard 4 variants + persistent MoveList + Send-to-Improve). Client-side analysis on typed sample/derived data; spec taxonomy (legacy `excellent→best`).
- **Improve Hub (Phase 6):** `src/features/improve/*` + `src/lib/improve/*` + `src/lib/learning/objectives.ts` + `src/components/charts/RadarChart.tsx`. §9 two-view hub behind `ui.screen.improve`: **Plan** (`ImprovePlanView` — weekly focus, skill radar, weakness categories, study plan ingesting `cm.improveQueue`, chess study goals) + **Review mistakes** (`ImprovePage` layout + view switcher).
- **Improve · Review Mistakes (Phase 7 workstream):** `src/features/improve/mistakes/*` at `/improve/mistakes`. Single mistake feed (reuses the B-4 `lib/mistakeReview` engine ∪ the Send-to-Improve queue, deduped/prioritized), master/detail, one Primary per mistake ("Open in Analysis") + ghost "Add to study plan" (shared `cm.improveQueue`). Sample/derived; taxonomy bridge via `mapLegacyClassification` (`excellent→best`).

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

## Quality gates (as of the Review Mistakes PR — #26; see `CURRENT_PROJECT_STATE.md` for current)

- typecheck ✅ · lint ✅ (0 errors) · unit/component **225 passing** ✅ · Ivory a11y e2e **24/24** (shell + dashboard + analysis + improve + improve-mistakes + landing) ✅ · build ✅.
- _As of 2026-07-08 (PR #55): **305 unit tests** pass · **260 e2e** across 5 engines (0 unexpected) · `npm audit` 0 vulnerabilities · Vite 7 / Vitest 4._
- CI: `.github/workflows/ci.yml` runs lint, type-check+build, unit (w/ coverage), e2e, and a dedicated `accessibility` job (shell + dashboard + analysis + improve + improve-mistakes + landing axe). Playwright runs with `reducedMotion: 'reduce'` so axe measures final opacity (no `.iv-page-enter` mid-fade false positives). Triggers on `main`/`prod/**`/`feature/**` PRs.

## Not yet done / known deferrals

- Screens still placeholders: Games/Import (P7 — next), Coach standalone (P8), Settings/Profile (P10). Weakness Profile + Progress (P9) are Improve sub-views per D-004; Improve currently surfaces their summary (weakness categories, skill radar, study goals) — full standalone sub-views remain.
- Server-side analysis pipeline deferred for v1 (client-side Stockfish; analysis + Improve + Review Mistakes run on typed sample/derived data) — see DECISION_LOG D-001/D-011.
- Differentiator screens build on typed sample/derived data until the data layer lands (Phase 11), incl. `move_analysis` taxonomy migration (`excellent→best`) and the live `useMistakeReview`/`weaknessProfile` swaps.
- Analysis board is display/stepping only (no click-to-move); Review Mistakes "Open in Analysis" lands on the sample workspace (ply passed, not yet consumed).
- `color-mix()` fallback, Collections, Improve badge, "Recent games" in ⌘K, Appearance controls — deferred to their phases.
