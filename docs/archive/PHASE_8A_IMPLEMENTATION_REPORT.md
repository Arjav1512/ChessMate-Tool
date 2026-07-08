# Phase 8A — Product Simplification · Implementation Report

> **Authority:** `PHASE_8A_PRODUCT_SIMPLIFICATION_PLAN.md` → `DESIGN_SIMPLIFICATION_REVIEW.md` → `CHESSMATE_SYSTEM_DESIGN.md` → `DESIGN_COMPLIANCE_AUDIT.md`.
> **Goal:** turn ChessMate from an analytics dashboard into a coaching product — one hero per screen; delete what another screen owns.
> **Nature:** composition-only. No new features/routes/data models/API calls/screens. Removed regions were **relocated or retained**, not deleted. Functionality, responsiveness, and accessibility preserved.
> **Branch:** `feature/phase-8a-simplification` (stacked on the remediation branch). **Not merged.**

---

## What shipped (M1–M4)

### M1 · Dashboard — 7 regions → 3
- **Removed from the page (components retained for relocation):** `RatingTrendCard` (→ Progress, Phase 9), `RecentGamesCard` (Games owns "find a game"), `CoachSummaryCard`.
- **Merged:** `BiggestWeaknessesCard` + `RoadmapTimeline` → a compact **"Your plan" link-strip** (`PlanStripCard`: top weakness + active milestone → "See your plan → Improve"). Stops the Dashboard mirroring Improve.
- **Demoted:** Improvement Score → a compact **momentum line** (`MomentumLine`: score + verdict + delta + meta; reuses `useImprovementScore`).
- **Hero:** the **Weekly Focus** (`FocusCard`, full-width). **Primary CTA:** "Continue improving →" (header; the focus-card "Start session" is secondary from the prior pass).
- New composition: **momentum line → Weekly Focus hero → "Your plan" strip.**

### M2 · Games — finder, not report
- **Removed:** the 3-card quick-insight strip (`MetricCard` × 3 — two of three were empty "Analyze games to see"). Replaced with a one-line header stat ("12 games · 7 analyzed").
- **Hero:** the **game table/list.** **Primary CTA:** "Import PGN →".
- `computeInsights` helper retained in `insights.ts` for reuse.

### M3 · Improve — hierarchy refined
- **Merged:** **Study Goals into the Study Plan column** — one stacked "Plan & progress" region (`MilestonesCard` folded under `StudyPlanCard`), no longer two ordered lists competing side-by-side.
- **Demoted:** the **Skill Radar** — top row re-weighted (`1.4fr 1fr` → `1.7fr 1fr`) so the **Weekly Focus** clearly dominates. **Primary CTA:** "Continue · session N" (unchanged).

### M4 · Analysis — decluttered rail
- **Merged:** standalone `CoachNote` removed (component retained) — the `InsightCard`'s inline "Ask coach" is the single coach entry point (one voice, not two).
- **Demoted:** **move-quality counts** + accuracy summary — reordered **below** the insight as a quiet stats group (`.iv-aw__stats`). The **insight now leads** the rail. **Primary CTA:** "Send to Improve" on the insight.

---

## Components — relocated / retained vs removed-from-view

| Component | Status |
|---|---|
| `RatingTrendCard` | Retained; **relocate → Progress** (Phase 9). Not rendered on Dashboard. |
| `RecentGamesCard`, `CoachSummaryCard`, `ImprovementScoreCard`, `BiggestWeaknessesCard`, `RoadmapTimeline` | Retained (exported in `cards.tsx`); not rendered on Dashboard. |
| `CoachNote` | Retained; not rendered on Analysis. |
| `computeInsights` / `insights.ts` | Retained for reuse. |
| `MomentumLine`, `PlanStripCard` | **New compositions** built from existing hooks (no new data). |

No data models, hooks, routes, or API calls were added or changed.

---

## QA results

| Gate | Result |
|---|---|
| typecheck | ✅ |
| lint | ✅ 0 errors (6 pre-existing warnings) |
| unit/component | ✅ **238 passing** (dashboard integration + a11y tests updated to the new composition) |
| build | ✅ |
| accessibility e2e | ✅ **30/30** (dashboard a11y spec updated: rating-chart/score-img assertions → momentum/one-primary) |

**Manual verification (desktop + mobile), `?shell`:** Dashboard (3 regions, one primary), Games (table-led), Improve (focus hero, plan+goals stacked), Analysis (insight-led, counts demoted) — all render correctly; responsive stacks intact; route focus + primaries preserved.

---

## Before / After screenshots
`/tmp/cm8a/before-*.png` → `/tmp/cm8a/after-*.png` (Dashboard, Games, Improve, Analysis; + `after-m-dashboard.png`, `after-m-games.png`).
- **Dashboard:** 7-card console → momentum line · Weekly Focus hero · "Your plan" strip.
- **Games:** half-empty metric strip removed → table-led finder.
- **Improve:** radar demoted, Focus dominant; goals folded under the plan.
- **Analysis:** insight leads; coach note merged; counts demoted below.

---

## Risks & notes
- **"Dashboard feels emptier."** Intentional (§3 — fewer, stronger elements; a confident hero on a generous canvas). The momentum line + hero + plan strip answer "how am I doing / what's next" without a card grid.
- **Relocations pending their phase:** `RatingTrendCard` formally lands on the Progress screen in Phase 9; today it is simply not rendered (retained in code).
- **Deferred from the review (not in this scope):** deeper Analysis polish (eval-timeline start-state, top-rail alignment) remain as noted in the design review.

---

## Final audit summary
ChessMate now reads as a **coaching product**: every in-scope screen has **one hero and one primary action**, the Dashboard no longer mirrors Improve or shows analytics charts, and Games leads with the finder instead of a stats strip. All composition-only, with functionality and accessibility intact (238 unit / 30 a11y green).

*Implementation complete. PR opened for review — not merged.*
