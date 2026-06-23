# Phase 7 — Mistake Review System · Discovery & Gap Analysis

> **Authority read:** `CHESSMATE_SYSTEM_DESIGN.md` (§3 IA, §4 screens, §8 Analysis, §9 Improve, §4.7 Weakness) · `CHESSMATE_IMPLEMENTATION_ARCHITECTURE.md` (§4 routes, §5, §7, §12 Learning) · `PROJECT_STATE.md` · `IMPLEMENTATION_ROADMAP.md` · `DECISION_LOG.md` · `LOOP_LOG.md`.
> **Status:** Discovery only — no code, no branch, no PR.
> **Method:** re-read the spec for "mistake review", audited the existing B-4 assets (`lib/mistakeReview.ts`, `hooks/useMistakeReview.ts`, `components/stats/MistakeReview.tsx`), the `move_analysis` data path, and the Phase 5/6 Send-to-Improve loop.

---

## Executive summary

**⚠️ Blocking finding — scope/IA conflict (decision required before build).**
The brief calls this "Phase 7 — Mistake Review System," but:
- The **authoritative roadmap** (`IMPLEMENTATION_ROADMAP.md` §Phase 7, `SPRINT_BACKLOG.md`) defines **Phase 7 = Game Library + Import**.
- The **System Design IA (§3) and screen inventory (§4) contain no "Mistake Review" screen.** `grep` for "mistake review" in `CHESSMATE_SYSTEM_DESIGN.md` returns nothing. Mistake-review *functionality* is specified, but **distributed** across existing surfaces:
  - **Analysis (§8):** turning points, move-quality, and the **"Send mistake to Improve"** action.
  - **Improve (§9/§12):** `replay` study sessions = "the user's own lost games matching the motif" — the spec's home for reviewing mistakes as training.
  - **Weakness Profile (§4.7):** recurring weaknesses ranked by impact with a practice CTA.

So a **standalone "Mistake Review" top-level screen is not in the approved IA** — shipping one as a new nav destination would violate §14.3 ("Never change IA without explicit approval"). **Documentation wins → this needs your explicit decision** (see "Decisions required").

**What is real and strong:** the legacy **B-4 "Train On Your Mistakes"** engine already exists and is excellent, reusable, pure: `lib/mistakeReview.ts` turns `move_analysis` rows into a prioritized, filterable review feed (severity + motif importance + recurrence), with drillable FENs and best-move SAN. The only problem with the legacy feature is its **Obsidian UI** (`MistakeReview.tsx`, `--cm-*`) — the data layer is sound.

**Recommended path (spec-compliant):** implement Mistake Review **not as a new primary-nav screen** but as an **Ivory feed surfaced from existing IA**, most naturally:
1. as the materialization of Improve's **`replay` sessions** (§9/§12) — "Review your mistakes" within `/improve`, and/or
2. as a **filtered Games view** ("Losses to review" collection, §3 Game Library collections), and/or
3. reachable from **Analysis** (jump to a flagged position).
Reuse the B-4 engine; build the Ivory UI; wire the Send-to-Improve queue. This honors the intent (a dedicated mistake-review experience) without an unapproved IA change. **Confirm the placement before implementation.**

**Net:** the work is low-risk and asset-rich (engine + data exist), but the **placement/sequencing decision is the gate**.

---

## Major findings

1. **No Mistake Review screen in the spec IA** (§3/§4) — placement must be inside an approved surface (Improve / Games / Analysis), or you must approve an IA change.
2. **Roadmap resequencing** — Phase 7 was Game Library + Import; this reorders. Game Library would then move later (it's a dependency for the "Losses to review" collection placement, so order matters).
3. **B-4 engine is reusable as-is** — `lib/mistakeReview.ts` + `useMistakeReview` (data from `move_analysis`). Only the UI needs rebuilding in Ivory.
4. **Taxonomy mismatch (recurring theme)** — `mistakeReview`/`useMistakeReview` use the legacy `MoveClassification` (`best · excellent · good · …`) and legacy `Motif` set; the Ivory move-quality is `brilliant · best · good · inaccuracy · mistake · blunder` (Phase-5 `lib/analysis/moveQuality`, decision `excellent→best`). A mapping bridge is required.
5. **Data availability caveat** — `move_analysis` is only populated for analyzed games; in v1 the Analysis Workspace runs on **typed sample/derived** data (decisions #2/#3), so a live mistake feed may be sparse. The feature should run on sample/derived data for v1, consistent with prior phases.
6. **Heavy overlap with Phase 6 (Improve replay) and Phase 9 (Weakness Profile)** — scope must be drawn to avoid building the same thing twice.

---

## Reusable vs Replace vs Create

| Item | Disposition | Notes |
|---|---|---|
| `lib/mistakeReview.ts` (prioritized/filterable feed engine) | **Reuse** | Pure; severity+motif+recurrence ranking, drillable FEN, best-move SAN. |
| `hooks/useMistakeReview.ts` (move_analysis → MistakeInput[]) | **Reuse** (rehome to `features/…`) | Real data path; session-cached. |
| `lib/motifs.ts` (`MOTIF_INFO`, `Motif`) · `lib/moveAnalysis.ts` (`Phase`) | **Reuse** | Filter dimensions. |
| `move_analysis` table + indexes | **Reuse** | Already indexed for `(user_id, classification)`. |
| Phase-5 `BoardContainer` (read-only mini, last-move tint) | **Reuse** | The drill/position board. |
| Phase-5 `lib/analysis/moveQuality` (spec taxonomy + `excellent→best`) | **Reuse** | Map legacy `MoveClassification` → Ivory move-quality. |
| Phase-2 primitives (`SegmentedControl`/chips, `Card`, `Chip`/`MoveQualityChip`, `Badge`, `Skeleton`, `EmptyState`, `ErrorState`, `Button`) | **Reuse** | Filters + cards + states. |
| Send-to-Improve queue (`sendToImprove.ts` / `improve/queue.ts`) | **Reuse / integrate** | Mistakes tagged in Analysis feed the review + Improve plan. |
| `components/stats/MistakeReview.tsx` (legacy Obsidian UI) | **Replace** | `--cm-*` tokens, legacy `ChessBoard`; rebuild in Ivory. |
| Legacy `ChessBoard`/`EvaluationGauge` usage in the feature | **Replace** | Use Phase-5 `BoardContainer`. |
| Ivory Mistake Review feature (feed list, filter bar, drill card, "send to improve") | **Create** | `features/mistakes/*` (or within `features/improve`), behind a flag. |
| Taxonomy/motif bridge (legacy → Ivory) | **Create** | Small mapper. |
| Route/placement + flag | **Create** | Per the placement decision (Improve sub-view / Games collection / Analysis entry). |
| Sample/derived adapter (until live data) | **Create** | Mirrors Phase 4–6 pattern. |
| a11y e2e for the new surface | **Create** | Wire into CI `accessibility` job. |

---

## Requirements

### Data model
- **Inputs:** `move_analysis` (fen, san, best_move, cp_loss, phase, motif_tags, move_number, color, classification) per analyzed game (existing). View-models: `MistakeCardVM` (drill FEN, played SAN, best-move SAN, move-quality, phase, motifs, priority, gameId/ply for "open in Analysis").
- **No new tables** for v1 (sample/derived where `move_analysis` is sparse; real swap is the hook). Persisted "reviewed/resolved" state is a Phase-11 consideration.

### Routing
- **Decision-dependent.** Options: (a) `/improve` sub-view/tab ("Review mistakes"); (b) `/games?filter=losses` collection → feed; (c) entry from `/analysis`. **No new top-level route without IA approval.** Behind a per-screen flag (e.g. `ui.screen.mistakes` only if a dedicated route is approved; otherwise reuse `ui.screen.improve`/`ui.screen.games`).

### State management
- **Server/derived state:** TanStack Query / the existing session-cache hook for the feed. **UI state (Zustand/local):** active phase/motif filter, current drill index. URL: filter + selected mistake (shareable).

### Accessibility (§11)
- Filter = radiogroup/segmented (reuse Phase 2); each mistake card a labelled item ("Move 24, blunder, hung the queen"); board = `BoardContainer` (SAN as accessible source); move-quality as chip+symbol+label (never color-only); keyboard + visible focus; route focus → h1; reduced-motion; AA contrast (labels `--text-low`). Wire an axe e2e into CI.

### Mobile (§4.11/§10)
- Filter chips horizontally scroll; feed as full-width cards; drill board fits width; bottom tab bar; 44px targets; one Primary ("Send to Improve" or "Open in Analysis").

### Integration points
- **Analysis Workspace:** each mistake card → "Open in Analysis" (`/analysis/:gameId` at the flagged ply); the Analysis "Send to Improve" already feeds the same motif space.
- **Improve Hub:** the review feed is the natural source for `replay` study sessions (§9/§12); a tagged mistake should appear in both the feed and the Improve plan (shared `cm.improveQueue` + `move_analysis`). Avoid duplicating the plan UI.
- **Dashboard:** "Recently analyzed" / weakness summaries link here; the review count could surface as a dashboard signal (no new dashboard work required).

---

## Spec mismatches
1. **IA:** no Mistake Review screen in §3/§4 (blocking placement decision).
2. **Roadmap:** Phase 7 = Game Library + Import (resequencing).
3. **Taxonomy:** legacy `MoveClassification`/`Motif` vs Ivory move-quality — needs a mapper (`excellent→best`).
4. **Overlap:** functionality intersects Improve `replay` (§9/§12) + Weakness Profile (§4.7) — scope boundary needed.

## Technical risks
- Sparse live data (`move_analysis` only for analyzed games; v1 analysis is sample/derived) → run on sample/derived for v1.
- Taxonomy/motif mapping correctness.
- "Drill" expectation: there is no training engine — a "drill" here = step the position / open in Analysis (set expectations; no SRS in v1, per B-4's own scope note).

## Performance risks
- `move_analysis` read volume per user — already indexed (`(user_id, classification)`, `(game_id, ply)`); aggregation is client-side and bounded (limit 24). Virtualize if the feed grows. Low risk.

## UX risks
- **Duplication** with Improve/Analysis (the biggest risk) — could feel like a third place that shows the same mistakes. Mitigate by making this the *single* mistake **feed** that the others link into, not a parallel plan.
- **Analytics-dump feel** — lead with the position + the lesson + one action, not a stats list (carry the Phase-4/6 lesson).
- **Placement confusion** — if buried, users won't find it; if a new nav item, it breaks IA. The placement decision resolves this.

---

## Decisions required (gate before any implementation)
1. **Confirm Phase 7 = Mistake Review** (resequence Game Library to a later phase) — or keep the roadmap and treat Mistake Review as a Phase-6 addendum / Phase-9 item.
2. **Placement** (spec-compliant): Improve sub-view ▸ / Games "Losses to review" collection / Analysis entry / (or approve a new IA destination).
3. **Data:** sample/derived for v1 (consistent with decisions #2/#3) — confirm.
4. **Scope boundary** vs Improve `replay` + Weakness Profile (avoid duplication).
5. **Taxonomy/motif mapping** to the Ivory move-quality set.

See `REVIEW_MISTAKES_IMPLEMENTATION_PLAN.md` for the milestone breakdown, acceptance criteria, and how each milestone is gated on these decisions.
