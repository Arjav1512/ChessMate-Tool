# Analysis Workspace — Discovery & Gap Analysis (Phase 5)

> **Authority:** `CHESSMATE_SYSTEM_DESIGN.md` §8 (Analysis Workspace, authoritative) + §4.4, §5, §6, §11, §12; `CHESSMATE_IMPLEMENTATION_ARCHITECTURE.md` §4 (route), §5 (component tree), §8 (Analysis/Move models), §10 (analysis pipeline), §11 (Coach). **Documentation wins.**
> **Status:** Discovery only. No code, no branch, no PR, no functional changes.
> **Method:** read the existing implementation (`GameViewer`, `EnginePanel`, `ChessBoard`, `EvaluationGauge`, `lib/stockfish`, `utils/moveClassifier`, `lib/{pgn,moveAnalysis,motifs}`, `chess-mentor` edge fn) + both spec docs.
> **Carry-over context:** Phase 1–3.5 shell/tokens/primitives are live; Phase 4 Dashboard merged. Analysis stays **client-side** for v1 (locked decision #2). New screens build on **typed sample/derived** data where the layer is missing (locked decision #3).

---

## 0. Where the Analysis experience lives today

- **Legacy app:** `GameViewer.tsx` (910 LOC) is the analysis screen, opened by selecting a game in the legacy `GameList`. It composes `ChessBoard` + `EvaluationGauge` + `EnginePanel` (795 LOC) + an always-on Coach chat + a custom MoveList + a navigator. Stockfish runs **client-side** (`lib/stockfish.ts`, Web Worker, asm.js).
- **New shell:** `/analysis/:id` and `/analysis` render `PlaceholderPage` (Phase 3). Nothing real is wired to the Ivory shell yet. `ui.screen.analysis` flag exists.
- **Everything legacy is built on `--cm-*` (Obsidian) tokens + inline styles** — off the Ivory design system.

---

## 1. Current State Audit

Legend: ✅ works · ⚠️ partial / needs change · ❌ missing or violates.

### 1.1 Chess board — `chess/ChessBoard.tsx` (214 LOC)
- **Exists / works:** 8×8 FEN-driven grid (chess.js), Unicode pieces, rank/file coordinates, click-to-move (interactive mode), possible-move dots, highlight squares, arrow overlay slot. Logic is solid.
- **Design violations:** uses `--cm-board-light/dark` + **hardcoded** piece colors (`#FFFAF0`/`#1A1A1A`) and shadow/radius (4px) — not `--board-*`/`--piece-*`/`--r-lg` tokens (§5.1). No `aspect-ratio:1/1` (fixed `squareSize` px), so it isn't fluid per §6 Board Containers.
- **Spec gaps (§8):** ❌ **no board flip / `orientation`** (RANKS/FILES hardcoded white-at-bottom) — §8 requires `f` flips. ❌ no **last-move tint** overlay (only generic `highlightSquares`). No read-only "mini" variant for the Coach board.
- **Verdict:** **Refactor** — keep chess logic; retoken, add `orientation`, last-move tint, responsive aspect-ratio, mini variant.

### 1.2 Move list — inside `GameViewer` (`MoveList` sub-component)
- **Exists / works:** 2-column (table) + inline modes; per-move classification color/symbol; click to seek; current-move highlight.
- **Violations:** `--cm-*` tokens; taxonomy uses **`excellent`** not spec **`brilliant`** (see §1.11); not a reusable component (defined inline in a 910-LOC file). No quality **dot** per move per §8 (uses symbol only). Current-move highlight isn't the §8 "accent tint + border".
- **Verdict:** **Replace** as a standalone `MoveList` component (Ivory, spec taxonomy, dot+SAN, accent-tint current).

### 1.3 Engine panel — `analysis/EnginePanel.tsx` (795 LOC)
- **Exists / works:** Stockfish on/off, depth slider (1–30) + infinite, MultiPV (1–5), live streaming eval (depth + nps), PV lines in SAN, **"Analyze Full Game"** (sequential per-position → classifications), **EvalGraph** sparkline with click-to-seek, classification **summary bar**.
- **Architecture/Design violations:** this is framed as a **Lichess-style engine viewer** — the spec explicitly says ChessMate is **not an engine viewer** (§1) and is **insights-first** (§2, §8). Engine controls (depth/MultiPV/nps) lead; there is **no move-detail Insight Card**, no plain-language "why", no best-move rationale, no "Send to Improve". `--cm-*` tokens throughout. Eval graph lacks the §8 dashed **playhead** + **turning-points** jump.
- **Reusable parts:** the Stockfish driver + "Analyze Full Game" loop (the v1 client-side analysis engine), `summariseClassifications` (move-quality counts), the SVG sparkline geometry, `pvToSan`.
- **Verdict:** **Replace the panel UI**; **reuse the engine/analysis logic** behind new components (Insight Card, move-quality counts, Eval Timeline, Lines tab).

### 1.4 Coach panel — `GameViewer.CoachPanel`
- **Exists / works:** Ask-the-coach chat (Gemini via `lib/gemini.askChessMentor` → `chess-mentor` edge fn), starter prompts, user/coach **bubbles**, loading dots, error + Retry, weakness-summary personalization.
- **Violations (critical, §14.7 / §8):** Coach is **always visible** in the desktop right panel (not a peer tab) and rendered as a **full chat with bubbles + "Gemini AI" badge** — the spec says Coach is a peer tab, **never default**, **never chat bubbles by default, never visually dominant**. `--cm-*` tokens.
- **Reusable:** the `askChessMentor` client + `chess-mentor` edge function (server-only Gemini) — the data path is fine; the **placement and presentation** violate the spec.
- **Verdict:** **Replace presentation** (becomes the peer **Coach tab** + a subordinate Coach **note** in the Analysis tab); **reuse** the Gemini call path.

### 1.5 Navigator — inside `GameViewer`
- **Exists / works:** ⏮ ‹ › ⏭ + move counter + position progress bar; keyboard ←/→/Home/End.
- **Violations / gaps (§8):** `--cm-*`; ❌ **no Flip control**, ❌ no **material indicator**, current-step button isn't the **Primary-fill** per §8; keyboard missing **↑/↓ (start/end)** and **`f` (flip)** (uses Home/End instead of ↑/↓).
- **Verdict:** **Replace** as an Ivory `BoardControls` (38px buttons, current-step primary, Flip, material).

### 1.6 Evaluation bar — `chess/EvaluationGauge.tsx` (176 LOC)
- **Exists / works:** vertical white-from-bottom gauge, signed mono eval, mate handling, responsive height.
- **Violations:** `--cm-*` + hardcoded colors; width/markup not the §Charts "9–11px rail, mono eval label above"; conventional orientation ✅.
- **Verdict:** **Refactor** into the Ivory `EvalBar` (12px rail left of board, §8).

### 1.7 Navigator/eval timeline — `EnginePanel.EvalGraph`
- **Exists:** sparkline over all positions + click-to-seek cursor.
- **Gaps (§8 Eval Timeline):** ❌ no **dashed playhead** + accent current-move dot; ❌ no **"turning points"** affordance to jump between biggest eval swings; not packaged as the §8 "Eval Timeline card (label + mono current move + sparkline)". `--cm-*`.
- **Verdict:** **Refactor** into `EvalTimeline` (reuse geometry; add playhead + turning-points).

### 1.8 Mobile layout — `GameViewer` (isMobile branches)
- **Exists / works:** mobile eval bar (horizontal), board sizes to width, sticky nav row, bottom **tab strip** (Engine / Moves / Coach).
- **Gaps vs §8 mobile:** tabs are Engine/Moves/Coach (not the spec's **Analysis / Coach / Lines** as a **top segmented control**); "Next" is not a Primary full-width control; no collapsed Coach note; no Insight card. `--cm-*`. Board square-size math is custom (caps at 480px).
- **Verdict:** **Replace** following §8 mobile hierarchy (board+eval first → controls row with Primary Next → segmented tabs → Insight → collapsed Coach → move list), using the Phase-3 shell bottom tab bar.

### 1.9 Loading states
- **Exists:** `LoadingSpinner` "Loading game…" until PGN parses; mobile eval bar "Engine analyzing…"; "Analyze Full Game" progress bar.
- **Gaps (§8):** ❌ no **skeletons** for the analysis column (accuracy/insights), ❌ eval bar should be **indeterminate** while analyzing, ❌ board should **paint immediately from PGN** then panels skeleton (it does paint, but panels show nothing rather than Ivory skeletons). Uses legacy spinner.
- **Verdict:** **Replace** with Ivory `Skeleton`-based loading per §8 state transitions.

### 1.10 Error states
- **Exists:** PGN parse failure → `console.error` only (silently shows spinner forever) ⚠️; Coach error → toast + Retry pill ✅.
- **Gaps (§8 / Arch §17):** ❌ no **analysis-failed** card with cause + **Retry** in the analysis column (with board still steppable); PGN parse error is not surfaced to the user (just logs). Uses `--cm-*`.
- **Verdict:** **Replace** with Ivory `ErrorState` (analysis-failed + retry; board remains usable).

### 1.11 Empty states
- **Exists:** none specific to a clean game.
- **Gaps (§8):** ❌ **clean-game positive state** ("Clean game — 91% accuracy", best moment highlighted) missing — currently a clean game just shows an empty insight area. ❌ "no analysis yet" handled only by the engine toggle.
- **Verdict:** **Build** the clean-game positive Insight state.

### 1.12 Move-quality taxonomy conflict (cross-cutting, **high priority**)
- **Existing:** `utils/moveClassifier.ts` + `move_analysis.classification` DB column use **`best · excellent · good · inaccuracy · mistake · blunder`** with off-system colors.
- **Spec / Ivory (`MoveQualityChip`, §5.1, Arch §8/§10):** **`brilliant · best · good · inaccuracy · mistake · blunder`** — has **brilliant (!!)**, **no "excellent"**.
- **Impact:** the workspace must render the spec taxonomy; "brilliant" detection (best move that is a non-obvious sacrifice, Arch §10) doesn't exist; "excellent" must map (likely → `best` or `good`). DB column + any persisted rows need a mapping/migration plan (additive, not in Phase 5 scope to fully migrate).
- **Verdict:** **Reconcile** — adopt spec taxonomy in the new classifier output; add `brilliant` detection; map legacy `excellent`. Documented as a Phase 5 risk + a data-migration note for Phase 11.

---

## 2. User Journey Audit — Import → Analyze → Understand → Improve

| Stage | Today | Friction |
|---|---|---|
| **Import** | Legacy `GameList` import (paste/upload); new `/games/import` is a placeholder | New shell has no real import yet (Phase 7); analysis entry from the Ivory side is not wired. |
| **Analyze** | Open game → `GameViewer`; user must toggle the engine / press "Analyze Full Game" | **Analysis is manual** (engine off by default in places; full-game analysis is an explicit button). §8 expects analysis to be running/served with skeletons, not a user chore. Client-side full-game analysis is **slow/serial** and blocks insight. |
| **Understand** | Engine eval + PV lines + classification colors | **Insight is buried under engine controls.** No move-detail Insight Card, no plain-language "why", no best-move rationale, no turning-points jump. Coach (the explainer) is a chat sidecar, not tied to the current move. |
| **Improve** | ❌ no path | **No "Send to Improve"** from a mistake (§8). The loop dead-ends at analysis — the single biggest journey gap vs the product thesis (§1, §9 insight→action path). |

**Top friction points:** (1) insight is not first; (2) no one-click mistake → Improve; (3) Coach not anchored to the current move; (4) manual, serial analysis; (5) no turning-points navigation to the decisive moments.

---

## 3. Component Mapping (current → future)

| Current | Future (§5/§6/§8) | Action |
|---|---|---|
| `lib/stockfish.ts` (Worker UCI bridge) | client analysis engine (v1) + `useStockfishClient` | **Reuse** |
| `EnginePanel` "Analyze Full Game" loop | `useAnalysis` / analysis runner (client) | **Reuse logic**, drop UI |
| `EnginePanel.EvalGraph` | `EvalTimeline` (playhead + turning points) | **Refactor** |
| `EnginePanel` summary bar / `summariseClassifications` | move-quality counts (Chip+dot) | **Refactor** (taxonomy) |
| `EnginePanel` PV lines / `pvToSan` | **Lines** tab content | **Refactor** |
| `EnginePanel` engine controls (depth/MultiPV/nps) | de-emphasized into Lines/advanced | **Refactor / demote** |
| `ChessBoard` | `BoardContainer` (+orientation, last-move tint, mini) | **Refactor** |
| `EvaluationGauge` | `EvalBar` (§Charts) | **Refactor** |
| `GameViewer.MoveList` | `MoveList` (Ivory, dot+SAN, accent current) | **Replace** |
| `GameViewer` navigator | `BoardControls` (⏮‹›⏭ + Flip + material) | **Replace** |
| `GameViewer.CoachPanel` | **Coach tab** (peer) + subordinate Coach **note** | **Replace presentation** |
| `lib/gemini.askChessMentor` + `chess-mentor` fn | Coach data path | **Reuse** |
| `utils/moveClassifier` | classifier → **spec taxonomy** + `brilliant` | **Refactor** |
| `lib/pgn`, `lib/openings`, `lib/moveAnalysis`, `lib/motifs` | parsing/opening/phase/motif inputs | **Reuse** |
| `GameViewer` shell/layout | `/analysis/:id` `DashboardPage`-style feature (`features/analysis`) | **Replace** |
| — (missing) | **Tabs (Analysis*/Coach/Lines)**, **InsightCard**, **PlayerBar**, **"Send to Improve"**, turning-points, clean-game state | **Build new** |
| Ivory primitives (`Tabs`, `Card`, `MetricCard`, `Chip/MoveQualityChip`, `SegmentedControl`, `Skeleton`, `ErrorState`, `EmptyState`, `Button`) | reuse from Phase 2 | **Reuse** |

---

## 4. Information Architecture validation (§8 / §14)

| Principle | Spec requirement | Today | Gap |
|---|---|---|---|
| **Insights-first** | Analysis tab default; Insight Card (move-detail) is the default panel content; numbers support | engine controls + PV lead | ❌ build insights-first panel |
| **Coach as peer tab** | Tabs Analysis*/Coach/Lines; Coach never auto-selected; subordinate note in Analysis | Coach always-on chat sidebar | ❌ make Coach a peer tab |
| **Learning integration** | "Send to Improve" tags a mistake → weakness/plan + toast | none | ❌ build the insight→action bridge |
| **Weakness surfacing** | move motifs/classification tie to weaknesses; Coach personalizes from weakness profile | partial (coach reads weakness summary; motifs exist in `move_analysis`) | ⚠️ surface in Insight Card + send-to-improve |
| **Improvement workflow** | analysis routes back into the loop (Improve) | dead-ends | ❌ wire to `/improve` |

---

## 5. Mobile Audit (§4.11, §8 mobile, §10)

- **Board sizing:** today caps at 480px and computes square px; ✅ fits width but not the §6 `aspect-ratio` model. Board + eval bar should be **first** (✅ today board is near top; eval bar is a separate horizontal strip).
- **Move navigation:** sticky ⏮‹›⏭ row exists ⚠️ but no **Primary full-width "Next"** (§8 mobile); touch targets ~ small (icon buttons < 44px in places) — **44px** required (§6/§10).
- **Coach interaction:** a full Coach **tab** today; §8 wants Coach as a **collapsed note** in the Analysis view + the segmented Coach tab; chat input must be a constrained prompt, not a dominant chat.
- **Touch ergonomics:** tabs are tappable; but segmented control (Analysis/Coach/Lines) + 44px targets + bottom-sheet for any dialogs are required; current uses custom tab buttons. No swipe affordances.
- **Verdict:** rebuild mobile per §8 hierarchy on the Phase-3 shell (top segmented tabs, Primary Next, collapsed Coach note, bottom tab bar).

---

## 6. Technical Risks

### 6.1 Stockfish
- **Serial full-game analysis is slow** (asm.js, one position at a time) — can take many seconds; §18 budget is <30s/typical game but UI must never block (board paints from PGN, panels skeleton). Risk: jank, main-thread contention.
- **Single shared worker / lifecycle:** must lazy-load WASM/asm only on `/analysis` (Arch §18), terminate on unmount, handle re-entrancy when stepping fast.
- **Determinism vs server:** locked decision #2 keeps analysis client-side for v1; results may differ run-to-run (depth/time). Persisting to `move_analysis` for reuse needs care (don't thrash the DB).
- **brilliant detection** (sacrifice heuristic) is non-trivial and not implemented.

### 6.2 Performance (§18)
- Board step must update board/eval bar/timeline/insight/move-list **in lockstep <100ms** (§8) — avoid recomputing the whole game per step (precompute FEN array — already done in `pgn`; precompute evals/classifications once).
- Long move lists → virtualize (§18). Lazy-load Stockfish + chart geometry memoized.
- Eval timeline + board re-render on every ply: memoize geometry, avoid full re-mounts.

### 6.3 State management (Arch §7)
- **Analysis stepper** (current ply, flip, active tab) must live in **Zustand** (`analysisStepperStore`, deferred from Phase 3) — *data* (moves/analysis) in **TanStack Query** keyed `['analysis', gameId]` / `['moves', gameId]`. Risk: mixing the two (today everything is `useState` in one 910-LOC component).
- Tabs must enforce **Analysis default / Coach never auto-open** (the Phase-2 `Tabs` already encodes this contract).
- Route param `/analysis/:id` drives the query; flip/tab are UI state, not URL.

### 6.4 Accessibility (§11)
- Board: SAN move log is the accessible source of truth; squares/pieces need textual equivalents; eval bar + charts need `role="img"` + `aria-label`.
- Keyboard: ←/→ step, ↑/↓ start/end, `f` flip; **must not** hijack keys while typing in the Coach input (today guards INPUT/TEXTAREA ✅ — preserve).
- Tabs ARIA (tablist/tab/tabpanel), focus management on tab change, reduced-motion for the 200ms step sync.
- Move-quality never color-only (pair dot+symbol+label) — Phase-2 `MoveQualityChip` already does this.

---

## 7. Summary verdict

The current Analysis experience is a capable **engine viewer** that inverts the product thesis: it leads with engine output and treats Coach as an always-on chatbot, with **no insight-first card, no turning-points, and no path to Improve**. The **chess logic and Stockfish/Gemini data paths are reusable**; the **UI, layout, IA, taxonomy, tokens, and the insight→action bridge must be rebuilt** to §8 on the Ivory shell. Biggest net-new work: Tabs(Analysis/Coach/Lines), InsightCard, EvalTimeline (playhead + turning points), EvalBar, BoardContainer flip/last-move, MoveList, "Send to Improve", and the four state treatments.

See `PHASE_5_IMPLEMENTATION_PLAN.md` for milestones, dependencies, risks, acceptance criteria, and testing strategy.
