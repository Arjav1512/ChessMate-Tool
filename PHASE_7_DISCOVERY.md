# Phase 7 — Game Library + Import · Discovery & Gap Analysis

> **Authority:** `CHESSMATE_SYSTEM_DESIGN.md` §4.2 (Game Library) + §4.3 (Game Import) · `CHESSMATE_IMPLEMENTATION_ARCHITECTURE.md` (§4 routes, §5, §7 data, §22 strangler) · `PROJECT_STATE.md` · `IMPLEMENTATION_ROADMAP.md` (Phase 7) · `NEXT_PHASE_RECOMMENDATION.md`.
> **Status:** Discovery only — no code, no branch, no PR.
> **Method:** read §4.2/§4.3; audited `lib/pgn.ts`, `lib/pgnLimits.ts`, `src/workers/pgnWorker.ts`, legacy `components/game/GameList.tsx` + `AnalyzeGamesPage.tsx`, the Supabase `games` schema, and current routing.
>
> *(Note: the previous `PHASE_7_*.md` documented the Mistake Review workstream — an Improve sub-view — and have been renamed to `REVIEW_MISTAKES_*.md`. These canonical `PHASE_7_*` docs are the real roadmap Phase 7: Game Library + Import.)*

---

## Executive summary

Game Library + Import is the **#2 primary-nav destination** and the **front door of the improvement loop** (§3: Games → Analysis → Improve). It is also the **first real-data screen**: unlike Dashboard/Analysis/Improve/Review-Mistakes (all typed sample/derived), Games ingests genuine user PGNs into the `games` table — so this phase **begins de-sampling the product** and is the precondition for Phase 11.

**The good news:** the hard data plumbing already exists and is tested — `lib/pgn.ts` (parse/validate/split), `lib/pgnLimits.ts` (5 MiB guard), `src/workers/pgnWorker.ts` (off-main-thread parsing), and the legacy `GameList.tsx` already does paginated load, **server-side search across all games**, and **upload/paste import with parse→insert progress**. The problem is purely the **Obsidian UI** (`--cm-*`, modal-based) — the engine is sound.

**The main gap:** the `games` table is minimal (`id, user_id, pgn, white_player, black_player, result, date, event, user_color, uploaded_at, created_at`). It has **no `opening`, no `time_control`, and no analysis-status column** — all of which §4.2 requires (filters + quick-insight + "analyzed vs pending"). For v1 these are **derived** (opening/ECO + TimeControl from PGN headers at parse time; status by presence of `game_analysis_results`/`move_analysis`), consistent with the project's sample/derived pattern; persisted columns are a Phase-11 migration.

**Recommended approach:** extract the legacy data logic into Ivory hooks, build the §4.3 **Import** route first (one parsed game unblocks real Analysis → Review Mistakes → Improve), then the §4.2 **Library** screen, all behind `ui.screen.games`. "Connect Chess.com/Lichess" has **no existing integration** → keep it as a secondary, **deferred/stub** action for v1 (paste + upload are the real paths).

**Effort:** Medium. **Risk:** Low–Medium (first real DB-backed screen → auth/RLS, pagination, dedupe — all already handled in the legacy code we're reusing).

---

## Major findings
1. **First real-data screen** — Games is where typed sample data ends and live `games`-table data begins. Sets the pattern for Phase 11 de-sampling.
2. **Engine exists, UI doesn't** — parse/validate/split + worker + paginated load + server search + import-with-progress are all present in `lib/pgn`/`pgnWorker`/`GameList`; only the Ivory UI is missing.
3. **Schema gaps vs §4.2** — no `opening`/`time_control`/analysis-status columns → derive for v1 (PGN headers + analysis aggregates), persist in Phase 11.
4. **Connect account is net-new** — no Chess.com/Lichess integration exists; secondary action → defer/stub for v1.
5. **Game detail = Analysis** — §3 says selecting a game → Analysis; `/games/:id` should route into the Analysis Workspace, not a separate screen.
6. **Quick-insight strip needs analysis aggregates** (most common mistake / best opening / avg accuracy) — derive where analysis exists, empty/skeleton otherwise.

---

## Reuse vs Replace vs Create

| Item | Disposition | Notes |
|---|---|---|
| `lib/pgn.ts` (`parsePGN`, `validatePGN`, `splitPGN`, `moveToSAN`) | **Reuse** | Tested; parse + multi-game split + header extraction. |
| `lib/pgnLimits.ts` (`checkPgnSize`, `MAX_PGN_BYTES` 5 MiB) | **Reuse** | Upload/paste size guard. |
| `src/workers/pgnWorker.ts` (+ test) | **Reuse** | Off-main-thread parsing of large/multi-game PGNs. |
| `GameList.tsx` **data logic** (paginated load, `hasMore`/load-more, server-side search, upload/paste → worker → insert with parse/insert progress, dedupe) | **Reuse (extract)** | Lift into Ivory hooks (`useGames`, `useImportGames`); discard the UI. |
| Supabase `games` table + RLS | **Reuse** | Add derived metadata client-side for v1; columns later. |
| Phase-2 primitives (MetricCard, Search/Input, SegmentedControl, Dropdown, Badge→StatusBadge, Button, Toast, EmptyState, Skeleton) | **Reuse** | All §4.2/§4.3 required components exist. |
| Phase-3 shell + routing + `useFlag` | **Reuse** | `/games`, `/games/import`, `/games/:id` route slots already stubbed. |
| Analysis Workspace (Phase 5) | **Reuse (integrate)** | Open game → `/analysis/:id`; first-run → `/games/import`. |
| `GameList.tsx` / `AnalyzeGamesPage.tsx` / paste-modal **UI** (`--cm-*`, modal) | **Replace** | Rebuild as Ivory `/games` screen + `/games/import` route. |
| Legacy `GameViewer` | **Replace** (not needed) | Analysis is the viewer now. |
| **Game Library screen** (`/games`): header + import actions, Quick-insight strip, Filter toolbar, Collections, GameTable (desktop) ↔ GameCardList (mobile) | **Create** | `features/games/*`. |
| **GameRow (full)** + **StatusBadge** (analyzed/pending) + **ImprovementTag** | **Create** | §4.2 components. |
| **Import route** (`/games/import`): source picker (paste/upload/connect-stub), textarea + dropzone, parsed-preview list, progress/status, recoverable errors, empty state | **Create** | §4.3. |
| Hooks: `useGames` (paginated + filtered + search), `useImportGames` (worker + insert + progress), `deriveGameMeta` (opening/ECO + time-control + status) | **Create** | Wrap the reused logic. |
| **Collections** (saved smart-filters) | **Create** | §4.2; localStorage for v1 (server later). |
| Routing: real `/games` + `/games/import`; `/games/:id` → redirect to `/analysis/:id` | **Create** | Behind `ui.screen.games`. |
| `e2e/games-a11y.spec.ts` | **Create** | Wire into CI. |

---

## Workflow analysis

### Import workflow (§4.3)
`Choose source (paste / upload / connect) → paste textarea or drop file → parse (worker) → parsed-preview list → confirm → insert with progress → toast + land in Library (queued for analysis)`.
- Reuse: `checkPgnSize` (reject > 5 MiB with a clear message), `splitPGN`/`parsePGN` in `pgnWorker`, the insert-with-progress flow from `GameList`.
- Create: the Ivory route, source picker, dropzone, preview list, progress/status UI; **recoverable errors** (per-game parse failures shown, valid games still importable); dedupe on re-import.
- v1: **paste + upload real**; **connect = secondary, deferred/stub** (no OAuth yet).

### Library workflow (§4.2)
`Land → quick-insight strip → search/filter/sort or pick a collection → scan rows (status + improvement tags) → open a game → Analysis`.
- Success metric: **locate any game in ≤2 actions**; **status unambiguous at a glance** (StatusBadge analyzed/pending).
- Reuse: paginated load + server search.

### Filtering / Search / Collections
- **Filters (§4.2):** result (win/loss/draw), color (white/black), **time control** (derived), sort (date/accuracy/…). SegmentedControl + Dropdown.
- **Search:** server-side across all games (reuse), not just the loaded page.
- **Collections:** saved smart-filters ("Losses to review", "Endgame slips") — the natural deep-link target for Improve/Review-Mistakes. localStorage for v1 (`cm.collections`), server in Phase 11.

### Game metadata
- Present (table): players, result, date, event, user_color, pgn.
- **Derived (v1):** opening/ECO + time control from PGN headers (`parsePGN`); **analysis status** from presence of `game_analysis_results`/`move_analysis`; accuracy / most-common-mistake from analysis aggregates (where present).

### Mobile behavior (§4.11)
- GameTable → **GameCardList** (≤767); filters → toolbar/sheet; quick-insight stacks; import is a full route (textarea-first); 44px targets; bottom tab bar (Games active).

### Accessibility (§11)
- Table semantics (`role`/headers) or a well-labelled list; sortable headers announced; filters = radiogroup/labelled selects; StatusBadge text not color-only; search labelled; dropzone keyboard-operable with an `<input type=file>` fallback; route focus → h1; recoverable import errors announced (`aria-live`); AA contrast (`--text-low` for small text). Wire `/games` + `/games/import` axe into CI.

---

## Spec mismatches
1. **Schema:** `games` lacks `opening`/`time_control`/analysis-status → derive for v1, persist Phase 11.
2. **Connect account:** no Chess.com/Lichess integration → secondary, deferred/stub.
3. **Game detail:** `/games/:id` is not a standalone screen — it routes into Analysis (§3).
4. **Quick-insight strip:** needs analysis aggregates → derive where available; empty state otherwise.

## Technical risks
- **First DB-backed screen:** auth/RLS, pagination correctness, import **dedupe**, `user_color` detection — all already solved in the legacy code being reused (mitigates risk).
- Worker/bundler wiring for `pgnWorker` under the new shell.
- Derivation correctness (opening/time-control parsing varies by PGN source).

## Performance risks
- Large libraries → keep pagination/load-more (reuse); virtualize the table only if needed.
- Large/multi-game PGNs → already off-main-thread (worker) + 5 MiB cap.
- Server search debounced; avoid N+1 on status derivation (batch the analysis-existence lookup).

## UX risks
- **"Never just a list" (§4.2):** quick-insight + collections + status badges must make it feel like a tool, not a table dump.
- Import errors must be **explained + recoverable** (partial success: import the valid games, list the skipped with reasons).
- Don't reintroduce a modal (legacy pattern) — Import is a routed screen.

## Decisions required (Gate 0)
1. **Derive vs migrate** opening/time-control/status for v1 — recommend **derive** (PGN headers + aggregates), persist Phase 11.
2. **Connect account** — recommend **defer/stub** (paste + upload for v1).
3. **Real data now** — confirm Games runs on the live `games` table (begins de-sampling), not fixtures.
4. **Collections storage** — localStorage v1 → server Phase 11.
5. **Flag granularity** — one `ui.screen.games` for both Library + Import, or a separate `ui.screen.gameImport`.

See `PHASE_7_IMPLEMENTATION_PLAN.md` for milestones, dependencies, acceptance criteria, testing, and visual review gates.
