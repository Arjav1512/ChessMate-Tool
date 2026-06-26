# ARCHITECTURE_AUDIT.md

**Mode:** Ground Truth (read-only). **Date:** 2026-06-26.
**Branch audited:** `feature/stabilization-pr1-landing` @ `eb8caf2`.
**Method:** static read of source + runtime verification on `localhost:5173` (Vite dev).
Every claim below was checked against current code, not prior audit docs.

---

## 1. Stack (verified from `package.json`)

| Concern | Choice |
|---|---|
| Framework | React 18.3 + TypeScript 5.5, Vite 5.4 |
| Routing | `react-router-dom` 6.30 (only in the new shell) |
| Server state | `@tanstack/react-query` 5 |
| Client state | `zustand` 4.5 (flags, theme, ui, command menu) |
| Backend | Supabase (`@supabase/supabase-js` 2.57) |
| Engine | `stockfish.js` 10 in a Web Worker |
| AI coach | `@google/generative-ai` (Gemini) via a Supabase Edge Function |
| Chess rules | `chess.js` 1.4 |
| Monitoring | `@sentry/react` 7 (DSN not set in this env) |
| Tests | Vitest (unit), Playwright + axe (e2e/a11y) |

**Typecheck:** `tsc --noEmit -p tsconfig.app.json` → **passes (exit 0).**

## 2. The defining fact: this is a strangler rebuild mid-cutover

The repo contains **two complete applications** sharing one auth layer:

- **Legacy app** — `src/App.tsx`'s `MainApp` (modal-driven, no router, legacy
  `--cm-*` tokens, `src/components/**`).
- **Ivory app** — `src/app/AppRouter.tsx` + `AppShell` + `src/features/**`
  (routed, Ivory tokens, `src/components/ui/iv/**`).

They are selected by the `ui.newShell` feature flag. The strangler is described
across `CHESSMATE_SYSTEM_DESIGN.md` / `CHESSMATE_IMPLEMENTATION_ARCHITECTURE.md`
(§22 cutover, §23 flags). Cutover commit `71c29d7` flipped the defaults ON, so
the **Ivory app is now the default experience**; the legacy app is reachable only
via the rollback override `?ff=-ui.newShell`.

## 3. Boot path (verified)

```
index.html → src/main.tsx
  loads tokens.css → globals.css → style.css → index.css   (token order matters)
  initSentry(); installGlobalErrorHandlers()
  render <App/>
src/App.tsx  App()
  DEV ?styleguide → <Styleguide/>      (token preview, dev-only)
  DEV ?components → <Gallery/>         (iv component gallery, dev-only)
  !supabaseConfigured → <MissingConfigScreen/>
  else → ErrorBoundary > AuthProvider > ToastProvider > ErrorBoundary > MainApp
MainApp() (src/App.tsx:75)
  loading → spinner
  DEV ?shell → <AppRouter/>            (auth-less shell preview, latched, dev-only)
  passwordRecovery → <PasswordResetComplete/>
  !user → preAuthView==='landing' ? <LandingPage/> : <AuthForm/>
  ui.newShell ON (default) → <AppRouter/>     ← the live app
  else → legacy modal app (header + GameList sidebar + modals)
```

`AppRouter` (`src/app/AppRouter.tsx`) wraps everything in
`QueryClientProvider → IvToastProvider → BrowserRouter → Routes(AppShell)`.

## 4. Feature-flag system (`src/lib/flags.ts`)

Zustand store. Resolution order: **defaults ← localStorage(`cm.flags`) ← URL(`?ff=`)**.
10 keys (`ui.newShell`, `ui.screen.*`). `?ff=name` enables, `?ff=-name` disables.

**Defaults ON** (`DEFAULT_ON`, flags.ts:48): `ui.newShell`, `ui.screen.dashboard`,
`ui.screen.analysis`, `ui.screen.improve`, `ui.screen.games`.
**Defaults OFF:** `coach`, `weaknesses`, `progress`, `settings`, `profile`.

This single block is why production now boots into the Ivory shell with four live
screens and "Coming soon" placeholders for the rest. Rollback is a URL away.
The server source (`profiles.prefs.flags`, §23) is **not yet implemented** — the
comment says "a future phase adds it." Flags are per-browser only.

## 5. Auth flow (`src/contexts/AuthContext`, `src/lib/supabase.ts`)

- `supabaseConfigured = Boolean(url && anonKey)`. `.env.local` has both → the
  app boots past `MissingConfigScreen`.
- Single shared `supabase` client. Falls back to a placeholder URL/key if unset
  (so the client object always exists; `supabaseConfigured` is the real gate).
- `AuthProvider` exposes `{ user, loading, signOut, passwordRecovery }`.
  Password recovery takes precedence over the whole app (App.tsx:134).
- Pre-auth view (`landing` vs `auth`) persists in `sessionStorage` so a refresh
  mid-signup doesn't bounce the user back to marketing.

## 6. App shell (`src/app/AppShell.tsx`)

Pure chrome around a routed `<Outlet>`. Responsive per System Design §10:
- mobile ≤767 → top bar + `BottomTabBar`
- tablet 768–1023 → icon-rail sidebar (forced, no toggle)
- laptop/desktop ≥1024 → full sidebar (manual collapse via `uiStore`)
- Global ⌘K → `CommandMenu`; skip link for a11y.

Navigation is **data-driven** from `src/app/navigation.ts` (single source for
router, Sidebar, BottomTabBar, UserMenu, CommandMenu). Each destination carries
`flag`, `phase`, and a `built` boolean. Unbuilt destinations are hidden from nav
and ⌘K (Phase S1) and show "Coming soon" if reached by URL.

## 7. Supabase data model (from `supabase/migrations/` + queried tables)

Tables actually queried by `src/`: `games` (16), `profiles` (6),
`game_analysis_results` (6), `move_analysis` (5), `user_statistics` (1),
`user_progress_snapshots` (1). Migrations include a stats trigger
(`user_statistics`) rewritten around `user_color`, an inaccuracies-column split,
and the `move_analysis` per-ply table (`20260621…`).
**No schema duality:** legacy and Ivory analysis both write `move_analysis` +
`game_analysis_results`. The `Move` interface in `supabase.ts` (a `moves` table)
is **unused** by current code.

## 8. Stockfish integration

`src/lib/stockfish` drives `stockfish.js` in a Web Worker (`src/workers`).
`useAnalysis` (Ivory) and `BulkAnalysis` (legacy) both call the same engine and
the same persistence writers (`buildMoveAnalysisRows` / `persistMoveAnalysis` in
`src/lib/moveAnalysis.ts`). Depth 15, 1 line, off the main thread.

## 9. Architectural risks (detail in TECH_DEBT / RELEASE_BLOCKERS)

1. **Two design-token systems and two UI-primitive libraries** coexist
   (`--cm-*` vs Ivory tokens; `components/ui/*` vs `components/ui/iv/*`).
2. **The Ivory Dashboard and most of Improve are sample-data-only** — they do
   not read the real aggregates that the legacy screens already compute
   (see DATA_FLOW_AUDIT).
3. **`main` is abandoned** at the pre-Ivory state; the real product lives only on
   a feature branch (see GSTACK_BRANCH_AUDIT).
4. The whole legacy app (~38 components, 45 KB `style.css`) is retained for
   rollback but is dead in the default configuration.
