# CURRENT_PROJECT_STATE.md

> **This is the canonical source of truth for ChessMate.** It supersedes every
> prior planning, roadmap, discovery, and state document (see `DOCUMENT_INDEX.md`).
> Every claim here was verified against the code on the date below — not copied
> from older docs.

**Date:** 2026-06-26
**Branch audited:** `feature/stabilization-pr1-landing` @ `eb8caf2` (the de-facto trunk)
**Verification:** static source read + runtime walk of every route (headless
Chromium, desktop + mobile) + `tsc` (passes) + git graph analysis.
**Scope:** documentation only. No code, branches, commits, or file moves.

---

## 1. Executive Summary

- **Product maturity:** Pre-v1. The foundation is real and works; the
  "track your improvement" feedback loop is not backed by data. It is a working
  demo, not yet a trustworthy product.
- **Architecture:** A **strangler rebuild mid-cutover**. Two complete apps share
  one auth layer: a **legacy modal app** and the new **Ivory routed shell**,
  selected by the `ui.newShell` flag. As of cutover commit `71c29d7`, the Ivory
  shell is the default; the legacy app is one rollback flag away (`?ff=-ui.newShell`).
- **Branch strategy:** Broken. `main` is abandoned at the pre-Ivory state (PR #5);
  the entire real product lives on `feature/stabilization-pr1-landing`, 123 commits
  ahead. There is no deployable trunk.
- **Production readiness:** **Not ready.** Two critical blockers: (1) the Dashboard
  shows fabricated sample data to authenticated users; (2) `main` does not contain
  the product. The app otherwise builds, typechecks, and renders every route
  without errors.
- **Overall status:** Strong foundation (auth, PGN import, Stockfish analysis +
  persistence, the full responsive shell, 4 live screens). The remaining work is
  closing the data-feedback half of the loop, finishing 3 placeholder screens,
  retiring the legacy system, and fixing repo hygiene.

---

## 2. Architecture

| Concern | Implementation |
|---|---|
| **Frontend** | React 18.3 + TypeScript 5.5, Vite 5.4. Entry `src/main.tsx` → `src/App.tsx`. |
| **Routing** | `react-router-dom` 6.30, single `BrowserRouter` in `src/app/AppRouter.tsx`. Only active in the Ivory shell. The legacy app has **no router** (modal state in `MainApp`). |
| **Authentication** | Supabase auth via `src/contexts/AuthContext`. `supabaseConfigured` gates the app; `.env.local` has real URL + anon key. Password reset/recovery handled; recovery takes precedence over the whole UI (`App.tsx:134`). |
| **Feature flags** | `src/lib/flags.ts` (Zustand). 10 keys. Resolution: defaults ← `localStorage('cm.flags')` ← URL `?ff=`. Defaults **ON**: `ui.newShell`, `ui.screen.{dashboard,games,analysis,improve}`. Defaults **OFF**: `coach,weaknesses,progress,settings,profile`. Server-side flag source (`profiles.prefs.flags`) **not implemented**. |
| **Supabase** | Tables queried: `games`, `profiles`, `game_analysis_results`, `move_analysis`, `user_statistics`, `user_progress_snapshots`. Migrations in `supabase/migrations/`. `user_statistics` maintained by a DB trigger. No schema duality. The `Move`/`moves` interface in `supabase.ts` is unused. |
| **Stockfish** | `stockfish.js` 10 in a Web Worker (`src/workers`, `src/lib/stockfish`). Depth 15, 1 line, off-thread. Shared by both apps. Writers: `src/lib/moveAnalysis.ts`. |
| **React Query** | `@tanstack/react-query` 5 (`src/services/queryClient`). Used by Dashboard hooks and others. Provider mounted in `AppRouter`. |
| **Zustand** | Stores: `flags`, `themeStore` (theme/accent/board/density), `uiStore` (sidebar), `commandMenuStore` (⌘K). |
| **Design System** | **Two systems coexist.** Legacy `--cm-*` (`src/style.css`, ~350 tokens) + legacy primitives `src/components/ui/*`. Ivory spec tokens (`src/styles/tokens.css`) + `src/components/ui/iv/*`. See §6. |

**Boot path:** `main.tsx` → `App` → (`MissingConfigScreen` if unconfigured) →
`AuthProvider`/`ToastProvider` → `MainApp` → unauth: `LandingPage`/`AuthForm`;
authed + `ui.newShell`: `AppRouter` (Ivory shell); else legacy modal app.
Dev-only preview surfaces: `?styleguide`, `?components`, `?shell`.

---

## 3. Screen Status

| Screen | Status | UI Complete | Real Data | Production Ready | Notes |
|---|---|---|---|---|---|
| **Landing** | Implemented | ✅ | n/a (static) | ✅ | `components/marketing/LandingPage.tsx`. Legacy `--cm-*` tokens + inline styles (mislabeled "Ivory"). Advertises Coach (unbuilt). |
| **Dashboard** | Implemented (UI) | ✅ | ❌ **100% sample** | ❌ | `features/dashboard/*`. All 8 hooks resolve `sampleDashboard`; zero Supabase calls. **Top blocker.** |
| **Games** | Implemented | ✅ | ✅ | ⚠️ | `features/games/LibraryPage` + `useGames`. Reads `games` paginated, analyzed-status from `game_analysis_results`. Sample only in DEV unauth preview. |
| **Import** | Implemented | ✅ | ✅ | ⚠️ | `features/games/ImportPage`. Real PGN parse/preview/insert. Chess.com/Lichess connect disabled ("soon"). |
| **Analysis** | Implemented (Phase 8B) | ✅ | ✅ | ⚠️ | `features/analysis/*` + `hooks.ts`. Reads `move_analysis`; runs Stockfish + persists if absent. Sample for `id==='sample'`/DEV unauth. Depth hardcoded 15, no UI control. |
| **Improve** | Partial | ✅ | ⚠️ **mostly sample** | ❌ | `features/improve/*`. Plan composed by real `composePlan` from **sample** weaknesses + the live Send-to-Improve queue (localStorage). Weakness inputs fabricated. |
| **Review Mistakes** | Implemented (UI) | ✅ | ⚠️ sample/feed | ❌ | `features/improve/mistakes/*`. Sub-view of Improve. Uses sample feed + adapter; real `move_analysis` mistake feed exists in legacy hooks but isn't wired here. |
| **Coach** | Placeholder | ❌ | ❌ | ❌ | `/coach` → `PlaceholderPage` "Coming soon". Flag OFF, `built:false`. Gemini `chess-mentor` edge function exists (used by legacy `GameViewer`). |
| **Settings** | Placeholder | ❌ | ❌ | ❌ | `/settings` placeholder. **Unreachable from UI** (nav hidden, user menu = Sign out only). Ivory theming controls would live here but are dormant. |
| **Profile** | Placeholder | ❌ | ❌ | ❌ | `/profile` placeholder. Unreachable from UI. Legacy `ProfileModal` exists in the legacy app only. |
| **Progress** | Placeholder | ❌ | ❌ | ❌ | `/progress` placeholder. Sub-view of Improve. `user_progress_snapshots` table exists; not consumed. |
| **Weaknesses** | Placeholder | ❌ | ❌ | ❌ | `/weaknesses` placeholder. Real `weaknessProfile` logic exists in legacy hooks; not wired to this screen. |

Legend: ✅ done · ⚠️ real but unverified end-to-end / not release-certified · ❌ missing.

---

## 4. Feature Status

**Implemented (real, working):**
- Supabase authentication (sign up/in/out, password reset + recovery).
- PGN import (paste/upload → parse → preview → insert into `games`).
- Game Library (paginated real games, filters, analyzed-status derivation).
- Single-game Analysis: Stockfish evaluation, move classification, eval timeline,
  per-ply persistence to `move_analysis` + summary to `game_analysis_results`.
- Responsive Ivory shell (sidebar/icon-rail/bottom-tabs, ⌘K command menu, skip
  link, focus management).
- Feature-flag system (client: defaults/localStorage/URL).
- The entire legacy app (analysis, stats, weakness profile, mistake review) —
  functional but dead by default behind the rollback flag.

**Partially Implemented:**
- Improve Hub (real plan composition + Send-to-Improve queue, but sample weakness
  inputs).
- Review Mistakes (UI + adapter complete; not reading the user's real mistakes).
- AI Coach backend (`chess-mentor` edge function exists; no Ivory UI).

**Mocked (sample data presented as production):**
- Dashboard (all tiles).
- Improve weaknesses / skills / milestones.
- Review Mistakes feed.

**Placeholder (route + flag + nav entry exist, screen absent):**
- Coach, Settings, Profile, Progress, Weaknesses.

**Not Started:**
- Server-side feature-flag source (`profiles.prefs.flags`).
- Chess.com/Lichess platform connect.
- Phase 11 cutover (legacy/`--cm-*`/duplicate-primitive removal).

---

## 5. Data Flow

```
Landing (static)
  ↓
Authentication ............................. REAL (Supabase)
  ↓
Games (Library) ............................ REAL (games table, paginated)
  ↓
Import ..................................... REAL (PGN → games insert)
  ↓
Analysis .................................. REAL (reads move_analysis;
                                            runs Stockfish + persists if absent)
  ↓   └── writes move_analysis + game_analysis_results
  ↓   └── Send-to-Improve queue (localStorage) ──┐  ← only real cross-screen bridge
  ↓                                               │
Improve ................................... SAMPLE weaknesses ◄──────────────┘
  ↓                                            (+ real plan composition over them)
Dashboard ................................. 100% SAMPLE (ignores everything above)
```

- **Real data begins** at Authentication and continues cleanly through Import →
  Library → single-game Analysis (the inbound half of the loop).
- **Sample data begins** at Improve (weakness inputs) and dominates Dashboard
  (entirely) and Review Mistakes (feed).
- **Disconnected flows:** Analysis persists real `move_analysis` /
  `game_analysis_results`, but **nothing downstream reads them.** Dashboard tiles
  and Improve weaknesses are fabricated. The only real signal crossing from
  Analysis to Improve is the Send-to-Improve queue.
- **The cruel irony:** real aggregation already exists in the legacy layer
  (`lib/weaknessProfile.ts`, `hooks/useWeaknessProfile`, `hooks/useMistakeReview`,
  legacy `StatsDashboard` reading `user_statistics`). The Ivory screens were
  rebuilt with sample adapters instead of reusing it. The hooks are written for a
  "one-file swap to live reads" that hasn't been done.

---

## 6. Design System

- **Token systems (two):**
  - Legacy "Obsidian" `--cm-*` in `src/style.css` (~350 defs) — used by the legacy
    app and the landing page.
  - Ivory spec tokens in `src/styles/tokens.css` (`--bg`, `--surface-*`, `--accent`,
    `--text-*`, `--mq-*`, `--r-*`, `--space-*`) — used by the Ivory shell + `ui/iv`.
    Theme attributes `data-theme/accent/board/density` on `<html>` via `themeStore`.
  - Disjoint by design (strangler). Both are live at once because the landing page
    (always shown pre-auth) uses `--cm-*` and the legacy app is one flag away.
- **Ivory components** (`src/components/ui/iv/*`): Button, Card, Input, Badge, Chip,
  Toggle, Toast, SegmentedControl, Dialog, Dropdown, Tabs, Avatar, MetricCard,
  EmptyState, ErrorState, ProgressBar, Skeleton, Spinner, Gallery.
- **Legacy components** (`src/components/ui/*`): Button, Card, Input, Badge, Chip,
  Toggle, Toast, SegmentedControl, Modal, Drawer, LoadingSpinner, MarkdownRenderer.
  Plus legacy `components/{game,stats,analysis,chess,charts}/*`.
- **Duplicate libraries:** 8 primitives exist in both (Button, Card, Input, Badge,
  Chip, Toggle, Toast, SegmentedControl). **Two toast providers** mount at once
  (`ToastContext` + `IvToastProvider`). **Two chart implementations**
  (`components/charts/*` vs inline SVG in `features/*`).
- **Mixed/ambiguous:** `LandingPage.tsx` (Ivory look, legacy tokens, 1,200 lines
  inline styles), plus `ThemeToggle`/`ErrorBoundary`/`AuthForm` shared by both apps.
- **Remaining migration (Phase 11 cutover):** remove `--cm-*`, delete legacy app +
  legacy primitives/charts/toast, re-theme the landing on Ivory tokens/components,
  drop the `?ff=-ui.newShell` rollback path.

---

## 7. Branch Strategy

- **Canonical development branch (today):** `feature/stabilization-pr1-landing`
  — the de-facto trunk; contains the entire product; 123 commits ahead of `main`;
  in sync with its `origin/*`.
- **Integration branch:** same as above. There is no separate integration branch;
  PRs #21–#34 were merged into this line, not into `main`.
- **`main`:** **abandoned** at `a6182d5` (PR #5, pre-Ivory legacy app). A pure
  ancestor of the trunk (`git merge-base --is-ancestor main <trunk>` = true; 0
  commits ahead). Deploying from `main` would ship the old app.
- **Stale branches (content already in the trunk, safe to delete after confirming
  the merge commit):** all `feature/phase-*`, `chore/consolidate-8a1`,
  `feature/stabilization-pr2`.
- **Likely-dead experiments (verify diff, then delete):** `v2/phase-1-design-system`,
  `v2/phase-2-analysis-workspace`, the 11 `prod/*` branches,
  `qa/production-readiness-audit`, `sprint-1/production-safety-and-trust`,
  `feature/ui-ux-remediation`, `feature/phase-11-cutover`.
- **Active:** only `feature/stabilization-pr1-landing`. (~30 branches total — sprawl.)

**Recommended Git workflow going forward (gstack-style):**
1. **Reconcile first:** fast-forward `main` to the trunk (it's a pure ancestor), or
   PR the trunk → `main`. Make `main` the real trunk again.
2. Branch every new unit of work from `main` as a small, single-purpose branch
   (`feat/...`, `fix/...`). Use stacked PRs for dependent work (e.g. dashboard-real
   → improve-real share weakness wiring).
3. One PR = one reviewable change; keep CI (typecheck + unit + axe e2e) green; use
   the existing `/ship` and `/review` skills.
4. Delete branches on merge. Prune the ~25 stale branches (local + origin) after
   confirming their content is in `main`.
5. Stop using a PR-named branch as the integration line.

---

## 8. Technical Debt (verified from current code)

**Critical**
- Dashboard ships fabricated data to authenticated users (`features/dashboard/hooks.ts`).
- `main` lacks the product; no deployable trunk.

**High**
- Improve weaknesses + Review Mistakes feed are sample, not the user's real games.
- Settings & Profile unreachable from the UI; theming system dormant as a result.
- AI Coach advertised on landing but unbuilt.

**Medium**
- Two token systems + two UI-primitive libraries (8 duplicated) + two toast
  providers mounted at once + two chart implementations.
- Landing is legacy-token + inline styles, mislabeled "Ivory"; needs re-theme at cutover.
- ~45 root planning docs (overlapping/stale) + ~30 branches → no clear source of truth.
- Stockfish depth hardcoded (15) with no Ivory-path control.

**Low**
- Sentry DSN not configured (prod env).
- `baseline-browser-mapping` data >2 months old (Vite warning).
- Dashboard desktop layout bottom-heavy/empty (reads unfinished).
- `/games/:id` → `/analysis/:id` redirect may surprise deep-links.
- Unused `Move`/`moves` interface in `supabase.ts`.

---

## 9. Release Readiness Checklist

| Item | Status |
|---|---|
| App builds (`npm run build`) | ⚠️ Partial — typecheck passes; full build not run this pass |
| Typecheck (`tsc`) clean | ✅ Done |
| All routes render without errors | ✅ Done (verified in browser) |
| Auth flow works | ✅ Done |
| Import → real games | ✅ Done |
| Analysis runs + persists real data | ✅ Done |
| Dashboard shows the user's real data | ❌ Missing |
| Improve uses the user's real weaknesses | ❌ Missing |
| Review Mistakes uses real mistakes | ❌ Missing |
| Settings reachable + functional | ❌ Missing |
| Profile reachable + functional | ❌ Missing |
| Coach built or copy softened | ❌ Missing |
| Single design system (cutover done) | ❌ Missing |
| `main` is the real trunk | ❌ Missing |
| Unit + e2e suites run green on trunk | ⚠️ Partial — suites exist, not run this pass |
| Responsive QA (desktop/laptop/tablet/mobile) | ⚠️ Partial — spot-checked desktop + mobile only |
| Sentry DSN configured (prod) | ❌ Missing |

---

## 10. Implementation Roadmap (replaces all previous roadmaps)

**Prerequisite — Phase 0 (must precede everything): reconcile `main`.** Fast-forward
`main` to the trunk and branch all future work from it. Mechanical, XS effort,
removes the only structural blocker to deploying. Not optional.

Your preferred sequence (Phase A polish → Phase B real data → Phase C coach/
settings/cleanup) is sound **with one adjustment**, explained below.

**Phase A — Polish & design cleanup**
- Landing polish · Dashboard polish · Games polish · Analysis polish · Improve
  polish · global design-system cleanup · responsive QA.
- *Note:* polish is mostly layout/spacing/hierarchy — **data-agnostic**, so doing
  it before real-data wiring is not wasted. Exception: don't over-invest in
  Dashboard/Improve *content* layout until §B settles their real shape.

**Phase B — Real data**
- Dashboard real data · Improve real data · Review Mistakes real data · Progress ·
  Statistics.
- Reuse the existing legacy aggregation (`lib/weaknessProfile.ts`, the
  `user_statistics` trigger). The hooks were built for a one-file swap.

**Phase C — Remaining features & cutover**
- Coach (build minimal against the existing Gemini edge function, or soften copy) ·
  Settings (account/platforms/depth/appearance → activates Ivory theming) · Profile
  · Phase 11 cleanup (delete legacy + `--cm-*` + duplicates; re-theme landing).
  Cutover is the one irreversible step — do it last, after a stable release of B.

**Recommended adjustment (audit-driven):** The single CRITICAL *functional* blocker
is fabricated Dashboard data (§DATA_FLOW). If a public release is near, **pull
"Dashboard real data" and "Improve real data" forward to run in parallel with
Phase A**, because trust outranks polish. If the goal is internal/visual sign-off
first, your A-before-B order is fine. Either way: **Phase 0 first, cutover last.**

---

## 11. Definition of Production Ready (v1.0)

ChessMate is v1.0 when **all** of the following are true:

1. `main` is the real trunk; CI builds and deploys from it; stale branches pruned.
2. `npm run build`, `npm run typecheck`, `npm test`, `npm run test:e2e` all pass on
   `main` and are recorded green.
3. **No fabricated data reaches an authenticated user.** Dashboard, Improve, and
   Review Mistakes read the user's real `games` / `move_analysis` /
   `game_analysis_results` / `user_statistics`. Empty/onboarding states render when
   the user has no analyzed games.
4. Every screen advertised on the landing page exists (Coach built, or its copy
   removed/softened).
5. Settings and Profile are reachable and functional (account, connected platforms,
   analysis depth, appearance/theme). The Ivory theming system has a real control.
6. One design system: `--cm-*` removed, legacy app + duplicate primitives/charts/
   toast deleted, landing re-themed on Ivory. No `?ff=-ui.newShell` legacy fallback.
7. Responsive QA passes at desktop/laptop/tablet/mobile with no overflow or
   broken layouts; a11y axe suite green per screen.
8. Production observability configured (Sentry DSN) and a documented rollback
   (flag-based for screens; tagged release pre-cutover).
9. This document (`CURRENT_PROJECT_STATE.md`) updated to reflect the shipped state.
