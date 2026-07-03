# Phase 7 — Game Library + Import · Implementation Plan

> **Authority:** `CHESSMATE_SYSTEM_DESIGN.md` §4.2/§4.3 (+ §3 IA, §10 responsive, §11 a11y) · Architecture §4/§5/§7/§22. Input: `PHASE_7_DISCOVERY.md`. Documentation wins.
> **Constraints:** strangler — behind `ui.screen.games` (placeholder when off); legacy untouched; **real `games`-table data** (this phase begins de-sampling); reuse `lib/pgn`/`pgnLimits`/`pgnWorker` + the legacy `GameList` data logic; PR base = current integration branch; **visual review gate before PR**; **no merge** without approval.
> **This is a plan. No code until Gate 0 is cleared.**

---

## ⛔ Gate 0 — confirm before implementation (from Discovery)
1. **Derive** opening/time-control/analysis-status for v1 (persist Phase 11) — recommended.
2. **Connect Chess.com/Lichess** = secondary, **deferred/stub** for v1 (paste + upload real).
3. **Real data:** Games runs on the live `games` table (begins de-sampling) — confirm.
4. **Collections** = localStorage v1 → server Phase 11.
5. **Flag granularity:** single `ui.screen.games` for Library + Import (recommended) vs separate.

---

## Milestones

### M1 — Data layer (extract + derive)
- `features/games/useGames.ts` — paginated load + load-more + **server-side search** + filter/sort (lift from `GameList`).
- `features/games/useImportGames.ts` — paste/upload → `pgnWorker` (`splitPGN`/`parsePGN`) → `checkPgnSize` guard → insert with parse/insert **progress** + **dedupe** (lift from `GameList`).
- `lib/games/deriveGameMeta.ts` — opening/ECO + time control from PGN headers; analysis status (analyzed/pending) from `game_analysis_results`/`move_analysis` presence (batched).
- VMs: `GameRowVM` (players, result, color, date, opening, timeControl, status, improvementTag).

### M2 — Import route (`/games/import`) — *build first (highest ROI)*
- Source picker (paste / upload / **connect-stub**); paste **textarea** + file **dropzone** (keyboard + `<input type=file>` fallback, 5 MiB guard); **parsed-preview list** (GameRow preview); confirm/cancel; **progress/status**; **recoverable errors** (import valid games, list skipped + reasons); empty state.
- Behind `ui.screen.games`; first-run → this route (§3).

### M3 — Library screen (`/games`)
- Header + import actions (Import PGN primary; Connect secondary-stub); **Quick-insight strip** (3 MetricCards: most common mistake / best opening / avg accuracy — derived/empty); **Filter toolbar** (Search + SegmentedControl result/color + Dropdown time-control + sort); **GameTable** (desktop) ↔ **GameCardList** (mobile); **GameRow (full)** + **StatusBadge** + **ImprovementTag**; empty/skeleton states.

### M4 — Collections + navigation wiring
- **Collections** (saved smart-filters; localStorage `cm.collections`) incl. seed "Losses to review" (the Review-Mistakes/Improve deep-link target).
- Open game → `/analysis/:id`; `/games/:id` → redirect to `/analysis/:id`; "All games" links from Dashboard/Improve resolve here.

### M5 — Responsive + a11y + states → audits → visual gate
- Mobile (card list, filter sheet, stacked insight, 44px); table/list a11y (sortable headers, labelled filters, status text not color-only, `aria-live` import errors); route focus; all states.
- Audits (a11y / responsive / scalability with a large library + large PGN) + screenshots; **STOP for approval**; then full gate + tests + commit + PR + CodeRabbit. **No merge.**

---

## Dependencies
Phases 1–3 (tokens, primitives, shell/routing/flags, TanStack Query) · `lib/pgn` + `lib/pgnLimits` + `src/workers/pgnWorker` · Supabase `games` (+ `game_analysis_results`/`move_analysis` for status/insights) · Phase-5 Analysis route (open-game target) · auth/session (real data).

## Acceptance criteria (§4.2/§4.3 + DoD §15 / Arch §25)
- **Library:** locate any game in **≤2 actions**; **analysis status unambiguous** per row; search covers all games; result/color/time-control filters + sort work; collections open; quick-insight strip populates (or empty).
- **Import:** a pasted/uploaded PGN is **parsed, previewed, queued** with clear status; **errors explained + recoverable** (partial success); 5 MiB guard; dedupe.
- Open a game → Analysis (`/analysis/:id`); first-run → Import.
- Runs on **real `games` data**; behind `ui.screen.games`; legacy untouched; all four states; mobile re-thought; keyboard + focus + AA contrast; **axe clean** (component + e2e in CI).
- typecheck/lint/tests/build green; no console errors.

## Testing strategy (Arch §20)
- **Unit:** `deriveGameMeta` (opening/time-control/status); filter/sort/search predicates; dedupe; (reuse existing `pgn`/`pgnLimits`/`pgnWorker` tests).
- **Component:** GameRow (status not color-only), filter toolbar (radiogroup/labelled), import preview + recoverable-error rendering, all states, jsdom axe.
- **Integration:** paste → preview → import → appears in Library; open game → Analysis route; collection filter applies.
- **E2E a11y (`e2e/games-a11y.spec.ts`):** `/games` + `/games/import` structural axe + contrast + route focus; wire into CI (Playwright already runs `reducedMotion`).

## Visual review gates
- **Gate 0 (now):** confirm the 5 decisions above.
- **Gate B (M5):** screenshots (desktop/tablet/mobile · Library + Import · empty/loading/error · large dataset) + UX rationale → approval before any PR.
- **Gate C (post-CodeRabbit):** comments resolved + CI green before the merge decision.

## Sequencing note
Per `NEXT_PHASE_RECOMMENDATION.md`, build **Import (M2) before Library (M3)** — one real imported game immediately makes Analysis → Review Mistakes → Improve operate on live data, the biggest single credibility jump and the start of de-sampling.

## Out of scope (Phase 7)
Chess.com/Lichess OAuth/connect (deferred); persisted `opening`/`time_control`/status columns + server-side Collections (Phase 11); server analysis pipeline; bulk re-analysis UX (legacy `BulkAnalysis` stays as-is until Phase 11). Cheap adjacent follow-up to consider folding in: consume the `?ply=` param in Analysis so Review-Mistakes "Open in Analysis" lands on the exact move.
