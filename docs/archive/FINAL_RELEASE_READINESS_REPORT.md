# FINAL_RELEASE_READINESS_REPORT.md

**Scope:** combined production-readiness audit of PRs **#39 (B2)**, **#40 (B3)**, **#41 (B4)**, **#42 (DB grants)**.
**Date:** 2026-06-28 · **Mode:** audit only, no code modified.
**Integrated state reviewed:** `phaseB/b4-dashboard` (B2+B3+B4 stacked) + `fix/move-analysis-grants` (#42).
**Combined diff:** 11 code files (+482/−61) + 1 migration.

---

## Verdict

- **The four PRs are well-built and mergeable.** Full suites green, types clean, real-data loop verified live end-to-end. The real/sample-in-DEV-preview pattern is applied consistently and honestly.
- **The product is NOT yet v1-launch-ready** — blocked primarily by a **pre-existing accuracy bug now exposed on real data** and the **lack of a reconciled `main` trunk**. See RELEASE BLOCKERS + `CRITICAL_BUGS.md`.

Recommended action: **merge #42 → #39 → #40 → #41 in order**, then address the blockers in `RECOMMENDED_NEXT_PHASE.md` before tagging v1.

---

## Test + verification results

| Check | Result |
|---|---|
| `tsc --noEmit` | ✅ clean (exit 0) |
| `eslint` | ✅ 0 errors (6 pre-existing `react-refresh` warnings, unrelated) |
| Unit (`vitest`) | ✅ **247 / 247** pass (incl. 9 new B-phase mapping tests) |
| e2e (`playwright`) | ✅ **98 passed, 65 skipped, 0 failed** (all per-screen axe a11y specs pass) |
| Live end-to-end (real account) | ✅ Import → Analyze → Review Mistakes → Improve → Dashboard on **real data**; 136 `move_analysis` rows; 7 real mistakes; real "Sharpen your tactics" plan @ real 75% blunder rate; zero sample leak |
| Mobile (375px) with real data | ✅ no overflow; single-column reflow; bottom tabs intact |

---

## Audit by dimension

### 1. Architectural correctness — ✅ Good (one perf nit)
- Consistent pattern across Games/Analysis/Review/Improve/Dashboard: **real hook for authed users, sample only in the DEV `?shell` preview, honest empty state otherwise.**
- Reuses existing pure logic (`composePlan`, `buildWeaknessProfile`, `useMistakeReview`) — no parallel engines. B3/B4 mapping is isolated in pure, tested files (`realData.ts`, `realDashboard.ts`).
- **Nit:** `useDashboardReal()` is invoked by 3 dashboard hooks → 3 `useWeaknessProfile` instances; and it calls `profileToDashboard()` every render (not memoized). See §9.

### 2. Type safety — ✅ Clean
- `tsc` passes. **No `as any`, no `@ts-ignore`, no unsafe casts** in any B-phase file. `tsc` enforces that all five weakness branches populate the new `frequencyPct`/`phaseAccuracy` fields.

### 3. Data consistency — ✅ Consistent (one upstream data-quality issue)
- Improve and Dashboard both derive from the same `WeaknessProfile` + `composePlan`, so the focus/weaknesses agree (verified live: both show "Sharpen your tactics"). `weekOfYear()` and `phaseDeltaPct=0` are shared.
- **Upstream issue (not a B-phase defect):** the real `game_analysis_results.accuracy` is systematically ~0% (see CRITICAL_BUGS #1), so any accuracy the profile surfaces (`overallAccuracy`, category `phaseAccuracy`) inherits that wrongness.

### 4. Error handling — ⚠️ Inconsistent
- **Review Mistakes:** surfaces real errors → `ErrorState` with retry. ✅
- **Improve & Dashboard:** a real `useWeaknessProfile` error is **swallowed into the onboarding state** — `useImproveData` returns `EMPTY_DATA` when `profile` is null (error or empty), and neither `ImprovePlanView` nor `DashboardPage` checks `isError`. A genuine DB failure shows "Analyze games to build your plan" instead of an error. Misleading but graceful. See CRITICAL_BUGS #2.

### 5. Loading states — ⚠️ Inconsistent
- **Dashboard:** `empty.isLoading ? <Skeleton/>`. ✅
- **Review Mistakes:** skeleton grid while loading. ✅
- **Improve:** `ImprovePlanView` consumes only `data` (ignores `isLoading`) → during the async profile fetch `hasData` is false → **the onboarding state flashes, then snaps to the real plan**. See CRITICAL_BUGS #3.

### 6. Empty states — ✅ Strong
- Honest onboarding everywhere when data is insufficient (verified live with a 1-game user). No fabricated numbers; `milestones: []` and `phaseDeltaPct: 0` instead of fake goals/deltas.

### 7. Accessibility — ✅ Pass
- All per-screen axe specs pass (`*-a11y.spec.ts`): shell, dashboard, games, analysis, improve, review-mistakes — structural + color-contrast + focus management. B-phase changes are data-layer only; no DOM/ARIA regressions.

### 8. Mobile responsiveness — ✅ Pass
- Verified at 375px with **real** data (longer real weakness names, 7-item feed): no horizontal overflow, correct single-column reflow, bottom tab bar intact.

### 9. Performance impact — ⚠️ Scalability concerns
- **No pagination on the weakness/mistake fetches:** `useWeaknessProfile` and `useMistakeReview` `SELECT … move_analysis WHERE user_id = …` with **no `.limit()`/`.range()`**. A heavy user (hundreds of games × ~40 plies) pulls **10k+ rows** into the browser per load. See CRITICAL_BUGS #4.
- **Duplicate fetch burst:** `useWeaknessProfile` is mounted by 3 dashboard hooks concurrently; before the session cache fills, that is up to 3× the 3-query fetch on first dashboard load. Mitigated by the module cache after first load, but the cold-load burst is real.
- **Unmemoized derivation:** `useDashboardReal` recomputes `profileToDashboard()` (→ `composePlan`) on every render, ×3 hooks. Cheap but avoidable.

### 10. Potential regressions — ✅ None detected
- 247 unit + 98 e2e green. Legacy app (`ui.newShell` off), Games, Analysis, Import unaffected. Unrendered dashboard cards (`ImprovementScoreCard`, etc.) keep sample resolvers and are not on the live surface. Test mocks updated intentionally (`user: null` → DEV-sample path), mirroring `analysis.test`.

---

## RELEASE BLOCKERS for v1 (ranked)

**CRITICAL**
1. **Accuracy ≈ 0% on real games** (`CRITICAL_BUGS #1`). Analysis shows "0% accuracy"; profile-derived accuracy is wrong. Product looks broken on real data. *Pre-existing (Phase 8B), now user-facing.*
2. **No reconciled `main` trunk.** The entire product (Phase 0 + B-phase, 6+ PRs) is unmerged on feature branches; `main` is the pre-Ivory legacy app. Nothing deployable. *(carried from earlier audits)*

**HIGH**
3. Improve/Dashboard swallow real DB errors into the onboarding state (`CRITICAL_BUGS #2`).
4. Improve onboarding-flash during load (`CRITICAL_BUGS #3`).
5. Unbounded `move_analysis` fetch — scalability (`CRITICAL_BUGS #4`).
6. **Coach / Settings / Profile unbuilt** (advertised on landing; unreachable). *(carried)*

**MEDIUM**
7. Duplicate cold-load profile fetches + unmemoized dashboard derivation (§9).
8. Sentry DSN unset (no prod error monitoring).
9. `move_analysis` granted to `anon` (RLS blocks it, but least-privilege would drop anon — `CRITICAL_BUGS #5`).
10. Two design-token systems / Phase 11 cutover pending. *(carried)*

**LOW**
11. Pre-existing accuracy aside: the Analysis Coach depends on the Gemini edge function being deployed.
12. `baseline-browser-mapping` stale; throwaway test account + data left in the live DB.

---

## What's solid (don't re-litigate)
Real-data wiring for Library, Import, Analysis persistence, Review Mistakes, Improve, Dashboard; honest empty states; RLS enforced; indexes present; the DB is at schema parity. The foundation is real and working — the blockers above are correctness/operational, not architectural.
