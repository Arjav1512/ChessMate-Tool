# TECH_DEBT_AUDIT.md

**Mode:** Ground Truth. **Date:** 2026-06-26. **Branch:** `feature/stabilization-pr1-landing`.
Typecheck passes (`tsc` exit 0). The debt here is structural, not compile-time.

---

## 1. Duplicate code

| # | What | Where | Note |
|---|---|---|---|
| D1 | **Two UI-primitive libraries** | `components/ui/*` (legacy) vs `components/ui/iv/*` (Ivory) | 8 primitives duplicated: Button, Card, Input, Badge, Chip, Toggle, Toast, SegmentedControl. |
| D2 | **Two toast systems mounted at once** | `ToastContext` (legacy, App.tsx) + `IvToastProvider` (AppRouter) | Both run in the default authed path. |
| D3 | **Two chart implementations** | `components/charts/*` vs inline SVG in `features/*` | Radar + line chart exist twice. |
| D4 | **Two analysis UIs** | legacy `components/analysis/AnalyzeGamesPage`+`BulkAnalysis`+`EnginePanel` vs Ivory `features/analysis/*` | Both call the same Stockfish + writers. |
| D5 | **Two token sets** | `style.css` (`--cm-*`, ~350) vs `styles/tokens.css` (Ivory) | Global color changes must be made twice. |
| D6 | **Landing button styles** re-declared inline | `LandingPage.tsx` (`primaryBtn`/`secondaryBtn`/`ghostBtn`) | Not using either Button primitive. |

## 2. Dead / dormant code (in the default configuration)

- **The entire legacy app** (`MainApp` body in `App.tsx`, ~400 lines of inline
  styles) is unreachable unless `?ff=-ui.newShell`. Retained intentionally for
  rollback, but it is dead weight in normal use.
- **Legacy feature components** dead by default: `components/game/GameList`,
  `GameViewer`; `components/stats/StatsDashboard`, `ProgressBar`, `MistakeReview`,
  `WeaknessProfile`; `components/analysis/*`; `components/chess/*` (ChessBoard,
  BoardArrows, EvaluationGauge); `components/layout/ProfileModal`,
  `CompatibilityWarning`.
- **`supabase.ts` `Move` interface / `moves` table** — defined but never queried.
- **`lib/sampleData.ts`** and per-feature sample modules — Games/Analysis use them
  only as a DEV fallback; carry them to cutover only if previews still need them.
- **Dormant feature**: Ivory theme attributes (`data-accent/board/density`) are
  implemented but have no UI control (Settings unbuilt).

## 3. Placeholder / unfinished screens

- `coach`, `weaknesses`, `progress`, `settings`, `profile` →
  `PlaceholderPage` "Coming soon". Routes + flags + nav entries (`built:false`)
  all exist; only the screens are missing.
- **Sample-data-as-production**: Dashboard (all of it) and Improve (weaknesses/
  skills/milestones). See DATA_FLOW_AUDIT — the biggest functional debt.

## 4. Unfinished migrations (the strangler)

- Flags `ui.screen.coach/weaknesses/progress/settings/profile` OFF; screens unbuilt.
- **Server flag source not implemented** — `lib/flags.ts` notes the
  `profiles.prefs.flags` source is "a future phase"; flags are localStorage/URL only.
- **Phase 11 cutover not done**: `--cm-*` removal, legacy component deletion, and
  re-theming the landing on Ivory tokens are all pending.
- Dashboard/Improve "one-file swap to live Supabase" promised in hook comments,
  not executed.

## 5. Documentation sprawl

~45 markdown planning/audit docs at repo root (PHASE_*, *_AUDIT, *_PLAN,
*_DISCOVERY, *_VISUAL_ARCHITECTURE, LOOP_LOG, DECISION_LOG, etc.), several
generated on 2026-06-26 alone (`PRODUCTION_STABILIZATION_AUDIT`,
`RELEASE_READINESS_REPORT`, `REAL_DATA_INTEGRATION_AUDIT`). They overlap, some are
stale relative to current code, and there is no single canonical "current state"
doc. This audit set adds 9 more — they should supersede, not stack onto, the old ones.
A `docs/` directory + an archive of superseded phase docs would help.

## 6. Branch sprawl

~30 local branches (mirrored to origin) for a single line of development; `main`
abandoned. See GSTACK_BRANCH_AUDIT.

## 7. Temporary workarounds / smells

- `previewShellLatch` module-global in `App.tsx` (acceptable: DEV-only, documented).
- `useGames` carries its own re-entry lock + staleness `reqId` + a `stateRef` —
  correct but intricate; a React Query migration (as Dashboard already uses) would
  simplify it.
- Stockfish depth hardcoded to 15 in `useAnalysis.runAndPersist` (the legacy path
  exposes a depth control; the Ivory path does not, and Settings/depth is unbuilt).
- Two `ErrorBoundary` nestings in `App.tsx` (intentional: outer for providers,
  inner for app body).

## 8. Test surface (inventory, not executed)

- Unit: Vitest specs colocated in `src/**/*.test.ts(x)` (dashboard, improve,
  analysis, games, tokens, iv components, a11y, weaknessProfile, rls integration
  via PGlite, monitoring).
- e2e/a11y: 12 Playwright specs in `e2e/` (one per screen + auth + import +
  password reset). Prior commits claim AA contrast + axe gates in CI.
- **Not run in this read-only pass.** Release readiness should run
  `npm test`, `npm run test:e2e`, `npm run build` and record results.

## 9. Debt priority (for cleanup, not done here)

1. **Functional:** wire Dashboard + Improve to real data (kills the worst debt —
   fake data shipped to users).
2. **Reconcile `main` + prune branches.**
3. **Execute Phase 11 cutover:** delete legacy app + `--cm-*` + duplicate
   primitives + legacy charts/toasts; re-theme landing on Ivory.
4. **Doc consolidation** into `docs/` with one canonical state file.
