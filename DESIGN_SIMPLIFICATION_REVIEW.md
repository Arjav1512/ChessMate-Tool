# Design Simplification Review — Senior Product-Design Verdict

> **Lens:** information hierarchy · cognitive load · card composition · layout structure · premium feel · coaching-first. **Structural recommendations only** — not accessibility, CSS, spacing, or typography. **No implementation.**
> **Evidence:** current post-remediation state, `/tmp/cmaudit/after-*.png` (Dashboard, Games, Analysis, Improve, Review Mistakes).

---

## The core diagnosis (why it still feels like analytics)

Two structural patterns make the product read as a dashboard, not a coach:

1. **No single hero per screen.** Most screens present a *grid of equal-weight cards*. The eye has no focal point, so it scans instead of being led. A premium coaching product makes **one** thing dominant and subordinates everything else.
2. **Screens duplicate each other's data as metric-card strips.** The Dashboard re-shows Improve's weaknesses, focus, roadmap, and coach summary, then adds pure analytics (rating trend, recently analyzed). "Metric strips everywhere" *is* the analytics smell.

**The fix is editorial, not cosmetic:** each screen earns one job and one hero; remove what another screen already owns; demote analytics that don't drive a next action. The biggest single lever is the **Dashboard** — today it is a second Improve plus a stats console.

---

## Dashboard — the primary offender

Today: 7 co-equal regions (Improvement Score, Rating Trend, Biggest Weaknesses, Weekly Focus, Recently Analyzed, Roadmap, Coach Summary). It tries to be a command center; it should be a **home that answers "how am I doing, and what's my one next move?"**

- **Remove:** **Rating Trend chart** (pure analytics; belongs in Progress) · **Recently Analyzed** list (Games owns "find a game"; at most keep a single "Jump back in → last game") · **Coach Summary** block (Coach is contextual; a one-line nudge at most).
- **Merge:** **Biggest Weaknesses + Roadmap** into a single compact "Your plan" glance that **links into Improve** rather than reproducing it.
- **Demote:** **Improvement Score** from a hero card to a **compact momentum line** (one verdict sentence + score), supporting — not competing with — the focus.
- **Primary element:** the **Weekly Focus** ("Convert winning rook endgames" + the one Start/Continue action). The whole screen should orient around *the next move*.
- **Clutter:** the rating chart and the recently-analyzed table — both heavy, both duplicative/analytics.
- **Breaks hierarchy:** three things read as "hero" (Score, Rating Trend, Weekly Focus). Pick one (Focus).

**Target:** ~3 regions — momentum line · **Weekly Focus hero** · a single "your plan" link-strip. From 7 → 3.

---

## Games — leads with a stats strip instead of the job

Today: a 3-card quick-insight strip (Most common mistake · Best opening · Avg accuracy) sits *above* the table — and **two of the three are empty** ("Analyze games to see"). The screen's job is "find a game," but it opens with half-empty analytics.

- **Remove:** the **3-card quick-insight strip** (analytics filler; mostly empty). If anything, one contextual line ("42 games · 7 analyzed").
- **Merge:** Collections + filter toolbar are fine together; no change needed.
- **Demote:** nothing else — the table is the right content.
- **Primary element:** the **game table/list** (find + open a game), with search/filter as its controls.
- **Clutter:** the insight strip; the empty metric cards especially.
- **Breaks hierarchy:** opening with a metrics row signals "analytics product" before the user reaches the actual tool.

**Target:** search/filter → table. The library should feel like a fast finder, not a report.

---

## Improve — the differentiator; closest to right, but over-stacked

Today: Weekly Focus + Skill Radar (top), Weakness 2×2 + filter, Study Plan, Study Goals. Good bones (it's the one screen that *should* be rich), but it stacks five heavy regions and the hero doesn't dominate enough.

- **Remove:** nothing outright — this screen earns its density.
- **Merge:** **Study Goals into the Study Plan** (goals are the plan's outcomes; two ordered lists side by side compete). One "plan + progress" column.
- **Demote:** the **Skill Radar** to supporting (it's orientation, not action); the Weekly Focus should be visually unmistakably the hero above it.
- **Primary element:** **Weekly Focus** (one action), then the Weakness→Plan path beneath it.
- **Clutter:** Study Goals as a separate region next to Study Plan; the radar competing with the focus for the top-right.
- **Breaks hierarchy:** top row gives Focus and Radar near-equal weight; the radar should clearly recede.

**Target:** Focus hero → Weaknesses → one Plan(+goals) column, radar as a quieter支持 element.

---

## Analysis — structurally the strongest; light touch

Today: board dominant (correct), right rail = move-quality counts + insight card + coach note + move list + eval timeline. Insight-first, one board hero — this is the model the other screens should follow.

- **Remove:** nothing.
- **Merge:** the **Coach note into the Insight card** (two adjacent "here's what to learn" blocks read as two voices; one insight with an inline "ask coach" is cleaner).
- **Demote:** the **move-quality counts strip** (6 colored chips) — it's a stats summary; make it a quiet caption, not a band.
- **Primary element:** the **board + the single insight** ("the turning point").
- **Clutter:** counts strip + the duplicate coach/insight blocks.
- **Breaks hierarchy:** minor — two insight voices stacked.

**Target:** board hero · one insight (with inline coach) · move list. Already close.

---

## Review Mistakes — well-structured master/detail; minimal

Today: priority feed (left) + drill detail (right) with one primary. This is correct coaching structure.

- **Remove:** nothing.
- **Merge:** the **two filter rows (phase segmented + motif chips) into one** wrapping control — two filter bands read as heavy.
- **Demote:** nothing.
- **Primary element:** the **selected mistake's drill + "Open in Analysis."** Correct already.
- **Clutter:** the double filter row only.
- **Breaks hierarchy:** none significant.

**Target:** keep as-is; collapse filters to one row.

---

## Navigation — fine structurally; the problem is what it leads to

The sidebar (Dashboard/Games/Analysis/Improve/Coach) is clean and conventional — no structural change needed. The real issue is **Dashboard duplicating Improve**, which makes two of the five destinations feel redundant. Fixing the Dashboard (above) makes the IA feel intentional: Dashboard = orient + one action; Improve = the full plan; they stop overlapping.

- **Remove/Merge/Demote:** none in the nav itself.
- **Note:** once Dashboard is de-duplicated, the five destinations each have a distinct job — the nav will *feel* premium because the screens behind it stop repeating.

---

## High-impact changes — ranked by ROI

ROI = visual/experiential impact ÷ effort. (Effort: S ≤ small region change · M = re-composition · L = larger restructure.)

| # | Change | Screen | Visual impact | Effort | ROI |
|---|---|---|---|---|---|
| 1 | **Remove the Rating Trend chart** (move to Progress) | Dashboard | **Very High** | **S** | ★★★★★ |
| 2 | **Remove the quick-insight metric strip** (lead with the table) | Games | **High** | **S** | ★★★★★ |
| 3 | **Remove Recently Analyzed** (or collapse to one "last game") | Dashboard | High | S | ★★★★★ |
| 4 | **Make Weekly Focus the single hero; demote Score to a momentum line** | Dashboard | **Very High** | **M** | ★★★★☆ |
| 5 | **Merge Weaknesses + Roadmap + Coach into one "your plan" link-strip** (stop mirroring Improve) | Dashboard | High | M | ★★★★☆ |
| 6 | **Merge Study Goals into Study Plan; demote the radar** | Improve | Med–High | M | ★★★★☆ |
| 7 | **Merge Coach note into the Insight card; demote move-quality counts** | Analysis | Med | S–M | ★★★☆☆ |
| 8 | **Collapse the two filter rows into one** | Review Mistakes | Low–Med | S | ★★★☆☆ |

**If you do only three:** #1, #2, #3 — all "S" effort, all remove analytics weight, and together they flip the *first impression* of three screens from "console" to "product." **The single highest-leverage move is the Dashboard rebuild (#1+#3+#4+#5):** it currently is the analytics feeling, and reducing it from 7 regions to 3 (momentum · focus hero · plan link) is what will make the product feel like a coach.

---

## One-line verdict
The product feels like analytics because **every screen shows everything at equal weight, and the Dashboard mirrors Improve while adding charts.** Give each screen one hero, delete what another screen already owns, and the premium coaching feel follows — no spacing or typography work required.

*Verdict only — no implementation, branch, or PR.*
