# Phase 7 — Mistake Review System · Implementation Plan

> **Authority:** `CHESSMATE_SYSTEM_DESIGN.md` §8/§9/§4.7 (mistake-review functionality is distributed; no standalone screen) · Architecture §4/§5/§7/§12. Input: `PHASE_7_DISCOVERY.md`. Documentation wins.
> **Constraints:** strangler — flag-gated; legacy untouched; client-side; **typed sample/derived** data (decisions #2/#3); reuse Phases 1–6 + the B-4 engine; PR base = current integration branch; **visual review gate before PR**; **no merge** without approval.
> **This is a plan. No code until the gate below is cleared.**

---

## ⛔ Gate 0 — Resolve before any implementation (from Discovery)
1. **Confirm Phase 7 = Mistake Review** (and where Game Library + Import goes).
2. **Placement** (no new top-level IA without approval): **(recommended) Improve sub-view "Review mistakes"** ▸ / Games "Losses to review" collection / Analysis entry.
3. **Data:** sample/derived for v1 — confirm.
4. **Scope boundary** vs Improve `replay` (§9/§12) + Weakness Profile (§4.7).
5. **Taxonomy/motif mapping** to the Ivory move-quality set.

> The milestones below assume the **recommended placement** (Mistake Review as an Ivory feed reachable from Improve, with "Open in Analysis" links). If you choose a different placement, M2/M5 routing changes only.

---

## Milestones

### M1 — Data + mapping foundation
- Rehome/wrap the B-4 engine into `features/mistakes/` (reuse `lib/mistakeReview.ts` + `useMistakeReview`); add a `lib/mistakes/mapping.ts` bridge: legacy `MoveClassification` → Ivory move-quality (`excellent→best`), legacy `Motif` → display labels.
- `features/mistakes/sampleMistakes.ts` + hook shaped to the real API (sample/derived for v1; live swap = the existing `useMistakeReview`).
- `MistakeCardVM` view-model (drill FEN, played/best SAN, move-quality, phase, motifs, priority, gameId/ply).

### M2 — Review feed UI (Ivory)
- `MistakeFeed` (prioritized list) + `MistakeCard` (drill board via Phase-5 `BoardContainer`, move-quality chip, played vs best, motif/phase, priority) + `MistakeFilterBar` (phase + motif, reuse `SegmentedControl`/chips).
- All four states (loading skeleton / empty "No mistakes to review yet — analyze a game" / error+retry / success).
- Placement per Gate 0 (recommended: an Improve "Review mistakes" sub-view/tab behind `ui.screen.improve`; or a dedicated flag if a route is approved).

### M3 — Integration (the loop)
- **Open in Analysis:** each card → `/analysis/:gameId` at the flagged ply.
- **Send to Improve:** reuse the queue so a reviewed mistake can be added to the plan; ensure the feed and Improve plan reflect the same items (no duplicate plan UI).
- Dashboard/Weakness entry points link into the feed (no new work in those screens).

### M4 — Responsive + a11y + states polish
- Mobile (filter chips scroll, full-width cards, board fits, 44px, bottom tab bar, one Primary); keyboard + focus; charts/board a11y; axe (component + e2e); reduced-motion; AA contrast.

### M5 — Visual review gate → PR
- Screenshots (desktop/tablet/mobile + states + the Analysis/Improve integration); UX rationale; **STOP for approval**; then full gate + tests + commit + PR + CodeRabbit loop. **No merge.**

---

## Dependencies
Phases 1–6 (tokens, primitives, shell, charts, Analysis `BoardContainer` + Send-to-Improve, Improve plan/queue) · B-4 assets (`lib/mistakeReview`, `useMistakeReview`, `move_analysis`, `lib/motifs`, `lib/moveAnalysis`) · Phase-5 `lib/analysis/moveQuality` (taxonomy bridge). If placement = Games collection, depends on Game Library (currently unbuilt) — another reason to confirm sequencing at Gate 0.

## Risks (from Discovery) + mitigations
| Risk | Mitigation |
|---|---|
| Unapproved IA change | Place inside an approved surface (Improve/Games/Analysis); gate at M2. |
| Duplication with Improve/Weakness | This is the single mistake **feed**; others link in, no parallel plan UI. |
| Sparse live data | Sample/derived for v1; live swap via `useMistakeReview`. |
| Taxonomy/motif drift | One mapper; `MoveQualityChip` is the only renderer. |
| "Drill" expectation (no engine) | "Review/Open in Analysis", not SRS; set copy expectations (B-4 scope). |
| Analytics-dump feel | Lead with position + lesson + one action. |

## Acceptance criteria (§8/§9 + DoD §15 / Arch §25)
- Mistake feed is prioritized (severity + motif + recurrence) and filterable (phase + motif); each card shows the position, played vs best (Ivory move-quality), and a single Primary action.
- "Open in Analysis" lands on the exact flagged ply; "Send to Improve" reaches the same plan/queue (loop intact, no duplication).
- All four states; mobile re-thought; keyboard + focus + route focus; charts/board a11y; **axe clean** (component + e2e in CI); AA contrast.
- typecheck/lint/tests/build green; flag-gated; legacy untouched; no console errors.

## Testing strategy
- **Unit:** taxonomy/motif mapping; feed priority ordering; filter logic (reuse/extend the existing `mistakeReview` tests).
- **Component:** MistakeCard (move-quality not color-only), filter bar (radiogroup), four states, jsdom axe.
- **Integration:** "Open in Analysis" routes to the right ply; "Send to Improve" writes the queue; feed reflects it.
- **E2E a11y:** the review surface — structural axe + contrast + route focus; wire into CI.

## Visual review gates
- **Gate 0 (now):** confirm scope/placement/data/boundary/taxonomy (above).
- **Gate B (M5):** screenshots + rationale → approval before PR.
- **Gate C (post-CodeRabbit):** comments resolved + CI green before merge decision.

## Out of scope (Phase 7)
SRS/spaced-repetition drills, a training-execution engine, persisted "resolved" state, server-side aggregation, real `move_analysis` population at scale (Phase 11). Game Library + Import remains its own phase unless Gate 0 merges them.
