# Post-Merge Report — Improve · Review Mistakes (Phase 7 workstream)

**Merged:** PR #26 → `prod/mistake-review-b4` (merge `b109186`), 2026-06-23. Behind `ui.screen.improve` (default OFF). Strangler intact; legacy untouched.

## What shipped
- **Improve · Review Mistakes** at `/improve/mistakes` — a new view inside the Improve Hub (view switcher: Plan | Review mistakes). **Not** a new IA destination (Gate-0 / D-014).
- **Single mistake feed** (`buildReviewFeed`): the B-4 `lib/mistakeReview` engine ∪ the Send-to-Improve queue, deduped + priority-ordered (severity + motif + recurrence).
- **Master/detail UI:** priority feed (move-quality dot+symbol, motif, phase, "From analysis" tag) + drill detail (`BoardContainer`, played vs best + eval cost, the lesson).
- **One Primary per mistake** — "Open in Analysis"; ghost "Add to study plan" writes the shared `cm.improveQueue`. Phase/motif filters; loading/empty/error/filtered-empty states.
- **Taxonomy bridge** via `mapLegacyClassification` (`excellent→best`). Reuses Analysis `BoardContainer`; hands off to Analysis for deep study.
- **Loop closed:** Analysis → Send to Improve → appears atop Review Mistakes; "Add to study plan" → Improve Plan replay sessions deep-link back.
- 15 unit/component tests (one-Primary invariant, queue ingestion, taxonomy, filters, 50+ scalability, filtered-empty); `/improve/mistakes` a11y e2e wired into CI; Playwright `reducedMotion` to stabilize axe.

## What was deferred
- Live data: runs on typed sample/derived; the real `useMistakeReview` (`move_analysis`) swap → **Phase 11**.
- "Open in Analysis" deep-links to the sample workspace at a `?ply=` query — the ply is passed but **not yet consumed** by Analysis.
- Persisted "reviewed/resolved" state, SRS/spaced-repetition drills, server-side aggregation → **Phase 11 / post-v1**.

## Known limitations
- Sample mistakes only (feed not yet driven by the user's real analyzed games).
- Board orientation defaults to white (not flipped to the mistake's side to move).
- "Add to study plan" toasts + writes the queue; no undo.

## Technical debt
- Curated `lib/learning` catalog is small; expand when real plan data lands.
- The Send-to-Improve queue is localStorage (`cm.improveQueue`) shared by Analysis/Improve/Review — fine for v1, becomes a server table in Phase 11.
- `makeSampleMistakes` generator ships in the test path only (tree-shaken from prod).
- Two prior crash-guard fixes (Phase 6) landed via hotfix #25 cherry-picks, not the original SHAs — history is correct but non-linear.

## Follow-up items
1. Wire `?ply=` consumption in the Analysis Workspace so "Open in Analysis" lands on the exact move.
2. Swap sample → live (`useMistakeReview` + `weaknessProfile`) when the data layer lands (Phase 11).
3. Flip board orientation to the side that erred.
4. Consider surfacing a Review-Mistakes entry point from the Dashboard "recently analyzed".

## Quality at merge
typecheck ✅ · lint ✅ (0 errors) · unit **225** ✅ · a11y e2e **24/24** ✅ · build ✅ · CodeRabbit (PR #26) 3/3 resolved.
