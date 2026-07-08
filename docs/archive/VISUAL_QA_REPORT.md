# Visual QA Report — PR #30 (Phase 8A Product Simplification)

> **Read-only audit.** Branch `feature/phase-8a-simplification`. Captures at desktop 1440, laptop 1024, tablet 820 (`/tmp/cmqa/*`). Lens: visual hierarchy · whitespace · card proportions · alignment · overflow/clipping · responsive · premium feel · cognitive load. **No code changed.**

## Verdict in one line
The simplification worked — hierarchy and cognitive load are excellent across all four screens. But it **over-corrected on two screens**: the **Dashboard now reads half-empty on wide viewports**, and **Analysis's demoted accuracy cards render as empty boxes**. Both are Major and undermine the premium feel the pass was meant to create.

---

## 1. Dashboard

**What works**
- Crystal-clear hierarchy: momentum line → Weekly Focus hero → "Your plan" strip. One primary ("Continue improving"). Cognitive load is very low. Type hierarchy reads premium.
- Laptop (1024) is well-proportioned — the hero fills its width, rationale wraps naturally.

**What still feels crowded** — nothing; the problem is the opposite (under-filled).

**What should be removed** — nothing further.

**What should be enlarged / rebalanced**
- The **Weekly Focus hero** is far too **wide for its left-aligned content on wide viewports (≥1280)** — the right ~45% of the hero is empty, so the card looks unbalanced/unfinished. Either constrain the dashboard content width on wide screens, or make the hero a **2-column composition** (content left, a supporting visual — e.g., the score ring or session progress — right) so it fills intentionally.

**What should be reduced**
- The **empty canvas below the fold**: at 1440×1024 the three regions occupy only the top ~45%; the lower half is void. On a premium product this reads as "unfinished," not "restraint." Cap the content column width (so regions don't stretch wide-and-short) and/or give the hero more vertical presence.

**Severity: 🟠 Major** (wide-desktop — the default view — looks empty/unbalanced; ≤1024 is fine).

---

## 2. Games

**What works**
- Table-led **finder** — exactly right. Clear scan, one primary ("Import PGN"), collections + filter toolbar read as controls, status badges legible. Header one-liner ("12 games · 7 analyzed") is a good lightweight replacement for the removed strip.
- Responsive holds: filter toolbar wraps cleanly at tablet 820; table columns fit (no horizontal overflow).

**What still feels crowded** — nothing; density is comfortable.

**What should be removed** — nothing.

**What should be enlarged** — nothing.

**What should be reduced**
- Minor: at 1440 the table content packs to the left, leaving ~25–30% empty on the right (columns don't use the width). Not broken, just slightly loose. Could widen date/opening columns or cap table width.

**Severity: 🟡 Minor.**

---

## 3. Improve

**What works**
- **Best-composed screen.** Weekly Focus clearly dominant (1.7fr), radar a quiet companion that **balances the top row** (the canvas is filled with intent). Weakness 2×2 reads well; Plan + Goals stacked in one column removes the previous side-by-side competition. Premium and coherent.

**What still feels crowded**
- Minor: the page runs long; **Study Goals at the very bottom** is a touch dense after the study plan.

**What should be removed** — nothing.

**What should be enlarged** — nothing.

**What should be reduced**
- Minor: Study Goals could be more compact (smaller rows) so the tail of the page is lighter.

**Responsive note**
- At tablet 820 (single column) the **radar becomes large again** — the desktop demotion doesn't carry to the stacked layout. Minor inconsistency; acceptable.

**Severity: 🟡 Minor.**

---

## 4. Analysis

**What works**
- M4 succeeded structurally: the **Insight card leads** the rail (board + insight is the hero pairing), one primary ("Send to Improve"), coach folded into the insight (one voice). Board dominant. Move list clean.

**What still feels crowded** — no; the rail is calmer than before.

**What should be removed / fixed**
- 🔴 The **two demoted accuracy cards below the insight render as empty dark boxes** (no visible content). After the M4 reorder they read as broken placeholders. Either confirm `AccuracySummary` is rendering its values in the new position (contrast/size) or, if empty at the start position, **hide until populated**. This is the most damaging single defect in the PR — empty cards directly contradict "premium."

**What should be enlarged** — nothing.

**What should be reduced**
- Minor: the **Eval Timeline** card (bottom-left) is sparse at the start position (a flat line) and the right rail has empty space below the move list — both largely inherent to the start state (flagged in the earlier review as deferred).

**Severity: 🟠 Major** (the empty-looking accuracy cards; the timeline sparseness remains Minor/deferred).

---

## Cross-cutting

| Dimension | Reading |
|---|---|
| Visual hierarchy | ✅ Strong on all four (one hero per screen). |
| Whitespace | ⚠️ **Over-applied on Dashboard (wide)**; good elsewhere. |
| Card proportions | ⚠️ Dashboard Weekly Focus hero too wide for content; Analysis accuracy cards empty. |
| Alignment | ✅ Consistent, except the empty Analysis accuracy cards break the rail rhythm. |
| Overflow / clipping | ✅ No horizontal overflow at any breakpoint; tablet table fits. (No true clipping; the Analysis cards are empty-content, not clipped.) |
| Responsive | ✅ Stacks correctly; minor: Improve radar enlarges on tablet. |
| Premium feel | ⚠️ Undercut by the half-empty Dashboard (wide) + empty Analysis cards. |
| Cognitive load | ✅ Excellent — the core goal is met. |

## Severity-ranked summary

| # | Screen | Issue | Severity |
|---|---|---|---|
| 1 | Analysis | Demoted accuracy cards render as empty boxes | 🟠 Major |
| 2 | Dashboard | Half-empty canvas + over-wide hero on ≥1280 (looks unfinished) | 🟠 Major |
| 3 | Games | Table packs left; ~25–30% empty right at 1440 | 🟡 Minor |
| 4 | Improve | Study Goals tail slightly dense; radar enlarges on tablet | 🟡 Minor |
| 5 | Analysis | Eval-timeline sparse at start (inherent/deferred) | 🟡 Minor |

## Recommendation (not implemented)
Two Major fixes would lift the whole PR to "premium": (1) **Dashboard** — cap content width on wide viewports and/or make the Weekly Focus a 2-column hero so it fills intentionally; (2) **Analysis** — ensure the demoted accuracy cards show content (or hide when empty). The Minors are polish. No critical (blocking) issues found.

*Audit only — no code, branch, or PR.*
