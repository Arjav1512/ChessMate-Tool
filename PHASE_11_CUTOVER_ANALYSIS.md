# Phase 11 (partial) — Ivory Cutover Analysis

> **Authority:** `CHESSMATE_SYSTEM_DESIGN.md` §3/§4/§15 · `CHESSMATE_IMPLEMENTATION_ARCHITECTURE.md` §22 (strangler/cutover), §23 (flags) · `PROJECT_STATE.md`. Documentation wins.
> **Scope:** make the Ivory shell the **default** post-auth experience (flip the strangler flags), preserving instant rollback. This is the §22 "cutover" step done **partially** — screen-by-screen — for the four production-ready screens. Legacy removal (the full §22 "cleanup") is **not** in scope.

---

## Executive summary
The Ivory implementation is complete and correctly wired; it is simply **flag-gated OFF by default** (`resolveInitialFlags()` bases on `emptyFlags()` → all `false`). Today `main.tsx → App.tsx` renders the legacy modal app for authed users because `ui.newShell` is OFF.

**4 of 5 primary nav destinations are production-ready** (Dashboard, Analysis, Improve, Games). **Coach (the 5th primary) is still a placeholder** (Phase 8), as are the secondary routes (Weaknesses/Progress → Phase 9, Settings/Profile → Phase 10). These render the graceful `PlaceholderPage` — **no route breaks** on cutover.

**Recommended controlled cutover:** flip the flag **defaults** so `ui.newShell` + `ui.screen.{dashboard,analysis,improve,games}` default ON; leave Coach/Weaknesses/Progress/Settings/Profile default OFF (graceful "coming soon"). Keep the `App.tsx` `if(newShell)` gate intact — it **is** the rollback switch (`?ff=-ui.newShell` → legacy). Minimal (one file: `flags.ts`), fully reversible.

**Caveat (transparency):** the brief said "if **all** primary routes are production-ready, proceed." Strictly, Coach is not (placeholder). The cutover is still **safe** (Coach renders a graceful placeholder, rollback preserved), so this proceeds as a *controlled, screen-by-screen* cutover per §22 — but the Coach/secondary placeholder state is called out so you can hold the merge if you'd rather wait for Phase 8.

---

## 1. Current routing architecture
```
index.html → src/main.tsx → <App/> (src/App.tsx, LEGACY entry)
   ├─ loading → spinner
   ├─ DEV && ?shell latch ──────────────► <AppRouter/>   (dev preview)
   ├─ passwordRecovery ────────────────► <PasswordResetComplete/>
   ├─ !user ───────────────────────────► <LandingPage/> | <AuthForm/>
   ├─ newShell (ui.newShell flag) ─────► <AppRouter/>    ← THE GATE (default OFF today)
   └─ else ────────────────────────────► legacy modal app (no router; ignores URL)

<AppRouter/> = BrowserRouter; each route gated by ui.screen.<name> → real screen | PlaceholderPage
```
Two gates: (1) **shell** `ui.newShell` in `App.tsx`; (2) **per-screen** `ui.screen.*` in `AppRouter.tsx`. Legacy `App.tsx` is not a router — it ignores `location.pathname`. **No parallel/competing routers.**

## 2. Legacy vs Ivory route map (route-readiness)
| Route | Component | Flag | State |
|---|---|---|---|
| `/dashboard` | `DashboardPage` | `ui.screen.dashboard` | ✅ **Ready** (Phase 4) |
| `/analysis`, `/analysis/:id` | `AnalysisPage` | `ui.screen.analysis` | ✅ **Ready** (Phase 5) |
| `/improve`, `/improve/mistakes` | `ImprovePage`/`ImprovePlanView`/`ReviewMistakesView` | `ui.screen.improve` | ✅ **Ready** (Phase 6 + 7-workstream) |
| `/games`, `/games/import`, `/games/:id` | `LibraryPage`/`ImportPage`/→Analysis | `ui.screen.games` | ✅ **Ready** (Phase 7) |
| `/coach` | `PlaceholderPage` | `ui.screen.coach` | ⏳ Placeholder (Phase 8) |
| `/weaknesses` | `PlaceholderPage` | `ui.screen.weaknesses` | ⏳ Placeholder (Phase 9) |
| `/progress` | `PlaceholderPage` | `ui.screen.progress` | ⏳ Placeholder (Phase 9) |
| `/settings` | `PlaceholderPage` | `ui.screen.settings` | ⏳ Placeholder (Phase 10) |
| `/profile` | `PlaceholderPage` | `ui.screen.profile` | ⏳ Placeholder (Phase 10) |
| `/`, `*` | → `/dashboard` | — | ✅ redirect |

## 3. Which routes would break on cutover today?
**None break.** The four ready screens render their real Ivory UI; the five unbuilt routes render the graceful `PlaceholderPage` (a designed state, not an error). The only user-visible gap: **Coach** (primary nav) + Settings/Profile (user menu) show "coming soon."

## Safe cutover strategy (controlled, screen-by-screen — §22)
1. **Flip flag defaults** (`flags.ts`): default-ON = `ui.newShell`, `ui.screen.dashboard`, `ui.screen.analysis`, `ui.screen.improve`, `ui.screen.games`. Everything else stays default-OFF.
2. **Do NOT change the `App.tsx` gate** — `if(newShell) return <AppRouter/>` now passes by default for authed users; the gate remains the rollback switch.
3. **Auth flow unchanged** — logged-out users still get Landing/Auth; only the post-auth experience swaps to Ivory.
4. Legacy components/routes remain in the tree (removal = a later §22 cleanup, after a deprecation window).

## Risks
| Risk | Severity | Mitigation |
|---|---|---|
| Coach (primary) shows a placeholder | Medium (UX gap, not a break) | Graceful PlaceholderPage; ship Phase 8 next; or hold merge until then. |
| Settings/Profile (user menu) placeholders | Low | Graceful; Phase 10. |
| A user with legacy muscle memory is surprised | Low | Ivory is the approved target; rollback available. |
| Real-data screens (Games/Analysis/Improve) need a live session | Medium | They already query Supabase with auth; logged-out never reaches them. |
| Flag-store persistence masks the new default | Low | `resolveInitialFlags` = defaults ← storage ← URL; empty storage → new defaults; URL override still wins for rollback. |

## Rollback strategy (instant, preserved)
- **Per-session emergency rollback to legacy:** append `?ff=-ui.newShell` → renders the legacy app immediately (URL override beats defaults).
- **Per-screen rollback to placeholder:** `?ff=-ui.screen.games` (etc.).
- **Code rollback:** revert the single `flags.ts` default change (one commit) → back to all-OFF.
- **Deploy rollback:** redeploy the previous build (§22 release flow).
- The `App.tsx` `if(newShell)` gate and all flags remain in place — nothing about the rollback path is removed.

## Recommended flag changes
| Flag | Before | After |
|---|---|---|
| `ui.newShell` | OFF | **ON** |
| `ui.screen.dashboard` | OFF | **ON** |
| `ui.screen.analysis` | OFF | **ON** |
| `ui.screen.improve` | OFF | **ON** |
| `ui.screen.games` | OFF | **ON** |
| `ui.screen.coach` | OFF | OFF (placeholder) |
| `ui.screen.weaknesses` | OFF | OFF (placeholder) |
| `ui.screen.progress` | OFF | OFF (placeholder) |
| `ui.screen.settings` | OFF | OFF (placeholder) |
| `ui.screen.profile` | OFF | OFF (placeholder) |

Implementation note: introduce a `DEFAULT_ON` set in `flags.ts`; base `resolveInitialFlags()` (and `reset()`) on it instead of `emptyFlags()`. Update `flags.test.ts` (the "defaults every flag OFF" assertion) to the new default profile.

---
*Analysis for the controlled cutover. Implementation follows in this branch; PR opens for review, not merge.*
