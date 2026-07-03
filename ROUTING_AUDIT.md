# ROUTING_AUDIT.md

**Mode:** Ground Truth. **Date:** 2026-06-26. **Branch:** `feature/stabilization-pr1-landing`.
**Runtime-verified** on `localhost:5173` by walking every route in the browser.

---

## 1. There are two routing models

- **Legacy app:** *no router at all.* `MainApp` (`src/App.tsx`) renders a header +
  sidebar `GameList` and swaps content via `useState` modals (`import`, `analyze`,
  `stats`, `progress`). URL never changes. Reachable only with `?ff=-ui.newShell`.
- **Ivory app:** a single `BrowserRouter` in `src/app/AppRouter.tsx`. This is the
  default. The tree below is the **live** routing tree.

## 2. Runtime routing tree (Ivory shell — `AppRouter.tsx`)

```
<BrowserRouter>
 └─ <AppShell> (layout route)
    ├─ index            → <Navigate to="/dashboard">
    ├─ /dashboard       → flag ui.screen.dashboard ON  → <DashboardPage>      ✅ renders
    ├─ /games           → flag ui.screen.games ON      → <LibraryPage>        ✅ renders
    ├─ /games/import    → flag ui.screen.games ON      → <ImportPage>         ✅ renders (real)
    ├─ /games/:id       → flag ui.screen.games ON      → <Navigate to="/analysis/:id">
    ├─ /analysis        → flag ui.screen.analysis ON   → <Navigate to="/analysis/sample">
    ├─ /analysis/:id    → flag ui.screen.analysis ON   → <AnalysisPage>       ✅ renders
    ├─ /improve         → flag ui.screen.improve ON    → <ImprovePage>
    │     ├─ index      → <ImprovePlanView>            ✅ renders
    │     └─ mistakes   → <ReviewMistakesView>         ✅ renders
    ├─ /weaknesses      → flag OFF → <PlaceholderPage "Coming soon">
    ├─ /progress        → flag OFF → <PlaceholderPage "Coming soon">
    ├─ /coach           → flag OFF → <PlaceholderPage "Coming soon">
    ├─ /settings        → flag OFF → <PlaceholderPage "Coming soon">
    ├─ /profile         → flag OFF → <PlaceholderPage "Coming soon">
    └─ *                → <Navigate to="/dashboard">
```

Each screen route is wrapped in a one-line flag guard (`DashboardRoute`,
`GamesRoute`, etc. in `AppRouter.tsx:21-52`). Flag OFF → `placeholderFor(key)`
looks the destination up in `navigation.ts` and renders the branded placeholder;
an unknown key throws (`AppRouter.tsx:60`) so route/flag drift fails fast.

## 3. Runtime verification results (browser)

| URL | What rendered | Data |
|---|---|---|
| `/` (unauth) | Full marketing landing page, H1 "Get better at chess, one game at a time." | static |
| `/?shell` (DEV) | redirects to `/dashboard`, Ivory shell | sample |
| `/dashboard` | "Good evening, there" + Weekly Focus + Plan cards | **sample** |
| `/games` | "Your games" library, 12 rows (M. Carlsen, hikaru…) | **sample** (DEV unauth) |
| `/analysis` → `/analysis/sample` | Full workspace: board, move list (Ruy López), eval timeline, Coach/Lines tabs | **sample** |
| `/improve` | Weakness radar + study plan + goals | **sample** |
| `/settings`, `/profile`, `/coach`, `/weaknesses`, `/progress` | `PlaceholderPage` "Coming soon → Back to dashboard" | n/a |

No blocking console errors on any route. Only a benign warning: "Sentry DSN not
configured." **Mobile (375×812):** dashboard reflows correctly with the bottom tab
bar (Home/Games/Analysis/Improve).

## 4. Why does localhost show what it shows?

- **Unauthenticated → the landing page renders.** Verified. App.tsx:138 →
  `preAuthView==='landing'` → `<LandingPage>`. **The expected landing page DOES
  appear; the Phase 2 STOP condition is not triggered.**
- **Authenticated → `/dashboard` in the Ivory shell.** Because `ui.newShell` and
  the four screen flags default ON (`flags.ts:48`). Before cutover commit
  `71c29d7` the same code defaulted to the legacy modal app.
- The component actually rendering pre-auth is
  `src/components/marketing/LandingPage.tsx`; post-auth it is `AppShell` + the
  routed feature pages.

## 5. Reachability problems (UI vs URL)

| Route | In sidebar? | In ⌘K? | In user menu? | Reachable how |
|---|---|---|---|---|
| dashboard/games/analysis/improve | ✅ | ✅ | — | normal |
| improve/mistakes | — | — | — | inside Improve only |
| **weaknesses, progress** | ❌ (`built:false`) | ❌ (filtered, `navigation.ts:75`) | ❌ | **typed URL only** → placeholder |
| **coach** | ❌ (`built:false`) | ❌ | ❌ | **typed URL only** → placeholder |
| **settings, profile** | ❌ (`built:false`) | ❌ | ❌ (menu shows only "Sign out") | **typed URL only** → placeholder |

**Finding:** Settings and Profile are completely unreachable through the UI. The
user menu at the bottom of the sidebar renders only "Sign out" (verified in
browser). A user cannot manage account, connected platforms, analysis depth, or
appearance from inside the app. The routes exist purely as placeholders.

## 6. Dev-only / preview surfaces (never in production build, all gated on `import.meta.env.DEV`)

- `?styleguide` → Ivory token styleguide (`App.tsx:663`)
- `?components` → Ivory component gallery (`App.tsx:667`)
- `?shell` → auth-less Ivory shell preview, module-latched until full reload
  (`App.tsx:124`). Used for screenshots and the a11y suite.

## 7. Redirects, duplicates, legacy

- **Redirects:** `index→/dashboard`, `*→/dashboard`, `/analysis→/analysis/sample`,
  `/games/:id→/analysis/:id` (game detail *is* the analysis workspace, by design §3).
- **Duplicate concept:** "open a game" exists as both `/games/:id` and
  `/analysis/:id`; the former just forwards to the latter. Intentional but worth
  noting for analytics/deep-links.
- **Legacy routes:** none — the legacy app has no URL routes to audit.
- **Broken routes:** none found. No 404s, no crash routes.

## 8. Auth + flag gates summary

1. **Auth gate** (App.tsx:138): `!user` → Landing/Auth; blocks the entire shell.
2. **Shell gate** (App.tsx:147): `ui.newShell` selects Ivory vs legacy.
3. **Per-screen gates** (AppRouter routes): each `ui.screen.*` flag selects real
   screen vs placeholder.
4. **`built` gate** (navigation.ts): controls nav/⌘K visibility independent of the
   flag, so an unbuilt screen is hidden even though its route/flag exist.
