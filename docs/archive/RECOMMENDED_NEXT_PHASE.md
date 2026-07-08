# RECOMMENDED_NEXT_PHASE.md

Ordered plan to get from "B-phase merged" to "v1 launch." Derived from
`FINAL_RELEASE_READINESS_REPORT.md` + `CRITICAL_BUGS.md`. Smallest, highest-trust
steps first. Each is independently shippable.

---

## Step 0 — Land the stack (mechanical, do first)
Merge in dependency order so the real-data work and its DB fix land together:
```
#42 fix/move-analysis-grants   (DB grants — already applied live)
#39 B2 review-mistakes
#40 B3 improve
#41 B4 dashboard
```
Then **reconcile `main`** (RELEASE BLOCKER #2): fast-forward/PR the integrated
branch into `main` so there is a real, deployable trunk. CI must build + run unit
+ e2e from `main`. Prune the stale branches.
**Effort:** S · **Blocks:** everything downstream (no trunk today).

## Step 1 — Fix accuracy (CRITICAL, BUG-1)
Convert eval→win% before applying the accuracy curve; recompute per-move win%-loss
→ mean → `accuracyFromAvgCpLoss`. Backfill is automatic (analysis re-derives on
read for already-analyzed games once the formula changes, or add a re-analyze
path). Add a unit test: clean game ≈ 85–95%, blunder-heavy ≈ 30–50% (not 0%).
**Effort:** S–M · **Why first after Step 0:** it's the single most visible "looks
broken" bug on real data, and it poisons the accuracy the profile surfaces.
**Rollback:** pure function change behind tests; trivial revert.

## Step 2 — Honest error + loading states (HIGH, BUG-2, BUG-3)
- Thread `isError`/`isLoading` from `useImproveData`; render `ErrorState` + a
  loading skeleton in `ImprovePlanView` and `DashboardPage` (match Review Mistakes).
This removes the "DB error looks like onboarding" trap and the Improve flash.
**Effort:** S · **Rollback:** UI-only, behind the same hooks.

## Step 3 — Bound the data fetch (HIGH, BUG-4)
Move weakness/mistake aggregation server-side (a Postgres view or RPC returning
per-phase + per-classification counts and the top-N mistakes), or cap + paginate
`move_analysis` reads. Keep the client mapping; swap only the source.
**Effort:** M · **Why now:** required before onboarding real users with large
histories; also halves the dashboard cold-load fetch burst (§9) as a side effect.
**Rollback:** the hook is the single swap point.

## Step 4 — Dashboard fetch hygiene (MEDIUM, §9)
Share one `useWeaknessProfile` across the 3 dashboard hooks (lift to a small
context/provider or a single `useDashboardData` hook the cards read), and memoize
`profileToDashboard`. Removes the 3× cold-load fetch + per-render recompute.
**Effort:** S–M · Naturally folds into Step 3.

## Step 5 — Operational readiness (MEDIUM)
- Configure **Sentry DSN** in the prod env (error monitoring is currently off).
- Tighten the move_analysis grant to `authenticated` + `service_role` (BUG-5).
- Delete the throwaway QA account + its data from the live DB.
- Confirm the **Gemini `chess-mentor` edge function** is deployed (the Analysis
  Coach degrades gracefully without it, but it's advertised).
**Effort:** S.

## Step 6 — Close the advertised-but-missing gaps (HIGH for "v1", separate phase)
Build **Settings** (account / connected platforms / analysis depth / appearance —
also activates the dormant Ivory theming) and **Profile**; either build a
**Coach** screen against the existing Gemini function or soften the landing copy.
These are real screens, not data wiring — schedule as their own phase (Phase C in
the canonical roadmap). **Effort:** M–L.

## Step 7 — Phase 11 cutover (MEDIUM, last)
Only after Steps 1–6 are stable in prod: remove the legacy app + `--cm-*` tokens
+ duplicate primitives/toasts, re-theme the landing onto Ivory, drop the
`?ff=-ui.newShell` rollback path. Irreversible — do last, tag a pre-cutover release.

---

## Recommended ordering rationale
1. **Step 0** unblocks deployment (no trunk today).
2. **Steps 1–2** make real data *trustworthy and honest* (accuracy + error/loading)
   — cheap, high-visibility, behind tests.
3. **Steps 3–4** make it *scale* before real users with big histories arrive.
4. **Step 5** makes it *operable* in prod (monitoring, secrets, cleanup).
5. **Step 6** closes the feature gaps the landing promises.
6. **Step 7** retires the legacy system once nothing depends on it.

## Definition of v1 (delta from canonical CURRENT_PROJECT_STATE §11)
Add to the existing v1 checklist:
- [ ] Accuracy reads plausibly on real games (BUG-1 fixed; tested).
- [ ] Improve/Dashboard show error + loading states, not onboarding, on failure/while loading.
- [ ] `move_analysis` reads are bounded/server-aggregated.
- [ ] Sentry configured; QA test data purged; grants least-privilege.

## Explicitly NOT now
No new analysis engine, no design-system migration ahead of Step 7, no scope beyond
the blockers above. The B-phase code itself needs no rework — it's mergeable as-is;
these steps build on top of it.
