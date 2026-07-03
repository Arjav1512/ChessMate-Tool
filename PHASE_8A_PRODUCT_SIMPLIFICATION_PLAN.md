# Phase 8A — Product Simplification Plan

> **Authority:** `DESIGN_SIMPLIFICATION_REVIEW.md` (the verdict) · `CHESSMATE_SYSTEM_DESIGN.md` (§3 "clarity over density, one primary per region"; §4.1/§4.2/§8/§9) · `DESIGN_COMPLIANCE_AUDIT.md`. Documentation wins.
> **Goal:** turn ChessMate from an *analytics dashboard* into a *coaching product* — one hero per screen, delete what another screen already owns, demote analytics that don't drive a next action.
> **Scope (this phase):** Dashboard · Games · Improve · Analysis. **Composition-only** (which regions render + their weight); no data/hooks/routing/contract changes. **Plan only — no implementation.**

---

## Governing principle
Every screen earns **one job** and presents **one hero**; everything else is supporting context or a link into the screen that actually owns it. The Dashboard is the largest lever (today it mirrors Improve and adds charts).

## Migration strategy (applies to all four screens)
- **Composition, not deletion.** Remove regions from a page's *render*, but **keep the components** (`RatingTrendCard`, `RecentGamesCard`, `CoachSummaryCard`, `MilestonesCard`, etc.) in the codebase for relocation/reuse. Their hooks stay; only the page stops rendering them.
- **Relocate, don't discard.** `RatingTrendCard` → the future **Progress** screen (Phase 9, currently a placeholder). `RecentGamesCard` content already lives in **Games**.
- **No data/contract churn.** No hooks, queries, routing, flags, or a11y semantics change — only what each page composes.
- **Reversible.** Each screen's simplification is an isolated page-level change; revert = re-render the region. Could ship behind a sub-flag if a canary is wanted, but the cutover defaults already gate the shell.
- **Sequence:** Dashboard (highest ROI) → Games → Improve → Analysis. Visual-review gate before any PR, per prior phases.

---

## 1. Dashboard — from console to home

**Current regions (7, co-equal):**
1. Improvement Score (`ImprovementScoreCard`) — ring + drivers + 2 metrics
2. Rating Trend (`RatingTrendCard`) — line chart + range toggle
3. Biggest Weaknesses (`BiggestWeaknessesCard`) — 3 rows
4. Weekly Focus (`FocusCard`) — hero + metrics + CTA
5. Recently Analyzed (`RecentGamesCard`) — 5 game rows
6. Improvement Roadmap (`RoadmapTimeline`) — milestone nodes
7. Coach Summary (`CoachSummaryCard`) — text + Ask coach

**Remove (relocate, keep component):**
- **Rating Trend** → Progress (Phase 9). Pure analytics; no next action.
- **Recently Analyzed** → Games owns "find a game." (Optionally keep a single "Jump back in → last game" link, not a 5-row table.)
- **Coach Summary** block → Coach is contextual; at most a one-line nudge under the focus.

**Merge:**
- **Biggest Weaknesses + Roadmap** → one compact **"Your plan"** glance that **links into Improve** (`Continue improving →`), instead of reproducing Improve's content.

**Demote:**
- **Improvement Score** → from a hero card to a **compact momentum line** (one verdict sentence + score), above/beside the focus, supporting it.

**New hierarchy (3 regions):**
1. **Momentum line** (score verdict — "You're improving steadily")
2. **Weekly Focus — the hero** (the one next move)
3. **"Your plan" link-strip** (top weakness + milestone → Improve)

**Primary CTA:** **Continue improving →** (single; the focus action). Import games becomes a quiet secondary in the header.

**Expected user behavior after:** lands → reads "I'm improving" in one glance → sees the one thing to work on → clicks into it. No scanning a 7-card grid; no "which chart matters?"

```
BEFORE (console)                         AFTER (home)
┌───────────────┬───────────────┐        ┌──────────────────────────────────┐
│ Improvement   │ Rating Trend  │        │ ▸ momentum: "improving steadily 66"│
│ Score (hero)  │ (chart, hero) │        ├──────────────────────────────────┤
├───────┬───────┼───────────────┤        │ ★ WEEKLY FOCUS (HERO)             │
│ Weak  │ Focus │ (focus hero)  │        │   Convert winning rook endgames   │
│ -ness │ hero  │               │        │   [ Continue improving → ]        │
├───────┴───────┼───────┬───────┤        ├──────────────────────────────────┤
│ Recently      │ Road  │ Coach │        │ Your plan → top weakness · next   │
│ Analyzed (5)  │ -map  │ summ. │        │ milestone   [ see plan → Improve ]│
└───────────────┴───────┴───────┘        └──────────────────────────────────┘
   7 regions, 3 "heroes"                     3 regions, 1 hero
```
**Effort:** **M** (page recomposition + the new momentum line + plan-strip; relocate RatingTrend). **Visual impact:** Very High.

---

## 2. Games — from report to finder

**Current regions:**
1. Header + import actions
2. **Quick-insight strip** (3 MetricCards: most-common-mistake · best-opening · avg-accuracy) — *2 of 3 empty ("Analyze games to see")*
3. Collections chips
4. Filter toolbar (search + result/color/time + sort + view toggle)
5. Game table / card list

**Remove:**
- **Quick-insight strip** — analytics filler that opens the screen with mostly-empty metrics. (Optionally replace with a single contextual line: "42 games · 7 analyzed.") The `computeInsights` helper stays for potential reuse on Progress.

**Merge:** none — Collections + filter toolbar belong together already.

**Demote:** nothing else; the table is the right content.

**New hierarchy:**
1. Header (title + **Import PGN** primary)
2. Collections + filter toolbar (the finder controls)
3. **Game table — the hero**

**Primary CTA:** **Import PGN →** (header). The table rows' action = open in Analysis.

**Expected user behavior after:** lands → immediately scans/searches/filters games → opens one. The library feels like a fast finder, not a stats report.

```
BEFORE                                   AFTER
┌──────────────────────────────────┐     ┌──────────────────────────────────┐
│ Your games        [Import]        │     │ Your games   42·7 analyzed [Import]│
├──────────────────────────────────┤     ├──────────────────────────────────┤
│ [mistake —][best opening][acc —]  │ ✂   │ collections · filters             │
├──────────────────────────────────┤     ├──────────────────────────────────┤
│ collections · filters             │     │ ▦ GAME TABLE (HERO)               │
│ ▦ table                            │     │ …                                 │
└──────────────────────────────────┘     └──────────────────────────────────┘
```
**Effort:** **S** (remove a region + optional one-line replacement). **Visual impact:** High.

---

## 3. Improve — refine the hierarchy (it earns its density)

**Current regions:**
1. Header + view switcher (Plan / Review mistakes)
2. Weekly Focus (`WeeklyFocusCard`) + Skill Radar (`SkillProfileCard`) — top row, near-equal weight
3. Weakness profile (filter + 2×2 cards)
4. Study Plan (`StudyPlanCard`)
5. Study Goals (`MilestonesCard`)

**Remove:** nothing — Improve is the differentiator and should be rich.

**Merge:**
- **Study Goals → into the Study Plan column** (goals are the plan's outcomes; two ordered lists side-by-side compete). One "Plan & progress" region.

**Demote:**
- **Skill Radar** → supporting/quieter; the **Weekly Focus must clearly out-weigh it** in the top row (it is orientation, not action).

**New hierarchy:**
1. **Weekly Focus — the hero** (one action), radar as a quiet companion
2. Weakness profile (the "why")
3. **Plan & progress** (study plan with milestones folded in — the "what to do + how far")

**Primary CTA:** **Continue · session N** (Weekly Focus). One, unchanged.

**Expected user behavior after:** lands → the one focus dominates → scans weaknesses → follows the plan. The radar informs without competing; goals reinforce the plan instead of forming a parallel list.

```
BEFORE                                   AFTER
┌──────────────┬──────────────┐          ┌───────────────────┬──────────┐
│ Weekly Focus │ Skill Radar  │          │ WEEKLY FOCUS (HERO)│ radar    │
│ (hero)       │ (≈equal)     │          │  [ Continue · N ]  │ (quiet)  │
├──────────────┴──────────────┤          ├───────────────────┴──────────┤
│ Weakness 2×2 (+filter)       │          │ Weakness 2×2 (+filter)        │
├──────────────┬──────────────┤          ├───────────────────────────────┤
│ Study Plan   │ Study Goals  │   merge  │ Plan & progress (plan+goals)  │
└──────────────┴──────────────┘          └───────────────────────────────┘
```
**Effort:** **M** (fold goals into plan; rebalance top row weight). **Visual impact:** Med–High.

---

## 4. Analysis — declutter the rail (already strongest)

**Current regions:**
- Board + Eval Bar (hero — correct) · player bars · controls · Eval Timeline
- Right rail: tabs (Analysis/Coach/Lines) · **Move-quality counts** strip · **Insight card** · **Coach note** · Move list

**Remove:** nothing.

**Merge:**
- **Coach note → into the Insight card** (two adjacent "here's what to learn" blocks = two voices; one insight with an inline "Ask coach" is cleaner).

**Demote:**
- **Move-quality counts** strip (6 chips) → a quiet caption/summary line, not a band competing with the insight.

**New hierarchy:**
1. **Board + the single Insight** ("the turning point") — the hero pairing
2. Move list (navigation)
3. counts as a quiet caption; Coach folded into the insight

**Primary CTA:** **Send to Improve** (on the insight) — single; Ask coach becomes inline/secondary.

**Expected user behavior after:** studies the board → reads one clear lesson → sends it to Improve. One voice telling them what happened, not a stats panel + two coach blocks.

```
BEFORE (rail)                 AFTER (rail)
┌ counts ▮▮▮▮▮▮ ┐             ┌ Insight (HERO)         ┐
│ Insight card  │     merge   │  "the turning point"   │
│ Coach note    │  ────────▶  │  [Send to Improve] ·ask│
│ Move list     │             │ counts (quiet caption) │
└───────────────┘             │ Move list              │
                              └────────────────────────┘
```
**Effort:** **S–M** (merge two blocks; demote one strip). **Visual impact:** Med.

---

## Effort & impact summary

| Screen | Change | Effort | Visual impact |
|---|---|---|---|
| Dashboard | 7 → 3 regions; one hero; relocate charts | **M** | **Very High** |
| Games | remove insight strip; table is hero | **S** | High |
| Improve | merge goals→plan; demote radar | **M** | Med–High |
| Analysis | merge coach→insight; demote counts | **S–M** | Med |

**Sequence by ROI:** Dashboard → Games → Improve → Analysis.

## Risk assessment

| Risk | Severity | Mitigation |
|---|---|---|
| Removing regions hides data users relied on | Med | **Relocate, don't delete** (RatingTrend→Progress; RecentGames lives in Games). Nothing becomes unreachable; links replace duplication. |
| "Dashboard feels empty" after going 7→3 | Med | Solve with composition (a confident hero + generous canvas), per §3 — the goal *is* fewer, stronger elements. |
| Hooks/queries become orphaned | Low | Keep components + hooks; only the page stops rendering them. No data-layer change. |
| Regression in functionality/a11y | Low | Composition-only; route-focus, roles, and primaries preserved; re-run unit + axe e2e. |
| Improve merge changes the plan's meaning | Low | Goals fold *into* the plan as progress markers; no data change, same items. |
| Scope creep into a redesign | Med | Strictly remove/merge/demote existing regions; **no new components or features**. |

## Definition of done (when implemented later)
- Each screen has **one** unmistakable hero + **one** primary CTA.
- No screen reproduces another screen's content (Dashboard stops mirroring Improve; Games stops opening with analytics).
- Removed components relocated or retained (not deleted); hooks intact.
- Unit + a11y e2e green; visual review gate (before/after) approved before any PR.

---
*Plan only — no code, branch, or PR. Awaiting approval to implement (Dashboard first).*
