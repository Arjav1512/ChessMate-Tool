# Improve · Review Mistakes — Visual Architecture Review (Phase 7)

> **Authority:** `CHESSMATE_SYSTEM_DESIGN.md` §9 (Improve) + §8 (Analysis) + §4.7 + §6/§11; Architecture §4/§5/§7/§12. Inputs: `REVIEW_MISTAKES_DISCOVERY.md`, `REVIEW_MISTAKES_IMPLEMENTATION_PLAN.md` + Gate-0 decisions. Documentation wins.
> **Status:** Architecture review only — no code, no branch, no PR. Diagrams are schematic.

**Gate-0 decisions (locked):** (1) **No standalone Mistake Review destination.** (2) Roadmap intact — **Phase 7 = Game Library + Import**; this ships as an **Improve sub-view**, not a new phase screen. (3) **Improve → Review Mistakes** sub-view. (4) Sample/derived data for v1. (5) Move-quality taxonomy `brilliant·best·good·inaccuracy·mistake·blunder` (`excellent→best`). (6) Responsibility boundaries: Dashboard=overview · Analysis=understand games · **Improve=weaknesses + study plan + progress + review mistakes** · Games=library/import.

> **Framing:** because the roadmap stays intact, this is delivered as an **Improve Hub enhancement** ("Review Mistakes" sub-view), reusing the B-4 engine. No new top-level IA, no new feature flag — it lives behind the existing `ui.screen.improve`.

---

## 1. How Review Mistakes lives inside Improve

Improve becomes a **two-view hub** under one screen, switched by a segmented control in the header — never a new nav item (§3 IA preserved):

```
/improve                         ui.screen.improve
 ├─ view: "Plan"  (default)      ← the existing Phase-6 hub (focus, radar, weaknesses, plan, goals)
 └─ view: "Review mistakes"      ← NEW sub-view (the B-4 mistake feed, Ivory)
       route: /improve/mistakes   (nested route; same flag)
```

- **Switcher:** a `SegmentedControl` under the Improve header: `[ Plan | Review mistakes · N ]`. Both views share the header + provenance line.
- **Deep links in:** Study-Plan `replay` rows ("Replay your … games") and the imported "From analysis" items link to `/improve/mistakes` (optionally filtered by motif). Dashboard "recently analyzed" and Analysis can also link here.
- **Component home:** `features/improve/mistakes/*` (sibling to the plan components) — reuses `lib/mistakeReview` (engine) + a sample/derived adapter; renders with Phase-5 `BoardContainer` + the Ivory `MoveQualityChip`.
- **One Primary per view** (§9 action hierarchy) — in Review Mistakes that Primary is **"Open in Analysis"** on the selected mistake.

This keeps the §9 promise (Improve answers "what to work on next") while adding the **review** half of the loop the Study Plan only *referenced* before.

---

## 2. User flow — the closed loop

```
 ANALYSIS (§8)                          IMPROVE → REVIEW MISTAKES (new)         IMPROVE → PLAN (§9)
┌────────────────────┐  Send to        ┌──────────────────────────────┐       ┌────────────────────┐
│ InsightCard /       │  Improve        │ Mistake feed (prioritized,    │  add  │ Study Plan          │
│ turning point       │ ───────────────▶│ filterable): tagged + detected│ ─────▶│ replay sessions     │
│ "hung the queen"    │  cm.improveQueue│ mistakes, deduped              │ to plan│ (your own games)   │
└────────────────────┘                 │   └ select → drill detail      │       └─────────┬──────────┘
        ▲                               │       [ Open in Analysis ]──┐  │                 │ complete
        │  open in Analysis             └─────────────────────────────┼──┘                 ▼
        └───────────────────────────────────────────────────────────┘        progress ▲ → Milestones/Dashboard
```

1. **Analysis** → user taps **Send to Improve** on a mistake → `cm.improveQueue`.
2. **Review Mistakes** ingests that queue **and** the detected `move_analysis` mistakes (sample/derived v1), unified + prioritized (severity + motif + recurrence).
3. From a mistake's drill detail: **Open in Analysis** (round-trips to `/analysis/:gameId` at the exact ply) or **Add to study plan**.
4. **Study Plan** `replay` sessions are the materialization of these mistakes; completing them feeds progress → Milestones → Dashboard. Loop repeats.

The feed is the **single source** of mistakes; Plan and Analysis link into it (no parallel mistake list).

---

## 3. Desktop layout (≥1024) — master/detail

```
┌── Sidebar ──┐┌─────────────────────── /improve/mistakes ───────────────────────────────┐
│ ▲ Improve ◀ ││ Your improvement plan                                          (shared h1) │
│             ││ [ Plan | ✦ Review mistakes · 12 ]            (view switcher, segmented)     │
│             ││ Review your mistakes · 12 from 42 analyzed games                (provenance) │
│             ││ Phase: [ All | Opening | Middlegame | Endgame ]   Motif: ‹hung›‹fork›‹…›    │
│             ││ ┌── Feed (list, ~38%) ──────────┐ ┌── Drill detail (~62%) ──────────────┐ │
│             ││ │ ▸ ● blunder · M24 · Qxh7       │ │  ┌───────────────┐  You played Qxh7  │ │
│             ││ │      hung piece   [from anal.] │ │  │  board         │  ● blunder        │ │
│             ││ │   ● mistake · M18 · Rd1        │ │  │ (BoardContainer│  Best: Rfe1       │ │
│             ││ │      missed fork              │ │  │  position BEFORE│  eval +2.3 → −1.1 │ │
│             ││ │   ● inaccuracy · M9 · h3      │ │  │  the move)     │  Motif: hung piece │ │
│             ││ │   ● blunder · M31 · Kg2       │ │  └───────────────┘  why this loses…   │ │
│             ││ │   …                            │ │  [ Open in Analysis → ]   (PRIMARY)   │ │
│             ││ │   (priority-ordered)           │ │  [ Add to study plan ]    (secondary) │ │
│             ││ └────────────────────────────────┘ └───────────────────────────────────────┘ │
└─────────────┘└──────────────────────────────────────────────────────────────────────────────┘
```

- **Left feed:** priority-ordered rows — move-quality dot+label (never color-only), move no., SAN, motif, and a "from analysis" tag for queued items. Selected row highlighted.
- **Right drill:** `BoardContainer` at the position **before** the move, played vs **best** (SAN + eval swing), the motif lesson, and **one Primary** ("Open in Analysis") + secondary ("Add to study plan").
- **States:** loading skeleton · empty ("No mistakes to review yet — analyze a game" → Import/Analysis CTA) · error+retry · success.

---

## 4. Mobile layout (≤767) — stacked feed, tap-to-drill

```
┌──────────── top bar ───────────┐
│ ♟ ChessMate        ⌕    ◯       │
├─────────────────────────────────┤
│ Your improvement plan            │
│ ‹ Plan ›‹ ✦ Review mistakes·12 › │ ← view switcher (scrollable)
│ 12 from 42 analyzed games        │
│ ‹All›‹Opening›‹Middle›‹Endgame›  │ ← phase chips (scroll)
│ ‹hung›‹fork›‹back-rank›‹…›       │ ← motif chips (scroll)
├─────────────────────────────────┤
│ ┌ ● blunder · M24 · Qxh7      ┐ │ ← card (tap → expand drill)
│ │  [mini board]  hung piece    │ │
│ │  [from analysis]             │ │
│ │  [ Open in Analysis → ]      │ │ ← one Primary
│ └──────────────────────────────┘ │
│ ┌ ● mistake · M18 · Rd1       ┐ │
│ └──────────────────────────────┘ │
├─────────────────────────────────┤
│ [ ◉ ][ ▦ ][ ◎ ][ ▲ Improve ]   │ ← bottom tab bar (Improve active)
└─────────────────────────────────┘
```

**Hierarchy/ordering:** view switcher → phase chips → motif chips → priority-ordered cards (mini board + quality + motif + one Primary). Tapping a card expands the drill inline (board fits width). 44px targets; chips scroll horizontally.

---

## 5. Accessibility strategy (§11)

- **View switcher + filters** = `SegmentedControl`/radiogroups (Phase-2, arrow-key nav); filter state in the URL (shareable, back-button safe).
- **Feed** = a labelled list; each row a button with a full accessible name: *"Move 24, blunder, played Qxh7, hung the queen, from your analysis."* Selecting updates the drill (`aria-current` on the row; manage focus to the detail heading).
- **Move quality** = dot **+ symbol + text label** (never color-only); the single `MoveQualityChip` renderer (shared with Analysis) guarantees consistency.
- **Board** = `BoardContainer` `role="img"` with a position summary; SAN/eval are real text, not image-only.
- **Drill detail** = labelled region; **one Primary** in tab order first; "Open in Analysis" is a real link/button announcing destination.
- Route focus → the Review-Mistakes heading; reduced-motion for transitions; **AA contrast** (labels `--text-low`, the Phase-5 lesson). New `e2e/improve-mistakes-a11y.spec.ts` wired into the CI `accessibility` job.

---

## 6. Risk review

| Risk | Mitigation |
|---|---|
| **Duplication** with Plan / Analysis (biggest) | Review Mistakes is the *single* mistake **feed**; the Plan's `replay` rows and Analysis **link into** it — no second mistake list, no parallel plan UI. |
| **Two views feel like two screens** | Shared header + provenance + one switcher; Plan stays the default; "Review mistakes" reads as a lens on the same data, not a new place. |
| **Analytics-dump feel** | Master/detail leads with a **position + the lesson + one action**, not a stats grid. |
| **Sparse live data** | Sample/derived v1 (decision #4); live swap = the existing `useMistakeReview`; honest empty state. |
| **Taxonomy/motif drift** | Map legacy `MoveClassification`→Ivory once; render only via the shared `MoveQualityChip`. |
| **"Drill" over-promise (no engine)** | Actions are **"Open in Analysis" / "Add to study plan"** — review + routing, not SRS; no "mark resolved" persistence in v1 (Phase 11). |
| **Scope creep into Analysis** | Review Mistakes never re-implements the board/engine; it **hands off** to Analysis for deep study (boundary per decision #6). |

---

## 7. Integration with the existing Improve Hub

- **Shared shell:** same `/improve` screen, header, provenance, `ui.screen.improve` flag, and `iv-improve` styling tokens. The switcher is the only new chrome.
- **Plan ↔ Review:** Study-Plan `replay` items and "From analysis" imports deep-link to `/improve/mistakes` (motif-filtered). "Add to study plan" from a mistake writes the same `cm.improveQueue` the Plan already ingests (`features/improve/queue.ts`) — **one queue, both directions**.
- **Data reuse:** the mistake adapter and the plan's weakness data both derive from analysis/`move_analysis` (sample/derived v1); no new tables.
- **Progress:** reviewing/queuing mistakes feeds the same Milestones/Study-Goals signals already on the Plan view (no new progress UI).
- **No changes to** Dashboard or Analysis internals (decision #6 boundaries) — only outbound links from them into the feed (optional, additive).

---

## Final note / next checkpoints
- **Recommended build first:** the switcher + sub-route + feed adapter (reuse B-4) + master/detail, then the Plan↔Review deep links.
- **Defer:** persisted "reviewed" state, SRS/drills, real `move_analysis` at scale (Phase 11); Games-collection entry (depends on Game Library, Phase 7 proper).
- **Gates:** Gate-0 ✅ (this doc); **Gate B** = M5 visual review (screenshots) before any PR; **Gate C** = CodeRabbit resolved + CI green before merge.

*Stop. Visual architecture only — no implementation, no branch, no PR.*
