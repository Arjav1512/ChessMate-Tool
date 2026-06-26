# NEXT_IMPLEMENTATION_PLAN.md

**Mode:** Ground Truth → forward plan. **Date:** 2026-06-26.
**Base branch:** `feature/stabilization-pr1-landing` (the real trunk; see GSTACK_BRANCH_AUDIT).
**Status:** PLAN ONLY. No code, branches, or PRs created. Awaiting approval.

This plan sequences the work to take ChessMate from "renders everywhere, but the
home screen is fabricated and `main` is stale" to "trustworthy v1 on a real trunk."

---

## Guiding principle

The foundation is real (auth, import, Stockfish analysis + persistence, the shell).
The gap is the **feedback half of the loop** (real weaknesses → plan → dashboard)
plus **repo hygiene** (`main`, branches). Do the trunk reconciliation first so all
later work has a real base, then close the data gap, then finish the cutover.

---

## Implementation order (and why it's optimal)

### PR 0 — Reconcile `main` (do this first, blocks nothing downstream conceptually but unblocks everything operationally)
- **What:** Open a PR `feature/stabilization-pr1-landing → main` (or fast-forward
  `main`, since it is a pure ancestor — `git merge-base --is-ancestor` is true).
  Then branch all subsequent PRs from the updated `main`.
- **Why first:** every later change should land on a real trunk, and deploy/CI must
  run from `main`. Cheap, mechanical, removes the biggest operational risk (C2).
- **Effort:** XS (0.5 day incl. CI verification).
- **Dependencies:** none.
- **Rollback:** trivial — it's a fast-forward; revert the merge if CI is red.

### PR 1 — Wire the Dashboard to real data (closes C1, the top blocker)
- **What:** Replace the 8 sample resolvers in `features/dashboard/hooks.ts` with
  real `queryFn`s reading `game_analysis_results`, `move_analysis`, and
  `user_statistics` for `user.id`. Reuse the existing legacy aggregation logic
  (`lib/weaknessProfile.ts`, the `user_statistics` trigger) rather than inventing
  new queries. Keep the sample path **only** as the DEV `?shell` / unauth fallback,
  exactly as Games/Analysis already do.
- **Why second:** highest user-visible value; the hooks were designed for a
  "one-file swap"; the real aggregates already exist. Ship empty/onboarding states
  when the user has no analyzed games (the empty-state test already exists).
- **Effort:** M (3–5 days incl. tests).
- **Dependencies:** PR 0 (base). Real data requires authed Supabase reads — already
  available.
- **Rollback:** keep the change behind no new flag needed, but guard with a small
  `try/catch → sample` so a query failure degrades to the current behavior; or gate
  behind a transient `ui.dashboard.realData` flag if you want a kill switch.

### PR 2 — Wire Improve weaknesses to real data (closes H1)
- **What:** Feed `composePlan` from the **real** weakness profile derived from the
  user's `move_analysis` (reuse `lib/weaknessProfile.ts` / `hooks/useWeaknessProfile`)
  instead of `sampleRawWeaknesses`. Keep the Send-to-Improve queue merge intact.
  Preserve the onboarding empty state.
- **Why third:** completes the feedback loop (Analysis → weaknesses → plan →
  dashboard), and depends on the same real-data hooks proven in PR 1.
- **Effort:** M (3–4 days).
- **Dependencies:** PR 1 (shared weakness-profile wiring).
- **Rollback:** same degrade-to-sample guard.

### PR 3 — Build Settings + Profile (closes H2, unlocks dormant theming)
- **What:** Implement `/settings` (account, connected platforms placeholder,
  analysis depth, appearance → drive `themeStore` `data-accent/board/density`) and
  `/profile`. Flip `ui.screen.settings`/`profile` ON and `built:true` in
  `navigation.ts`; surface them in the user menu + ⌘K.
- **Why fourth:** unblocks user self-service and activates the already-built Ivory
  theming system; also gives the Ivory shell a theme control it currently lacks.
- **Effort:** M–L (4–6 days; Profile is small, Settings is the bulk).
- **Dependencies:** PR 0. Independent of PR 1/2 (can run in parallel after PR 0).
- **Rollback:** flags OFF + `built:false` restores Coming-Soon instantly.

### PR 4 — AI Coach: build or soften (closes H3)
- **What:** EITHER implement `/coach` against the existing `chess-mentor` Gemini
  edge function (the legacy `GameViewer` already calls it — reuse that client),
  OR adjust landing/FAQ/pricing copy to mark the coach as "coming soon."
  Recommended: ship a minimal real Coach (single-game Q&A reusing Analysis context)
  since the backend already exists.
- **Why fifth:** removes the advertise-but-absent gap; lower urgency than data trust.
- **Effort:** M (3–5 days) to build minimal; XS to soften copy.
- **Dependencies:** PR 0; benefits from PR 1/2 context but not blocked.
- **Rollback:** flag `ui.screen.coach` OFF.

### PR 5 — Phase 11 cutover: retire the legacy system (closes M1/M2)
- **What:** Delete the legacy app (`MainApp` body), `components/ui/*` (the 8
  duplicates), legacy `components/charts/*`, `components/game|stats|analysis/*`,
  the legacy `ToastContext`, and `--cm-*` from `style.css`. Re-theme
  `LandingPage.tsx` onto Ivory tokens + `ui/iv` components. Remove the
  `?ff=-ui.newShell` rollback path and the unused `Move`/`moves` interface.
- **Why last:** only safe after the Ivory app fully replaces every legacy capability
  (Settings/Coach/real data done) — until then the legacy app is the rollback net.
- **Effort:** L (5–8 days; landing re-theme + careful deletion + visual QA).
- **Dependencies:** PR 1–4 (legacy must be fully superseded first).
- **Rollback:** this is the one-way door — do it only after a stable release of
  PR 1–4 in production. Keep the legacy code in git history; tag the pre-cutover
  release.

### PR 6 — Hygiene (parallelizable, low risk)
- Prune ~25 consumed/dead branches (local + origin) after confirming merges.
- Consolidate ~45 root docs into `docs/` + archive superseded phase docs; keep one
  canonical state file. Set Sentry DSN in prod env; bump `baseline-browser-mapping`.
- **Effort:** S (1–2 days). **Dependencies:** PR 0. **Rollback:** n/a (reversible).

---

## Optimal order rationale (one line each)

1. **PR 0** gives every later PR a real base and a deployable trunk.
2. **PR 1 then PR 2** close the trust gap in dependency order (shared weakness wiring).
3. **PR 3/PR 4** finish advertised-but-missing surfaces; parallel after PR 0.
4. **PR 5** retires legacy only once nothing depends on it — the irreversible step last.
5. **PR 6** runs alongside; pure cleanup.

## Dependency graph

```
PR0 ──┬─ PR1 ── PR2 ─┐
      ├─ PR3 ─────────┼─ PR5 (cutover)
      ├─ PR4 ─────────┘
      └─ PR6 (parallel, anytime after PR0)
```

## Recommended stacked-PR structure

Stack on the updated `main`: `main → pr1-dashboard-real → pr2-improve-real`
as one stack (shared weakness code); `pr3-settings`, `pr4-coach` as independent
branches off `main`; `pr5-cutover` rebased on top once 1–4 land; `pr6-hygiene`
independent. Use small, reviewable PRs (the project's existing CodeRabbit + axe/CI
gates apply).

## Rollback strategy (per layer)

- **Data PRs (1,2):** degrade-to-sample `try/catch`, or a transient real-data flag —
  instant revert to current behavior without a deploy.
- **Screen PRs (3,4):** the `ui.screen.*` flag + `built` boolean — flip OFF to
  restore Coming-Soon with no code change.
- **Cutover (5):** not flag-reversible; mitigate by tagging the last pre-cutover
  release and shipping only after 1–4 are stable in prod.
- **Trunk (0):** fast-forward; revert the merge commit if CI breaks.

## Testing strategy

- **Before starting:** run `npm test`, `npm run test:e2e`, `npm run build`,
  `npm run typecheck` on the trunk and record the baseline (H4).
- **Per PR:** unit tests for new `queryFn`s (mock Supabase, assert VM mapping +
  empty states); update the existing per-screen a11y e2e (`e2e/*-a11y.spec.ts`);
  keep the DEV `?shell` sample path green so screenshots/a11y stay stable.
- **Data PRs:** add an integration test against the real migrations via the
  existing PGlite harness (`lib/rls.integration.test.ts` pattern) to prove
  Dashboard/Improve read what Analysis wrote, under RLS.
- **Cutover PR:** full visual QA pass (the `browse`/`design-review` skills) at
  desktop/laptop/tablet/mobile; confirm no `--cm-*` references remain
  (`grep -r -- --cm- src` returns nothing) and the landing renders on Ivory.
- **Gate:** do not merge any PR with red CI; require `tsc` clean (currently green).

---

## STOP

This is the plan. No implementation has been performed. Awaiting approval before
writing any code.
