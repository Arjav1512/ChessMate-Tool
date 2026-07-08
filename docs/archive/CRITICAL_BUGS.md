# CRITICAL_BUGS.md

Bugs found during the final audit of PRs #39–#42, ranked. Audit only — none fixed here.
Each entry: symptom · root cause (file:line) · impact · suggested fix · severity.

---

## BUG-1 — Accuracy is systematically ~0% on real games (CRITICAL)

**Symptom.** Every analyzed real game reports near-zero accuracy. Live test, 4 games:
`game_analysis_results.accuracy = 0, 2, 0, 8`. The Analysis workspace shows "**0% accuracy**" for both players despite 11+ good/best moves; the weakness profile's accuracy figures inherit it.

**Root cause.** `src/lib/analysis/moveQuality.ts:74` —
```ts
export function accuracyFromAvgCpLoss(avgCpLoss: number): number {
  const acc = 103.1668 * Math.exp(-0.04354 * Math.max(0, avgCpLoss)) - 3.1669; // Lichess curve
  return Math.max(0, Math.min(100, Math.round(acc)));
}
```
This is the **Lichess accuracy curve, which expects win-percentage loss (0–100 scale)** as its input. It is being fed **raw centipawn loss** (`cp_loss`, often 50–300). With the `-0.04354` coefficient, an input of ~50 already yields ~11%, and ~100 yields ~1% — so any real game collapses to single-digit accuracy.

The pipeline computes `cp_loss` in centipawns (`src/lib/moveAnalysis.ts:88` `evalCpBefore − evalCpAfter`) and averages those centipawns into `accuracyFromAvgCpLoss` (`useAnalysis.runAndPersist` + `accuraciesFromRows` in `src/features/analysis/hooks.ts`). The missing step: convert each eval to a **win%** first, take the win%-loss per move, then apply the curve.

**Impact.** Headline product metric is wrong and looks broken on real data. Affects Analysis (visible "0%"), `game_analysis_results.accuracy`, and the Improve/Dashboard accuracy figures derived from it. **This is the #1 thing a real user will notice.**

**Scope note.** Pre-existing (Phase 8B), not introduced by #39–#42 — but the B-phase made the downstream effects user-facing, so it must be fixed before v1.

**Suggested fix.** Map eval→win% (e.g. `winPct = 50 + 50*(2/(1+exp(-0.00368208*cp)) − 1)`), compute per-move win%-loss, then apply `accuracyFromAvgCpLoss` to the mean win%-loss. Add a unit test asserting a clean game (~10–20 cp avg) yields ~85–95%, not ~0%.

---

## BUG-2 — Improve & Dashboard swallow real DB errors into the onboarding state (HIGH)

**Symptom.** If `useWeaknessProfile` errors (e.g. games query fails / network), Improve shows "Analyze games to build your plan" and Dashboard shows "Import your first game to begin" — i.e. a brand-new-user onboarding, not an error.

**Root cause.**
- `src/features/improve/hooks.ts` — `useImproveData`: `if (useReal) { if (!profile) return EMPTY_DATA; … }`. A null profile means *loading OR error OR empty*; all three render onboarding. `ImprovePlanView` never reads `error`.
- `src/features/dashboard/hooks.ts` — `useDashboardEmptyState` returns `data: real ? real.hasData : false`; `DashboardPage` branches on `isLoading`/`data===false` only and **never checks `isError`**.
- Contrast: `ReviewMistakesView` correctly renders `ErrorState` on `error`.

**Impact.** A real backend failure is presented as "you have no data," which is misleading and hides outages. Graceful (no crash) but wrong.

**Suggested fix.** Thread `isError` through `useImproveData`; render `ErrorState` (with retry) in `ImprovePlanView` and `DashboardPage` when the profile errors, matching Review Mistakes.

---

## BUG-3 — Improve flashes the onboarding state during load (HIGH/UX)

**Symptom.** Opening `/improve` for a user *with* a plan briefly shows "Analyze games to build your plan," then snaps to the real plan when the profile resolves.

**Root cause.** `src/features/improve/ImprovePlanView.tsx:15` — `const { data } = useImproveData();` ignores `isLoading`. While loading, `profile` is null → `EMPTY_DATA` → `hasData:false` → onboarding. Dashboard avoids this (`empty.isLoading ? <Skeleton/>`); Improve has no loading branch.

**Impact.** Jarring flash of a misleading empty state on every Improve visit for real users; also an a11y concern (content shifts after focus moves to H1).

**Suggested fix.** Consume `isLoading` from `useImproveData` and render a skeleton (as Dashboard does) before deciding onboarding vs plan.

---

## BUG-4 — Unbounded `move_analysis` fetch (HIGH/scalability)

**Symptom.** Slow loads / large memory for users with many analyzed games.

**Root cause.**
- `src/hooks/useWeaknessProfile.ts:59` — `.from('move_analysis').select(...).eq('user_id', …)` with **no `.limit()`/`.range()`**.
- `src/hooks/useMistakeReview.ts:45` — same, plus `.in('classification', ['mistake','blunder'])` (narrower, but still unbounded).

A user with ~500 games × ~40 plies ≈ **20,000 rows** pulled into the browser per session, then aggregated client-side.

**Impact.** Works fine at small scale (verified: 136 rows). Degrades badly for power users; risk of slow first paint / memory pressure / Supabase row caps.

**Suggested fix.** Aggregate server-side (a Postgres view/RPC returning per-phase + per-classification counts), or paginate + cap. At minimum add a sane `.limit()` and a "showing your last N games" affordance.

---

## BUG-5 — `move_analysis` granted to `anon` (LOW/hardening)

**Symptom.** `GRANT … TO anon` in `20260627000000_grant_move_analysis_privileges.sql`.

**Root cause/assessment.** RLS has **no `anon` policy**, so anon reads return 0 rows and anon writes are denied — **verified, no data leak**. But granting INSERT/UPDATE/DELETE to `anon` is broader than needed (the app only ever acts as `authenticated`).

**Impact.** None functional; least-privilege hygiene only.

**Suggested fix.** Optional: drop `anon` from the grant (`TO authenticated` + `service_role` only). Defer unless tightening grants project-wide.

---

## Not bugs (verified OK)
- Type safety: no unsafe casts; `tsc` clean.
- Data consistency Improve↔Dashboard: same profile + `composePlan` → consistent.
- Empty states, mobile reflow, a11y, RLS enforcement, indexes: all verified good.
- No regressions in 247 unit + 98 e2e.
