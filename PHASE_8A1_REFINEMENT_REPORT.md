# Phase 8A.1 — Refinement Report

> **Authority:** `VISUAL_QA_REPORT.md` (the two Majors) · `PHASE_8A_PRODUCT_SIMPLIFICATION_PLAN.md` · `DESIGN_SIMPLIFICATION_REVIEW.md`.
> **Goal:** keep all Phase 8A simplification gains while fixing the two Major visual issues from the QA audit. Composition-only; no analytics re-added, no new features/routes/data; one-hero-per-screen preserved.
> **Branch:** `feature/phase-8a1-refinement` (stacked on `feature/phase-8a-simplification`). **Not merged.**

---

## Fix 1 · Dashboard — half-empty / over-wide hero (🟠 Major → resolved)

**Problem:** on ≥1280px the Dashboard read half-empty and the Weekly Focus hero was far too wide for its left-aligned content (empty right ~45%).

**Fix (composition only):** the success state is now a **balanced two-part composition** — the **Weekly Focus hero (left, 1.6fr)** beside a **supporting rail (right, 1fr)** that stacks the **momentum** (now a small card) and the **"Your plan"** strip. No analytics cards were re-added; the same components/data are simply arranged so the canvas fills with intent.

- Weekly Focus **remains the single hero**; momentum + plan are clearly subordinate (right rail).
- `.dash-hero-row` (1.6fr / 1fr, `align-items: stretch`) → collapses to one column ≤1023px.
- Momentum line restyled as a compact card; plan-strip items stack vertically in the rail.
- Content stays within `--content-max` (1120), centered → stable and balanced at **1440 and 1920**.

**Result:** the top of the page is a confident, full-width, balanced composition. Remaining bottom whitespace is intentional breathing room below a complete hero (a focused coaching home), not a half-built grid.

## Fix 2 · Analysis — empty accuracy boxes (🟠 Major → resolved)

**Problem:** the demoted accuracy section rendered two skeleton cards while `accuracyUser/Opponent` were null (during the progressive auto-run) — reading as broken empty placeholders.

**Fix:** `AccuracySummary` now **collapses (renders nothing) when accuracy is unavailable** instead of showing skeleton cards. Accuracy is secondary, so it simply **appears, populated, once analysis completes** — no placeholder-looking surfaces at any point.

- Verified: **0** accuracy cards while analyzing → **2 populated** cards once done ("Your accuracy 84% ▲5% vs opponent" · "Opponent 79%").
- Insight card **remains the hero**; stats stay secondary (below the insight). (Bonus: once analysis completes the Eval Timeline also shows its real curve, resolving the earlier "sparse at start" note for the completed state.)

---

## Screenshots (before → after)
- **Dashboard:** `/tmp/cmqa/d-dashboard.png` (before, half-empty) → `/tmp/cm8a1/dash-1440.png`, `dash-1920.png`, `dash-1024.png`, `dash-820.png` (after — balanced hero + rail at every width).
- **Analysis:** `/tmp/cmqa/d-analysis.png` (before, empty boxes) → `/tmp/cm8a1/analysis-load.png` (collapsed, no boxes) + `analysis-done.png` (populated accuracy under the insight).

## QA results
| Gate | Result |
|---|---|
| typecheck | ✅ |
| lint | ✅ 0 errors (6 pre-existing warnings) |
| unit/component | ✅ **238 passing** |
| accessibility e2e | ✅ dashboard + analysis + shell **11/11** (no contrast/structural regressions) |
| build | ✅ |

## Constraints honored
✅ No analytics-heavy layouts re-introduced · ✅ no new features/routes/data sources · ✅ Phase 8A not undone (regions removed in 8A stay removed) · ✅ one hero per screen preserved (Weekly Focus; Insight card) · ✅ composition-only changes.

## Remaining concerns (minor, not in this scope)
- **Dashboard vertical whitespace** below the hero/rail persists on tall viewports — inherent to a deliberately simplified 2-region home; reads as intentional margin now that the top composition is balanced. Could be tightened later by vertically anchoring the composition, but adding content/analytics would contradict the goal.
- **Improve** minors from the QA report (Study-Goals tail density; radar enlarging on tablet) and **Games** table-packs-left at 1440 were **out of scope** for 8A.1 (Minor) and remain as noted.

*Refinement complete. PR opened for review — not merged.*
