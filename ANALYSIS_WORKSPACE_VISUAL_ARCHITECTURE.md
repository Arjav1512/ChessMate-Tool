# Analysis Workspace — Visual Architecture Review (Phase 5)

> **Authority:** `CHESSMATE_SYSTEM_DESIGN.md` §8 (authoritative) + §4.4/§6/§10/§11/§12; Architecture §4/§5/§7. Documentation wins.
> **Inputs:** `ANALYSIS_WORKSPACE_DISCOVERY.md`, `PHASE_5_IMPLEMENTATION_PLAN.md`.
> **Status:** Architecture review only. No production code, no branch, no PR.
> Diagrams are schematic (proportions, not pixels). All surfaces use Ivory tokens + Phase-2 primitives; analysis is client-side (decision #2); missing data is typed sample/derived (decision #3).

---

## 1. Desktop Layout (≥1280, inside the app shell)

Two columns inside the shell content: **Board column (fixed ~720px)** + **Analysis column (fluid)**. Per §8.

```
┌── Sidebar ──┐┌──────────────── /analysis/:id content ─────────────────────────┐
│ ◉ Dashboard ││ BOARD COLUMN (~720)            │ ANALYSIS COLUMN (fluid)         │
│ ▦ Games     ││ ┌─────────────────────────────┐│ ┌────────────────────────────┐ │
│ ◎ Analysis  ││ │ PlayerBar(top) avatar·name  ││ │ Tabs:[Analysis*][Coach][Lines]│ │ ← peer tabs (§8)
│ ▲ Improve   ││ │   mono 1487·B  ·  ⏱ 4:21    ││ ├────────────────────────────┤ │
│ ✦ Coach     ││ ├──┬──────────────────────────┤│ │ AccuracySummary  [you 84% ▲][opp 79%] │ persistent
│             ││ │E │                          ││ ├────────────────────────────┤ │
│             ││ │V │      BOARD 8×8           ││ │ Move-quality counts:        │ │ persistent
│             ││ │A │   (last-move tint,       ││ │  ●!! 1  ●! 12 ●· 20 ●?! 4 ●? 2 ●?? 1 │
│             ││ │L │    coords, pieces)       ││ ├────────────────────────────┤ │
│             ││ │bar│                         ││ │ ┌── TAB CONTENT REGION ───┐ │ │
│             ││ │12 │                         ││ │ │ Analysis → InsightCard  │ │ │ ← default
│             ││ │px │                         ││ │ │ Coach    → guided note   │ │ │
│             ││ ├──┴──────────────────────────┤│ │ │ Lines    → PV trees      │ │ │
│             ││ │ PlayerBar(bottom · You)     ││ │ └─────────────────────────┘ │ │
│             ││ ├─────────────────────────────┤│ ├────────────────────────────┤ │
│             ││ │ Controls ⏮ ‹ [›] ⏭  Flip ⇄  ││ │ Coach note (subordinate)    │ │ ← always, small
│             ││ │           material: +1      ││ ├────────────────────────────┤ │
│             ││ ├─────────────────────────────┤│ │ MoveList (persistent, own  │ │
│             ││ │ EvalTimeline card           ││ │ scroll) 2-col SAN + ●dots   │ │
│             ││ │  "move 24"  ╱╲▁╱  ⟂playhead ││ │  1. e4   e5                  │ │
│ ─────────── ││ │  ◆ turning points jumps     ││ │  2. Nf3  Nc6 ●?             │ │
│ ◯ You  ⚙    ││ └─────────────────────────────┘│ └────────────────────────────┘ │
└─────────────┘└────────────────────────────────────────────────────────────────┘
```

**Placement summary**
- **Board:** left column, centered, `aspect-ratio:1/1`, last-move tint + coords.
- **Eval bar:** 12px vertical rail immediately **left** of the board (white-from-bottom, mono eval above).
- **Controls:** row under the bottom PlayerBar — ⏮ ‹ › ⏭ (current-step **Primary** fill), **Flip**, material indicator.
- **Eval timeline:** card under controls — label + mono current move + sparkline w/ dashed **playhead** + turning-point jumps.
- **Right panel (analysis column):** Tabs → AccuracySummary (persistent) → move-quality counts (persistent) → **tab content region** → subordinate Coach note → persistent MoveList.
- **Tabs:** Analysis (default) · Coach · Lines.
- **Insights:** the Analysis tab's content region is the **InsightCard** (move-detail), the default thing the user sees.

---

## 2. Mobile Layout (≤767)

Board + eval **first**; tabs become a **top segmented control**; controls are one full-width row with a **Primary Next**; Coach is a **collapsed note**; move list below. Shell bottom tab bar persists. (§8 mobile, §4.11)

```
┌───────────── top bar (shell) ──────────────┐
│ ♟ ChessMate            ⌕      ◯ account     │
├────────────────────────────────────────────┤
│ PlayerBar(top)  name · 1487·B · ⏱           │
│ ┌────┬───────────────────────────────────┐ │
│ │Eval│            BOARD 8×8               │ │  ← board + eval bar FIRST
│ │bar │        (full width)               │ │
│ └────┴───────────────────────────────────┘ │
│ PlayerBar(bottom · You)                     │
├────────────────────────────────────────────┤
│ Controls:  ⏮  ‹   [   Next ›   ]   ⏭   ⇄    │  ← Primary full-width Next
├────────────────────────────────────────────┤
│ EvalTimeline  ╱╲▁╱  ⟂  ◆turning points      │
├────────────────────────────────────────────┤
│ Segmented:  [ Analysis* ] [ Coach ] [Lines] │  ← tabs → segmented
├────────────────────────────────────────────┤
│ AccuracySummary  [you 84% ▲] [opp 79%]      │
│ move-quality counts ●!!1 ●!12 …             │
│ ┌────────────────────────────────────────┐ │
│ │ InsightCard (default)                   │ │
│ └────────────────────────────────────────┘ │
│ ▸ Coach note (collapsed — tap to expand)    │  ← subordinate, collapsed
├────────────────────────────────────────────┤
│ MoveList (2-col SAN + ●dots)                │
├────────────────────────────────────────────┤
│ [ ◉ Home ][ ▦ Games ][ ◎ Analysis ][ ▲ Improve ] │ ← shell bottom bar
└────────────────────────────────────────────┘
```

- **Board:** full width, eval bar inline left, first in the scroll.
- **Tabs:** top segmented control (Analysis/Coach/Lines).
- **Move navigation:** single full-width controls row, **Next = Primary**; keyboard not primary on mobile, tap-driven; 44px targets.
- **Coach:** collapsed note in Analysis + the Coach segment; constrained prompt, never a full chat shell.
- **Insights:** InsightCard directly under the counts.

---

## 3. Right Panel Architecture (hierarchy + tab validation)

```
AnalysisColumn
├── Tabs  [ Analysis* | Coach | Lines ]          ← peer tabs (§8); Analysis default; Coach NEVER auto
├── AccuracySummary      (persistent — game scorecard)
├── MoveQualityCounts    (persistent — game scorecard)
├── ⟨ TAB CONTENT REGION ⟩  switches with the active tab:
│     Analysis → InsightCard (move-detail, DEFAULT)
│     Coach    → guided explanation thread for current move/turning point
│     Lines    → engine PV trees (mono SAN) + demoted engine controls
├── CoachNote            (persistent, SUBORDINATE — small Coach Card, not the tab)
└── MoveList             (persistent — own scroll, 2-col SAN + quality dots)
```

**Validation against §8**
- **Insights-first** ✅ — Analysis is the default tab; its content is the InsightCard; numbers (accuracy/counts) support, they don't lead.
- **Coach as peer tab** ✅ — Coach is one of three peer tabs, never auto-selected; additionally a *subordinate* persistent note (§8 "Coach note") that is visually minor (no bubbles/badge dominance, §14.7).
- **Lines as peer tab** ✅ — engine variations live in the Lines tab; this is where depth/MultiPV controls are demoted so the default view stays insight-first (resolves the discovery's "engine-viewer" regression risk).
- **Moves as peer tab** ⚠️ **Reconciliation (documentation wins):** §8 makes the **Move List a *persistent section*, not a peer tab** — it stays visible across Analysis/Coach/Lines so the user never loses move context. So the peer-tab set is **Analysis/Coach/Lines only**; "Moves" is persistent. On mobile it remains persistent **below** the segmented tabs (not a fourth segment). *If* a future space constraint forces it, Moves could fold into a collapsible section — but it should not become a peer tab without a spec change. **Flagged for review (§10).**

---

## 4. Insight Card System

One reusable **InsightCard** component (§6 — reuse-first, §14.4) rendered in **variants** selected by the current move's classification + eval swing. All inputs come from already-computed analysis facts (Move/Analysis models, Arch §8); no new data invented. Every variant ends with the same action affordances.

Shared anatomy (§6 Insight Cards): `move-quality chip + SAN` header → plain-language explanation (inline mono SAN) → divider → best alternative (best chip + SAN + one-line rationale + eval) → actions.

| Variant | Trigger (input) | Output (what it says) | Actions |
|---|---|---|---|
| **Turning Point Card** | move is in `analysis.turningPoints` (largest eval swings) | "This is where the game turned." Eval before→after, who it favored, the idea that flipped it | Jump to move · **Send to Improve** · Ask Coach |
| **Blunder Card** | `classification ∈ {blunder, mistake}` (cp-loss over threshold) | what was played, **why it's losing** (motif: hung piece / allowed tactic), the concrete refutation | Reveal best move · **Send to Improve** · Ask Coach |
| **Missed Opportunity Card** | played move OK but a **much better** line existed (best `evalCp` ≫ played `evalCp`); or `brilliant` available but not found | "You missed …" — the stronger idea + eval gain, framed positively | Reveal best move · **Send to Improve** · Ask Coach |
| **Improvement Recommendation Card** | clean move / clean game (no mistake at this ply) → positive state; aggregates the game's dominant motif | "Clean game — 91%." or "Your recurring leak here is X." + the recommended drill | **Send to Improve** · Open Improve · Ask Coach |

- **Inputs (all existing):** `san, classification, evalCp, bestSan, bestEvalCp, phase, motifs, turningPoints`, side-to-move, weakness profile (for recommendation framing).
- **Outputs:** chip + SAN + plain-language why + best alternative + eval delta; positive framing for clean states (never a blank — §8 empty state).
- **Actions (uniform):** **Send to Improve** (tags motif → weakness/plan + toast), **Reveal best move** (board arrow + Lines), **Ask Coach** (opens Coach tab scoped to this move).

> These are **variants/states of one component**, not four new components — keeps the system composable and avoids card-zoo sprawl.

---

## 5. Move List Architecture

```
MoveList (persistent, own scroll)
  1.  e4        e5
  2.  Nf3       Nc6 ●?            ← per-move quality DOT (color = --mq-*) + symbol
  3.  Bb5       a6
 24.  Qxh7??                       ← CURRENT move: accent tint bg + 1px accent border
        ●??  Blunder
```

- **Taxonomy chips/dots:** spec taxonomy `brilliant(!!) · best(!) · good · inaccuracy(?!) · mistake(?) · blunder(??)` via the Phase-2 `MoveQualityChip`/dot. Color = `--mq-*`, **paired with symbol + label** (never color-only, §11). *(Resolves the discovery `excellent`→spec mapping.)*
- **Move quality indicators:** 7px dot per move at full mq-color; emphasis glow on blunder/brilliant.
- **Current move state:** accent tint background + 1px `--accent` border; auto-scrolls into view on step.
- **Keyboard navigation:** `←/→` step, `↑/↓` jump to start/end, `f` flip; click any SAN to jump; guarded while typing in the Coach prompt. Move list is the **accessible source of truth** for board state (§11).

---

## 6. Analysis → Improve Flow

The loop-closing path the current product lacks. Mistake → Insight → Recommendation → Send to Improve.

```
 Step onto a flagged move (or "turning points" jump)
        │
        ▼
 ┌───────────────────────────┐
 │ MoveList dot ●?? + board   │   eval bar drops, timeline playhead on a swing
 └─────────────┬─────────────┘
               ▼
 ┌───────────────────────────┐
 │ InsightCard (Blunder /     │   "Qxh7?? hangs the queen to …"
 │ Turning Point variant)     │   best: Rfe1 (+0.6) — keep the pin
 └─────────────┬─────────────┘
               ▼
 ┌───────────────────────────┐
 │ Recommendation             │   motif: "back-rank / hanging piece"
 │ (in-card or Coach note)    │   → suggested drill set
 └─────────────┬─────────────┘
               ▼
 [ Send to Improve ]  ──►  tag motif → weakness/plan (sample/derived)
        │                         │
        ▼                         ▼
   success toast            badge/▲ updates on Improve
        │
        └──►  optional: "Open Improve →"  navigates to /improve
```

- **One primary action per insight:** Send to Improve. Reveal-best and Ask-Coach are secondary.
- **Feedback:** toast (`aria-live`) confirms; the motif is queued to the (sample/derived) plan; back-link to `/improve`.
- **No dead end:** even a clean game offers "Open Improve" / drill the dominant motif.

---

## 7. Responsive Strategy

```
DESKTOP ≥1280            LAPTOP 1024–1279         TABLET 768–1023            MOBILE ≤767
┌────┬───────┐           ┌────┬──────┐            ┌──────────────┐           ┌──────────┐
│brd │ panel │           │brd │panel │            │   board+eval │           │ board+eval│
│+bar│ tabs  │           │+bar│ tabs │            ├──────────────┤           ├──────────┤
│    │ insight           │    │insight            │ panel (below │           │ controls  │
│ctl │ moves │           │ctl │moves │            │  board) OR   │           │ Primary→  │
└────┴───────┘           └────┴──────┘            │ 60/40 split  │           ├──────────┤
 side-by-side            side-by-side             │ if ≥900px    │           │ segmented │
 (full §8)               (narrower panel)         │ tabs persist │           │ tabs      │
                                                  └──────────────┘           │ insight   │
 sidebar: full           sidebar: full            sidebar: icon-rail         │ coach ▸   │
                                                  (Phase 3)                  │ movelist  │
                                                                             │ bottombar │
                                                                             └──────────┘
```

- **Desktop/Laptop:** §8 two-column; laptop narrows the analysis column, tabs/insight/moves intact.
- **Tablet:** board shrinks; **analysis column drops below the board** (single scroll), or a **60/40 split** when ≥900px; tabs persist; sidebar is the Phase-3 icon-rail.
- **Mobile:** re-thought (not scaled) — board+eval first → controls (Primary Next) → segmented tabs → insight → collapsed Coach → move list → shell bottom bar.
- **Transitions:** columns collapse in **priority order** (board+eval → controls → insights → moves); tabs↔segmented; 44px targets on coarse pointers.

---

## 8. Accessibility Review (§11)

**Focus order (desktop):** skip-link → sidebar → (board region: controls are the interactive handles) → BoardControls (⏮‹›⏭ Flip) → Tabs (tablist) → tab content (InsightCard actions: Reveal/Send/Ask) → Coach note → MoveList (move buttons). Route change moves focus to the screen `h1/h2`.

**Keyboard map:** `←/→` step · `↑/↓` start/end · `f` flip · `Tab` through controls/tabs/insight/moves · arrow-keys within tablist · `Enter/Space` activate · keys ignored while typing in the Coach prompt.

**Screen-reader strategy:**
- **MoveList = accessible source of truth** for board state; board squares/pieces have textual equivalents; board exposed as a labelled region, not a focus trap.
- **EvalBar / EvalTimeline / any chart:** `role="img"` + `aria-label` summarizing eval + trend ("White +0.6, advantage swung at move 24").
- **Move quality:** dot+symbol+label, never color-only.
- **Tabs:** `role=tablist/tab/tabpanel`, `aria-selected`; Coach tab never auto-focused.
- **Async:** analysis status + toasts via `aria-live` (polite); analysis-failed as `role=alert`.
- **Reduced motion:** the 200ms step-sync, timeline animation, and any reveal honor `prefers-reduced-motion`.

---

## 9. Visual Risk Review

| Risk | Where | Mitigation |
|---|---|---|
| **Clutter** | analysis column stacks Tabs + AccuracySummary + counts + Insight + Coach note + MoveList | Strict §8 order; AccuracySummary/counts are a single compact scorecard strip; one InsightCard at a time; Coach note is a single subordinate line until expanded; generous spacing; visual review gate before build. |
| **Clutter (board col)** | PlayerBars + board + eval bar + controls + timeline | Timeline is a compact card; controls one row; material indicator inline; no engine controls here. |
| **Regress into engine viewer** | depth/MultiPV/nps/PV temptation; eval leading | Confine ALL engine controls + PV trees to the **Lines tab**; default tab = Analysis/InsightCard; eval is paired with meaning (never a bare number); counts framed as "your move quality", not engine stats. |
| **Over-emphasize Coach** | Coach was always-on chat with badge | Coach = peer tab (never default) + one subordinate note; no chat bubbles/AI badge by default; constrained prompt; Coach content always tied back to the current move/turning point. |
| **Taxonomy drift** | `excellent` vs `brilliant`, off-system colors | New classifier emits spec taxonomy; `MoveQualityChip` is the only renderer; map legacy `excellent`. |
| **Step-sync jank** | board/eval/timeline/insight/movelist must move together | Precompute arrays; memoize; Zustand stepper; virtualize move list; <100ms budget. |

---

## 10. Final Recommendation

**Build first (foundation, lowest risk, unblocks everything):**
1. `BoardContainer` (flip, last-move tint, tokens, aspect-ratio) + `EvalBar` + `BoardControls` + `analysisStepperStore` + keyboard. *(M1)*
2. Client analysis runner + **spec-taxonomy classifier** + AccuracySummary + move-quality counts. *(M2)*
3. Tabs (Analysis*/Coach/Lines) + **InsightCard** (variants) + MoveList + EvalTimeline. *(M3)*

**Defer:**
- Server-side analysis pipeline (decision #2) and real `analyses`/`moves`/`rating_history` tables + the `move_analysis` taxonomy **migration** (Phase 11).
- `brilliant` detection beyond a conservative heuristic (refine later).
- Advanced turning-points UX (e.g., cycling animation) — ship the jump, refine later.
- Deep Improve integration (Phase 6) — Send-to-Improve targets sample/derived plan for now.

**Must be reviewed before implementation (decisions needed):**
1. **Move taxonomy reconciliation** — confirm new output is `brilliant·best·good·inaccuracy·mistake·blunder` and the legacy `excellent` mapping (→ `best` vs `good`).
2. **"Moves as peer tab" vs persistent list** — recommend **persistent** per §8; confirm we are not adding a Moves tab.
3. **InsightCard variants** — confirm the four framings (Turning Point / Blunder / Missed Opportunity / Recommendation) as **states of one component** are acceptable and on-spec.
4. **Analysis trigger** — confirm auto-run-on-open (with skeletons) vs explicit "Analyze" for the client engine, given perf.
5. **Send-to-Improve target** — confirm tagging into the sample/derived plan is acceptable until Phase 6/11.

**Next step after approval:** proceed to M1 implementation on `feature/phase-5-analysis` (visual review gate at M6 before the PR).

---

*Stop. Visual architecture review only — no implementation, no branch, no PR.*
