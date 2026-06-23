# Game Library + Import — Visual Architecture Review (Phase 7)

> **Authority:** `CHESSMATE_SYSTEM_DESIGN.md` §4.2/§4.3 (+ §3 IA, §6 components, §10 responsive, §11 a11y); Architecture §4/§5/§7/§22. Inputs: `PHASE_7_DISCOVERY.md`, `PHASE_7_IMPLEMENTATION_PLAN.md` + Gate-0 decisions. Documentation wins.
> **Status:** Architecture review only — no code, no branch, no PR. Diagrams are schematic (proportion, not pixels). Ivory tokens + Phase 1–3 primitives; behind `ui.screen.games`; real `games`-table data.

**Gate-0 (locked):** (1) **derive** opening/time-control/analysis-status for v1 (persist Phase 11); (2) Chess.com/Lichess **deferred** → disabled "Coming soon" secondary; (3) **real games data** (begin de-sampling); (4) Collections in **localStorage** v1; (5) single flag **`ui.screen.games`** for Library + Import.

---

## 1. Desktop Layout (`/games`, ≥1024, inside the shell)

```
┌── Sidebar ──┐┌─────────────────────────── /games content (max --content-max) ───────────────────────┐
│ ◉ Dashboard ││ Your games                                  [ Connect · soon ]  [ Import PGN → ]      │ ← header + import actions
│ ▦ Games  ◀  ││ ─────────────────────────────────────────────────────────────────────────────────── │
│ ◎ Analysis  ││ ┌ most common mistake ┐ ┌ best opening ────┐ ┌ avg accuracy ──┐   (Quick-insight strip│
│ ▲ Improve   ││ │ Hanging pieces · 23% │ │ Italian · 71% WR │ │ 78%   ▲ +3%    │    = 3 MetricCards)   │
│ ✦ Coach     ││ └──────────────────────┘ └──────────────────┘ └────────────────┘                      │
│             ││ ┌ Collections ─────────────────────────────────────────────────────────────────────┐ │
│ Collections ││ │ • All games (142)  • Recent  • Favorites  • Losses to review  + New collection     │ │
│  • All      ││ └──────────────────────────────────────────────────────────────────────────────────┘ │
│  • Recent   ││ [ 🔍 Search all games        ]  Result:‹All|Win|Loss|Draw›  Color:‹All|W|B›           │ ← filter toolbar
│  • Losses…  ││                                  Time: [Any ▾]   Sort: [Newest ▾]      [ ▦ Table | ☰ ] │   (search+segmented+dropdown+mode)
│             ││ ┌ GameTable ───────────────────────────────────────────────────────────────────────┐ │
│             ││ │  Opponent        Result  Color  Opening        Time    Date      Status        ›   │ │ ← sortable header row
│             ││ │  M. Carlsen      1–0 ✓   ●W     Italian Game   10+0    Jun 21    ✓ Analyzed    →   │ │
│             ││ │  hikaru          0–1     ○B     Sicilian Najd. 5+3     Jun 20    ◷ Pending     →   │ │ ← GameRow (full)
│             ││ │  a_pawn_storm    ½–½     ●W     QGD            15+10   Jun 18    ✓ Analyzed ▾2 →   │ │   (▾2 = 2 improvements)
│             ││ │  …                                                                                  │ │
│             ││ │                              [ Load more ]                                          │ │ ← pagination (reused)
│             ││ └────────────────────────────────────────────────────────────────────────────────────┘ │
└─────────────┘└───────────────────────────────────────────────────────────────────────────────────────┘
```

- **Header / import actions:** **Import PGN** = the one Primary; **Connect · soon** = disabled secondary (Gate-0 #2).
- **Quick-insight strip:** 3 MetricCards (most common mistake / best opening / avg accuracy) — derived from analysis aggregates; empty/skeleton when no analyzed games.
- **Collections:** All / Recent / Favorites / custom + "Losses to review" (deep-link target from Improve · Review Mistakes).
- **Filter toolbar:** Search (server-side, all games) · Result + Color = `SegmentedControl` · Time control = `Dropdown` (derived) · Sort = `Dropdown` · Table/Card **mode toggle**.
- **GameTable:** sortable headers; **GameRow (full)** with **StatusBadge** (✓ Analyzed / ◷ Pending — text + icon, never color-only) and **ImprovementTag** (▾N); row → Analysis. Load-more pagination (reused).
- **"Never just a list" (§4.2):** insight strip + collections + status + improvement tags make it a tool, not a spreadsheet.

---

## 2. Import Flow (`/games/import`)

```
                         ┌──────────────── /games/import ────────────────┐
                         │ Source:  ( ● Paste )  ( Upload )  ( Connect·soon)│
                         └───────────────────────┬───────────────────────┘
        ┌────────────────────────────────────────┴───────────────────────────┐
        ▼ PASTE                                                                ▼ UPLOAD
 ┌──────────────────────┐                                        ┌──────────────────────────┐
 │ textarea (focus ring) │                                        │ dropzone  ⬚  drag & drop  │
 │ "Paste PGN…"          │                                        │ or [ Choose file ] (input)│
 └──────────┬───────────┘                                        └─────────────┬────────────┘
            └───────────────────────────┬────────────────────────────────────┘
                                         ▼  VALIDATION (checkPgnSize ≤5 MiB → splitPGN → parsePGN, in pgnWorker)
                              ┌──────────────────────────────┐
                              │ Parsed-preview list           │
                              │  ✓ Carlsen–you 1–0  Italian   │  ← GameRow (preview) per game
                              │  ✓ you–hikaru 0–1   Sicilian  │
                              │  ⚠ game 3: malformed header   │  ← per-game error (recoverable)
                              │  [ Cancel ]      [ Import 2 → ]│  ← imports the 2 valid; skips/keeps the 1
                              └───────────────┬───────────────┘
                                              ▼ IMPORT PROGRESS (parse ✓ → insert n/total, dedupe)
                              ┌──────────────────────────────┐
                              │ Importing…  ▓▓▓▓▓░░  3/5       │
                              └───────────────┬───────────────┘
                ┌─────────────────────────────┼─────────────────────────────┐
                ▼ SUCCESS                       ▼ PARTIAL                      ▼ ERROR (all invalid / too big)
   toast "5 games imported"          toast "3 imported · 2 skipped"   ErrorState "Couldn't read that PGN"
   → land in Library (queued)        skipped list w/ reasons + retry  + how to fix + Retry (recoverable)
```

Reuses `checkPgnSize`, `splitPGN`/`parsePGN` (in `pgnWorker`), and the insert-with-progress + dedupe from legacy `GameList`. **Routed screen, not a modal** (no legacy modal pattern).

---

## 3. Mobile Layout (≤767)

```
┌──────────── top bar ───────────┐     /games/import (mobile)
│ ♟ ChessMate      ⌕    ◯         │     ┌─────────────────────────────┐
│ Your games        [ Import → ] │     │ Add games                    │
├─────────────────────────────────┤     │ ‹ Paste ›‹ Upload ›‹ soon › │ ← source chips
│ ‹mistake›‹opening›‹accuracy›    │ ←ins │ ┌ textarea (Paste PGN…)    ┐ │
│   (insight cards scroll)        │ strip│ └──────────────────────────┘ │
├─────────────────────────────────┤     │ [ Preview ]                  │
│ 🔍 Search                       │     │ ── preview list (cards) ──   │
│ [ Filters ▾ ]  [ Newest ▾ ]    │ ← filter sheet trigger │ [ Import 2 → ] (sticky)      │
├─────────────────────────────────┤     └─────────────────────────────┘
│ ┌ M. Carlsen · 1–0 ✓         ┐ │ ← GameCardList (table → cards)
│ │ ●White · Italian · 10+0     │ │
│ │ Jun 21 · ✓ Analyzed  ▾2   →│ │
│ └─────────────────────────────┘ │
│ ┌ hikaru · 0–1               ┐ │
│ │ ○Black · Sicilian · ◷ Pend.│ │
│ └─────────────────────────────┘ │
│ [ Load more ]                   │
├─────────────────────────────────┤
│ [ ◉ ][ ▦ Games ][ ◎ ][ ▲ ]     │ ← bottom tab bar (Games active)
└─────────────────────────────────┘
```

**Hierarchy:** header+Import → insight cards (h-scroll) → search → filters (sheet) → **GameCardList** → load more. Import is textarea-first (paste is the mobile-friendly path); filters collapse into a sheet; 44px targets.

---

## 4. Game Row Architecture

**Full row (Library) — exact hierarchy:**
```
GameRow
├─ Opponent        (vs the user's color; bold) + event (subtle)
├─ Result          "1–0 / 0–1 / ½–½" + win/loss/draw glyph (text, not color-only)
├─ Color           ●White / ○Black (user_color; "—" if NULL, never guessed)
├─ Opening         derived (ECO/Opening header) — "Italian Game"
├─ Time control    derived (TimeControl header) — "10+0"  (Any when absent)
├─ Date            played date
├─ Status          StatusBadge: ✓ Analyzed | ◷ Pending  (derived from analysis presence)
├─ ImprovementTag  ▾N (mistakes worth review) — links into Review Mistakes (optional)
└─ Action          whole row → /analysis/:id  (one primary affordance; "→")
```
- **Preview row (Import):** Opponent · Result · Opening + a parse ✓ / ⚠ status; no actions except include/skip.
- One primary affordance per row (open → Analysis); status + improvement are information, not competing actions.

---

## 5. Collections System

```
Collections (localStorage v1 — key `cm.collections`)
├─ Built-in (virtual, not stored):
│   • All games      → no filter
│   • Recent         → sort=date desc, last N
│   • Favorites      → games flagged ★ (ids in localStorage `cm.favorites`)
│   • Losses to review → filter {result: loss, status: analyzed}  (Improve/Review-Mistakes deep-link)
└─ Custom (stored): { id, name, filter: {result?, color?, timeControl?, search?, sort} }
```
- **Storage model (Gate-0 #4):** built-ins are computed from filter presets (no storage); custom collections + favorites persist in `localStorage` for v1 → server table in Phase 11. A collection is just a **named, saved filter** — selecting one applies its filter to the same `useGames` query (one query path, no parallel list).

---

## 6. Import Experience (the four paths)

| Path | Trigger | Behavior |
|---|---|---|
| **Happy** | valid PGN(s) pasted/uploaded | parse → preview all ✓ → Import → progress → toast "N imported" → Library (queued for analysis). |
| **Duplicate** | game already in `games` | dedupe at insert; preview marks "Already imported"; counted as skipped, not an error ("3 imported · 1 already in library"). |
| **Invalid PGN** | unparseable / >5 MiB | `checkPgnSize`/`parsePGN` fail → ErrorState explains (size / format) + **Retry**; nothing inserted; input preserved. |
| **Partial** | mixed valid + invalid in a multi-game paste | import the valid games; list skipped with per-game reasons; **recoverable** (fix + re-paste the skipped). |

Principle (§4.3): **errors explained + recoverable**; partial success never blocks the good games; status is always clear.

---

## 7. Analysis Integration (routing & handoff)

```
/games  ──(click row / "Open")──►  /analysis/:id      (Analysis Workspace, Phase 5)
/games/:id  ──(redirect)──────────►  /analysis/:id      (no standalone detail screen, §3)
Dashboard "recent" / "All games" ─►  /games
Improve · Review Mistakes "Open in Analysis" ─► /analysis/:id  (existing)
first-run (no games) ─────────────►  /games/import
Import success ───────────────────►  /games  (game queued; opens in Analysis on click)
```
- **Handoff:** the row passes the game `id`; Analysis owns viewing/engine. Games never re-implements the board (boundary: Games = locate/manage, Analysis = understand). De-samples Analysis once real games exist.

---

## 8. Accessibility Review (§11)
- **Keyboard:** Import source picker = radiogroup; textarea focusable; **dropzone has an `<input type=file>` fallback** (keyboard-operable); filter Segmented = radiogroups, Dropdowns = listbox; table headers are real buttons for sort; every row reachable + `Enter` opens; mode toggle (Table/Card) labelled.
- **Screen reader:** GameTable uses table semantics (`columnheader`, `aria-sort`) OR a labelled list on mobile; StatusBadge conveys analyzed/pending in **text**; result/color never color-only; import progress + partial/error results announced via `aria-live`; route focus → h1.
- **Tables/Cards:** one accessible name per row ("Carlsen, you won as White, Italian Game, analyzed, 2 improvements"); card list mirrors it.
- **Import flow:** validation errors associated with the input; "Import N" button states the count; success toast announced.
- AA contrast (small/secondary text `--text-low`, the Phase-5/6 lesson). Wire `e2e/games-a11y.spec.ts` (`/games` + `/games/import`) into CI.

---

## 9. Visual Risk Review

| Risk | Where | Mitigation |
|---|---|---|
| **Spreadsheet-app feel** | a dense table can read as Excel, not a chess tool (§4.2 "never just a list") | Lead with the **quick-insight strip** + **collections** + **status/improvement** semantics; generous spacing; chess-specific columns (opening, result glyph, improvement tags); card mode for browsing. |
| **Empty-library** | new users have zero games → a blank table is a dead end | First-run routes to **Import**; the empty state is an **onboarding CTA** ("Import your first game" + paste affordance), not an empty grid. |
| **Import complexity** | source picker + validation + preview + progress can overwhelm | Progressive disclosure: one source at a time, paste default; preview before commit; **partial success + recoverable errors**; routed (not a cramped modal). |
| **Performance** | large libraries / large PGNs | Keep **pagination/load-more** (reused); parse in the **worker**; 5 MiB cap; **batch** the analysis-status lookup (no N+1); debounce search; virtualize the table only if a real ceiling appears. |
| **Status ambiguity** | "analyzed vs pending" must be glanceable (§4.2 success metric) | Explicit **StatusBadge** (icon + text) on every row; derived consistently via one helper. |

---

## 10. Final Recommendation

**Build order** (Import-first, per `NEXT_PHASE_RECOMMENDATION.md`):
1. **M1 Data layer** — `useGames` (paginated/filter/search), `useImportGames` (worker+insert+progress+dedupe), `deriveGameMeta` (opening/time-control/status). *Reuse the legacy logic.*
2. **M2 Import route** (`/games/import`) — the highest-ROI unblock: one real game de-samples Analysis → Review Mistakes → Improve.
3. **M3 Library screen** (`/games`) — insight strip, filter toolbar, GameTable ↔ GameCardList, GameRow/StatusBadge/ImprovementTag.
4. **M4 Collections + nav wiring** — saved filters (localStorage), open-game → Analysis, first-run → Import.
5. **M5 Responsive + a11y + states → audits → visual gate.**

**Review gates:**
- **Gate 0** ✅ (decisions locked, this doc).
- **Gate B (M5):** screenshots — desktop/tablet/mobile · Library + Import · empty/loading/error · large dataset → **approval before any PR**.
- **Gate C:** CodeRabbit resolved + CI green before the merge decision.

**Deferred items:** Chess.com/Lichess connect (disabled "soon"); persisted `opening`/`time_control`/status columns + server-side Collections/Favorites (Phase 11); table virtualization (only if needed); bulk re-analysis UX (legacy `BulkAnalysis` untouched). Cheap adjacent follow-up: consume the `?ply=` param in Analysis so Review-Mistakes "Open in Analysis" lands on the exact move.

---
*Stop. Visual architecture review only — no implementation, no branch, no PR.*
