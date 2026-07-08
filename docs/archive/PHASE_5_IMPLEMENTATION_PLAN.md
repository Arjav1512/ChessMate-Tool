# Phase 5 — Analysis Workspace Implementation Plan

> **Authority:** `CHESSMATE_SYSTEM_DESIGN.md` §8 (+ §4.4, §6, §10, §11, §12) · `CHESSMATE_IMPLEMENTATION_ARCHITECTURE.md` §4/§5/§7/§8/§10/§11/§18. Documentation wins.
> **Input:** `ANALYSIS_WORKSPACE_DISCOVERY.md`.
> **Constraints:** strangler — behind `ui.screen.analysis` (placeholder when off); legacy app untouched; analysis **client-side** for v1 (decision #2); **typed sample/derived** data where the layer is missing (decision #3); reuse Phase 1–4 tokens/primitives/charts; PR base `prod/mistake-review-b4`; **do not merge**.
> **This document is a plan. No implementation occurs until approved.**

---

## Milestones

### M0 — Discovery ✅ (this PR's prerequisite)
`ANALYSIS_WORKSPACE_DISCOVERY.md` complete.

### M1 — Board + evaluation foundation
- **`BoardContainer`** (refactor `ChessBoard`): Ivory tokens (`--board-*`/`--piece-*`/`--r-lg`), `orientation` (flip), **last-move tint** overlay, `aspect-ratio:1/1` fluid sizing, read-only **mini** variant (for Coach), keep chess.js logic + arrows + coords.
- **`EvalBar`** (refactor `EvaluationGauge`): 12px rail, white-from-bottom, mono eval label, `role="img"`.
- **`BoardControls`**: ⏮ ‹ › ⏭ (38px), current-step **Primary** fill, **Flip**, material indicator.
- **`PlayerBar`**: avatar, name, mono rating·color, clock.
- **`analysisStepperStore`** (Zustand): `currentPly`, `orientation`, `activeTab`. Keyboard: ←/→ step, ↑/↓ start/end, `f` flip (guard inputs).
- **Acceptance:** board paints from PGN, flips, shows last move; stepping updates board+eval bar in lockstep; keyboard per §8.

### M2 — Analysis data + engine (client, v1)
- **`useStockfishClient`** + **`useAnalysis(gameId)`**: reuse `lib/stockfish` + the `EnginePanel` "Analyze Full Game" loop as a headless runner; precompute per-ply eval + classification once; lazy-load engine only on `/analysis` (§18).
- **`useGame(id)` / `useMoves(gameId)`**: TanStack Query keyed per Arch §7; sample/derived where DB lacks data (decision #3), shaped to the Move/Analysis models (Arch §8).
- **Classifier → spec taxonomy**: output `brilliant·best·good·inaccuracy·mistake·blunder` (map legacy `excellent`); add `brilliant` (non-obvious-sacrifice heuristic, Arch §10) with a conservative fallback; bind to `--mq-*`.
- **Accuracy summary** (your acc + delta, opponent acc) + **move-quality counts** (Chip+dot).
- **Acceptance:** analysis runs async with skeletons; eval bar indeterminate until ready; counts + accuracy render; taxonomy matches `MoveQualityChip`.

### M3 — Insight-first analysis column
- **`Tabs` [Analysis* | Coach | Lines]** (reuse Phase-2 Tabs contract: Analysis default, Coach never auto-open).
- **`InsightCard`** (default Analysis content, §6): move-quality chip + SAN header; plain-language "why" (inline mono SAN); divider → best alternative (best chip + SAN + rationale + eval). Best-move reveal.
- **`MoveList`**: 2-col SAN per move number, mono, quality **dot** per move, current move **accent tint + border**, click-to-seek.
- **`EvalTimeline`**: refactor `EvalGraph` → add dashed **playhead** + accent current-move dot; **turning-points** jump between biggest eval swings.
- **`Lines` tab**: engine PV trees (reuse `pvToSan`); engine controls demoted here.
- **Acceptance:** Analysis is default; step syncs board/eval bar/timeline/insight/move-list (200ms); turning-points jump works; clean-game positive Insight state.

### M4 — Coach (peer) + insight→action
- **Coach tab** (peer) + **subordinate Coach note** in Analysis (Coach Card, no bubbles/badge dominance, §14.7): reuse `askChessMentor` + `chess-mentor` edge fn; constrained prompt; returns to originating context.
- **"Send to Improve"**: tag current mistake → weakness/plan (sample/derived) + success toast (§8, §9 path).
- **Acceptance:** Coach never auto-opens; Coach note subordinate; Send-to-Improve toasts and links to `/improve`.

### M5 — States, responsive, a11y, route wiring
- **States:** loading (board paints, panel skeletons, eval indeterminate); **analysis-failed** ErrorState + Retry (board stays steppable); clean-game positive; surface PGN-parse errors.
- **Responsive:** tablet (board shrinks; panel below or 60/40 ≥900; tabs persist); mobile (board+eval first; Primary full-width Next; tabs→top segmented; Insight; collapsed Coach note; move list; bottom tab bar; 44px targets).
- **A11y:** SAN log accessible source; charts `role="img"`; tablist ARIA; reduced-motion; axe (component + e2e).
- **Route:** `features/analysis` page at `/analysis/:id` behind `ui.screen.analysis` (placeholder when off); `/analysis` index → "pick a game" empty/redirect.
- **Acceptance:** all four states; mobile re-thought hierarchy; axe clean; flag-gated.

### M6 — Visual review gate → PR
- Screenshots (desktop/tablet/mobile + states); layout/UX rationale; **STOP for approval**; then full gate + tests + commit + push `feature/phase-5-analysis` + PR + CodeRabbit loop. **No merge.**

---

## Dependencies
- Phase 1 tokens · Phase 2 primitives (`Tabs`, `Card`, `MetricCard`, `Chip`/`MoveQualityChip`, `SegmentedControl`, `Skeleton`, `ErrorState`, `EmptyState`, `Button`, `Avatar`) · Phase 3 shell/routing/flags/Zustand · Phase 4 charts pattern (`components/charts`).
- Reuse: `lib/stockfish`, `lib/pgn`, `lib/openings`, `lib/moveAnalysis`, `lib/motifs`, `utils/moveClassifier` (refactored), `lib/gemini` + `chess-mentor` fn.
- `/improve`, `/games`, `/coach` exist as routes (placeholders) for Send-to-Improve / back-links.

## Risks (from Discovery §6) + mitigations
| Risk | Mitigation |
|---|---|
| Serial client analysis slow / blocks UI | Board paints from PGN immediately; analysis async with skeletons; precompute once; lazy-load engine; cap depth/time for v1. |
| Move-quality taxonomy conflict (`excellent` vs `brilliant`) | New classifier emits spec taxonomy; map legacy; `brilliant` conservative heuristic; DB column migration deferred to Phase 11 (documented). |
| Step-sync jank (<100ms) | Precomputed FEN/eval/classification arrays; memoized geometry; Zustand stepper; virtualized move list. |
| State sprawl (legacy 910-LOC `useState`) | Query owns data, Zustand owns stepper/flip/tab, URL owns `:id`. |
| Coach creeping back to centerpiece | Peer tab + subordinate note; enforce via Tabs contract + tests. |
| A11y of board/charts | SAN log source of truth; `role="img"` labels; ARIA tabs; axe gates. |
| Breaking production | Behind `ui.screen.analysis`; legacy `GameViewer` untouched until cutover. |

## Acceptance criteria (Definition of Done — §8 + §15 + Arch §25)
- Matches §8 layout/hierarchy/tokens; Analysis default, Coach peer (never auto), Lines present.
- Single most important turning point + its lesson visible without scrolling (§4.4 success).
- Move stepping syncs all panels in lockstep; click-move jumps; best-move reveal; **Send-to-Improve** works + toast.
- All four states (loading/failed+retry/clean-game/success); board steppable during failure.
- Responsive desktop/laptop/tablet/mobile (re-thought, not scaled); 44px targets; tabs↔segmented.
- Keyboard (←/→/↑/↓/`f`) + visible focus + route focus; AA contrast; charts labelled; reduced-motion; axe clean.
- typecheck/lint/tests/build green; flag-gated; legacy untouched; no console errors.

## Testing strategy (Arch §20)
- **Unit (Vitest):** classifier → spec taxonomy + `brilliant` mapping; cp-loss thresholds; accuracy/turning-point math; stepper reducer; `pvToSan`.
- **Component (Testing Library):** board paints from PGN **before** analysis; flip; last-move tint; **Tabs Analysis-default / Coach-never-auto-open**; step syncs board+eval+timeline+insight+movelist; InsightCard best-move reveal; MoveList click-seek + current highlight; EvalTimeline turning-points; all four states; jsdom **axe** smoke.
- **Integration (MSW):** `useAnalysis` loader four-states; **Send-to-Improve** mutation + toast; analysis-failed → Retry re-runs.
- **E2E (Playwright + axe):** open `/analysis/:id` (dev preview `?shell&ff=ui.screen.analysis`): board paints first; Analysis default; Coach never auto-opens; step turning points; send mistake to Improve; failed-analysis retry; **real-browser color-contrast**; route focus. Wire into CI `accessibility` job (as Phases 3.5/4).

## Out of scope (Phase 5)
- Server-side analysis pipeline (deferred, decision #2). Real `analyses`/`moves`/`rating_history` tables + `move_analysis` taxonomy migration (Phase 11). Improve Hub itself (Phase 6) — Send-to-Improve targets sample/derived plan. Game Library/Import (Phase 7).
