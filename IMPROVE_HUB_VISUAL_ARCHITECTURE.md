# Improve Hub — Visual Architecture Review (Phase 6)

> **Authority:** `CHESSMATE_SYSTEM_DESIGN.md` §9 (authoritative) + §4.6/§6/§12; Architecture §4/§5/§7/§12. Documentation wins.
> **Inputs:** `PHASE_6_DISCOVERY.md`, `PHASE_6_IMPLEMENTATION_PLAN.md` + the 5 approved decisions.
> **Status:** Architecture review only — no production code, no branch, no PR. Diagrams are schematic (proportion, not pixels). Ivory tokens + Phase 1–5 primitives; behind `ui.screen.improve`; typed sample/derived data.

**Locked decisions:** (1) category map `motif+recurring→Tactical · opening+color→Opening · phase:endgame→Endgame · phase:middlegame+positional→Positional`; (2) severity **High/Med/Low** (internal 0–100); (3) **Time** radar axis = sample; (4) Improve **consumes** the Send-to-Improve queue → imported weaknesses appear in the study plan; (5) reuse dashboard **patterns**, build **Improve-owned** components, don't refactor the dashboard.

---

## 1. Desktop Layout (≥1280, inside the app shell)

```
┌── Sidebar ──┐┌──────────────────── /improve content (max = --content-max) ──────────────────┐
│ ◉ Dashboard ││ Your improvement plan                                              (h2)        │
│ ▦ Games     ││ Built from 42 analyzed games · refreshes as you play              (provenance) │
│ ◎ Analysis  ││                                                                                │
│ ▲ Improve ◀ ││ ┌── Weekly focus (hero, 1.4fr) ───────────┐ ┌── Skill profile (1fr) ───────┐ │
│ ✦ Coach     ││ │ ✦ WEEKLY FOCUS · WEEK 7        (halo)    │ │       Tactics                │ │
│             ││ │ Convert winning endgames        (h2)     │ │      ╱╲   ◇ you              │ │
│             ││ │ rationale tied to your data…             │ │ Time ◇──╳──◇ Openings       │ │
│             ││ │ [sessions 2/5] [phase acc ▲4%]          │ │     ╲  RadarChart  ╱  -- peers│ │
│             ││ │ [ Continue · session 3 → ]  (PRIMARY)    │ │ Positional ◇──◇ Middlegame  │ │
│             ││ └──────────────────────────────────────────┘ │       Endgame                │ │
│             ││                                               └──────────────────────────────┘ │
│             ││ Weakness profile      [ All | Tactical | Opening | Endgame | Positional ]      │
│             ││ ┌── ♜ Endgame ──────── 71% acc [High]┐ ┌── ♞ Tactical ─── 80% acc [Med] ┐    │
│             ││ │  · Rook conversion        [High]   │ │  · Hanging pieces      [Med]    │    │ ← weakest
│             ││ │  · K+P races              [Med]    │ │  · Back-rank           [Low]    │    │   tints --error
│             ││ ├── ♟ Opening ───────── 78% acc [Med]┤ ├── ◆ Positional ─ 75% acc [Low] ┤    │
│             ││ │  · Black prep             [Med]    │ │  · Weak squares        [Low]    │    │
│             ││ └────────────────────────────────────┘ └─────────────────────────────────┘    │
│             ││                                                                                │
│ ─────────── ││ ┌── Recommended study plan (1.4fr) ───────┐ ┌── Milestones (1fr) ──────────┐ │
│ ◯ You  ⚙    ││ │ [NEXT] ♜ Drill: rook endgames · 12m     │ │ ✓ Stop hanging pieces        │ │
│             ││ │  ↻ Replay: your 3 lost endgames · 8m    │ │ ◉ Endgame conv 80% · 71%▓░   │ │
│             ││ │  ⚡ Tactics: back-rank set · 10m         │ │ ○ Reach 1550 · now 1487      │ │
│             ││ │  ✦ Coach review: the d5 blunder · 5m    │ │                              │ │
│             ││ └──────────────────────────────────────────┘ └──────────────────────────────┘ │
└─────────────┘└───────────────────────────────────────────────────────────────────────────────┘
```

- **Header / provenance:** identity + "refreshes as you play" (the loop is live).
- **Weekly Focus (hero):** the **single Primary** ("Continue · session N"); ✦ label, data-tied rationale, 2 MetricCards, ambient halo. *(Improve-owned, dashboard hero pattern.)*
- **Radar:** skill profile, you vs dashed peers + legend.
- **Weakness cards:** 2×2, category filter Segmented; weakest category border-tints `--error`; severity badges.
- **Study plan:** ordered rows, first = **NEXT** (teal-tinted); icon by session type.
- **Milestones:** timeline (achieved ✓ / in-progress % / future hollow).
- **Progress indicators:** phase-accuracy on each category card + the focus delta + radar + milestone bars (no separate "analytics" block — progress is woven into the cards).

---

## 2. Mobile Layout (≤767) — re-thought, not scaled (§9 responsive / §4.11)

```
┌──────────── top bar (shell) ───────────┐
│ ♟ ChessMate            ⌕     ◯ account  │
├─────────────────────────────────────────┤
│ Your improvement plan                    │
│ Built from 42 games · refreshes…         │
├─────────────────────────────────────────┤
│ ✦ WEEKLY FOCUS · WEEK 7                  │ ← FIRST (§9 mobile)
│ Convert winning endgames                 │
│ [██░░░ 2/5]   phase acc ▲4%             │ ← X/5 progress bar
│ [ Continue · session 3 → ]  (PRIMARY)    │
├─────────────────────────────────────────┤
│ ‹ All ›‹ Tactical ›‹ Opening ›‹ … ›     │ ← horizontal filter CHIPS (scroll)
├─────────────────────────────────────────┤
│ ♜ Endgame · 71% · [High]                │ ← category cards STACK
│   · Rook conversion [High]  · K+P [Med] │
│ ─────────────────────────────────────── │
│ ♞ Tactical · 80% · [Med] …              │
├─────────────────────────────────────────┤
│ Study plan (cards)                       │
│ ┌ [NEXT] ♜ Drill: rook endgames · 12m ┐ │
│ └ [ Start → ] ───────────────────────  ┘ │
│ ┌ ↻ Replay: 3 lost endgames · 8m      ┐ │
├─────────────────────────────────────────┤
│ Milestones (timeline)                    │
│ Skill radar  → "View skill profile"      │ ← radar deferred/below (§9)
├─────────────────────────────────────────┤
│ [ ◉ Home ][ ▦ Games ][ ◎ Analysis ][ ▲ Improve ] │
└─────────────────────────────────────────┘
```

**Hierarchy & ordering:** Weekly Focus (with X/5 + Primary) → filter chips → stacked category cards → study-plan cards → milestones → radar (below or link). **Interactions:** chips scroll horizontally; tapping a category filters cards; tapping a weakness/study row → its action; one Primary (Continue). 44px targets; bottom tab bar (Improve active).

---

## 3. Study Plan Architecture

**Study item (view-model):**
```
StudyItemVM {
  id
  type:      'drill' | 'replay' | 'tactics' | 'coach_review'   (§12)
  title, description, estMinutes
  status:    'next' | 'queued' | 'done'      (first incomplete = next)
  source:    'weakness' | 'send-to-improve'  (where it came from)
  weaknessKey                                 (links back to the weakness)
  progress:  { done, total }                  (e.g. sessions 2/5 on the focus)
  action:    Start/Continue → training stub · coach_review → Coach tab
}
```
- **Priority/order:** highest **rating-impact** weakness → Weekly Focus → its objective expands into 3–5 ordered sessions; secondary weaknesses queue more. First incomplete item = **NEXT** (highlighted). One Primary lives on the Focus, not per-row.
- **Source:** (a) `weaknessProfile` (ranked weaknesses) via `lib/learning` objectives; (b) **`cm.improveQueue`** items imported from Analysis (Send-to-Improve) → reconciled to the matching weakness key (decision #4).

**Data flow:**
```
weaknessProfile (ranked)  ─┐
lib/learning objectives    ├─► build-plan (pure)  ─► StudyItemVM[]  ─► StudyPlanRow / cards
cm.improveQueue (imported) ─┘        │                                      │
                                     └─► Weekly Focus (top item)            └─► Start → training stub
                                                                                 coach_review → /coach
   completing a session ─► progress.done++ ─► phase accuracy ▲ / weakness ▼ / milestone current ▲
                                                   └─► reflected on Dashboard (loop repeats)
```

---

## 4. Weakness System (§9 §4)

| Field | Source | Shown as |
|---|---|---|
| **Category** | mapped (decision #1) from `weaknessProfile.category` | 2×2 grid header + filter |
| **Severity** | banded (decision #2) from `severity:0–100` | High / Medium / Low **badge** (text, not color-only) |
| **Impact** | severity × confidence × frequency (rating-impact proxy until real impact lands) | ranking order; weakest tints `--error` |
| **Recommendation** | `lib/learning` objective for the weakness key | the linked study action (drill/replay/tactics/coach) |

**Weakness → action path (§9):**
```
WeaknessCategoryCard (sub-weakness row, severity badge)
   └─ click ─► its recommended action (a StudyItem)
            └─ if it's the top-impact weakness ─► it IS the Weekly Focus (Primary)
            └─ else ─► appears in the Study Plan (Next/Queued)
```
No dead ends: every weakness row routes to a concrete session; the highest-impact one is the Focus.

---

## 5. Radar Chart Architecture

- **Axes (6):** Tactics · Openings · Middlegame · Endgame · Positional · **Time** (Time = sample, decision #3). Values 0–100 (phase accuracy / skill).
- **Series:** "you" polygon (accent fill + 2px stroke + vertex dots) over dashed "peers" polygon; legend.
- **Labels:** outside the rings, **≥66px horizontal margin** to prevent clipping (§6); mono/label tokens.
- **Accessibility:** `role="img"` + `aria-label` summarizing the profile ("Strongest: Tactics 80; weakest: Endgame 71"); never color-only (axis labels + values are the SR source). Decorative rings `aria-hidden`.
- **Responsive:** scales with container (viewBox); on mobile it moves **below** the plan or behind a "View skill profile" affordance (§9) to keep weekly-focus-first; keeps label margins.

---

## 6. Send-to-Improve Flow (closes the loop)

```
ANALYSIS (Phase 5)                IMPROVE HUB (Phase 6)
┌───────────────────┐            ┌──────────────────────────────────────────┐
│ InsightCard         │            │ reader: read cm.improveQueue              │
│ [ Send to Improve ] │──write────►│   {gameId, ply, motif, san}               │
└───────────────────┘  localStorage│        │                                  │
       cm.improveQueue             │        ▼ reconcile by motif → weakness key │
                                   │  build-plan merges imported items          │
                                   │        │                                   │
                                   │        ▼                                   │
                                   │  Study Plan row  [from Analysis] badge     │
                                   │        │  Start →                          │
                                   │        ▼                                   │
                                   │  session done → progress ▲ → Milestones    │
                                   └──────────────────────────────────────────┘
                                              │ reflected on Dashboard (score/▼)
```
- Imported items carry a subtle "from your analysis" provenance so the user sees the loop working.
- Queue shape unchanged (Phase 11 swaps localStorage → server plan).

---

## 7. Milestone System (§9)

| Goal type | Definition | Progress | Completion states |
|---|---|---|---|
| **Weekly** | Weekly Focus + its 5 sessions | X/5 progress bar | sessions done → focus complete |
| **Monthly** | targets (e.g. "Endgame conversion 80%", "Reach 1550") | current vs target (bar + mono) | **achieved ✓** (green) · **in-progress** (accent node + %) · **future** (hollow) |

```
MilestoneTimeline
 ✓  Stop hanging pieces in the opening        achieved (green ✓)
 ◉  Endgame conversion 80%   71% ▓▓▓▓▓░░  in-progress (accent + bar + %)
 ○  Reach 1550               now 1487      future (hollow)
```
Current values: real where derivable (phase accuracy from `game_analysis_results`/`move_analysis`); rating from `rating_history` (absent → sample).

---

## 8. Responsive Strategy

```
DESKTOP ≥1280            LAPTOP 1024–1279        TABLET 768–1023          MOBILE ≤767
focus | radar            focus | radar           focus (full)            focus FIRST (X/5+Primary)
weakness 2×2 grid        weakness 2×2            radar below             filter CHIPS (scroll)
plan | milestones        plan | milestones       weakness cards 1–2 col  weakness cards STACK
sidebar: full            sidebar: full           plan / milestones stack plan as CARDS
                                                 sidebar: icon-rail      milestones; radar→link
                                                                         bottom tab bar
```
Collapse in **priority order**: focus → weaknesses → plan → milestones → radar. Tabs/segmented→chips; 44px targets.

---

## 9. Accessibility Review (§11)

- **Keyboard:** category filter = radiogroup (arrow keys, reuse Phase 2 `SegmentedControl`); all rows/cards tabbable + visible focus; route focus → `h1`/`h2`; one Primary in tab order first.
- **Screen reader:** RadarChart `role="img"` + summary; severity as **badge text** (High/Med/Low), never color-only; study-item type announced (icon `aria-hidden`, type in the label); imported-item provenance in the accessible name.
- **Charts:** radar + milestone bars labelled; decorative rings/halo `aria-hidden`; reduced-motion for halo/progress.
- **Cards:** WeaknessCategoryCard is a labelled region; sub-weakness rows are buttons with descriptive names ("Rook conversion, high severity, drill rook endgames").
- **Study plan:** ordered list semantics; "Next" conveyed in text not just tint; Start/Continue are real buttons; AA contrast (labels `--text-low`, not `--text-faint` — Phase-5 lesson).
- Wire `e2e/improve-a11y.spec.ts` into the CI `accessibility` job.

---

## 10. Visual Risk Review

| Risk | Where | Mitigation |
|---|---|---|
| **Dashboard duplication** | Improve summaries overlap the dashboard (weaknesses, focus, roadmap) | Improve is the **full plan + actions**; dashboard is the **glanceable summary that links here**. Improve adds the radar, category grid, ordered study plan, milestones, and the Primary action — none of which the dashboard has. Build Improve-owned components (decision #5); don't re-show dashboard cards verbatim. |
| **Analytics overload** | 6 sections + radar + bars could read as a stats dashboard (the §1 anti-pattern) | Lead with **action** (Weekly Focus Primary), not metrics; every number is attached to a weakness + a recommended action; progress woven into cards, no standalone vanity block; generous spacing; visual review gate. |
| **Generic productivity-app** | study plan = a todo list; milestones = a checklist | Chess-specific framing (motifs, phase accuracy, your own lost games as replays); icons by session type; rationale tied to the user's data; the radar + weakness language keep it a *chess improvement* tool, not Todoist. |
| **Weak coaching signal** | plan feels mechanical / untrustworthy | Curated `lib/learning` objectives (pedagogy, not LLM); rationale text explains *why this, now*; coach_review sessions route to the Coach scoped to the weakness; imported-from-analysis provenance shows it's built from the user's real games. |

---

## 11. Final Recommendation

**Build first (foundation → unblocks the screen):**
1. `lib/learning` catalog + `lib/improve` mapping (category/severity/impact) + plan-composition (pure, tested) + Send-to-Improve **reader**. *(M1)*
2. `RadarChart` + `lib/improve` sample adapter/hooks + `ImprovePage` scaffold + `/improve` gating. *(M1–M2)*
3. Weekly Focus hero + Skill profile, then Weakness cards + filter, then Study plan + Milestones. *(M2–M4)*

**Defer:**
- Real drill/training execution engine; server-side `build-plan`; real `improvement_plans`/`training_sessions`/`milestones`/`rating_history` tables (Phase 11).
- Standalone **Weakness Profile** + **Progress** screens (Phase 9) — Improve shows summaries/entry points.
- "Time" axis real data source; real rating-impact (use the proxy now).

**Review checkpoints:**
- **Gate A (kickoff):** decisions confirmed ✅ (this doc).
- **Gate B (M5 visual review):** screenshots (desktop/tablet/mobile + states) + UX rationale → **approval before any PR** (Phases 4/5 protocol).
- **Gate C (post-CodeRabbit):** all comments resolved + CI green before merge decision.

---

*Stop. Visual architecture review only — no implementation, no branch, no PR.*
