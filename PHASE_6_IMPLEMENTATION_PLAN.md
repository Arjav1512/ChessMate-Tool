# Phase 6 — Improve Hub · Implementation Plan

> **Authority:** `CHESSMATE_SYSTEM_DESIGN.md` §9 (+ §4.6/§6/§12) · `CHESSMATE_IMPLEMENTATION_ARCHITECTURE.md` §4/§5/§7/§12. Input: `PHASE_6_DISCOVERY.md`, `PHASE_6_BACKLOG.md`. Documentation wins.
> **Constraints:** strangler — behind `ui.screen.improve` (placeholder when off); legacy untouched; client-side; **typed sample/derived** data (decision #3); reuse Phases 1–5; PR base `prod/mistake-review-b4`; **visual review gate before the PR**; **no merge** without approval.
> **This is a plan. No implementation until approved.**

---

## Decisions needed before build (confirm at kickoff)
1. **Weakness category mapping** to §9's `Tactical/Opening/Endgame/Positional` — proposed: `motif`+`recurring`→Tactical · `phase:endgame`→Endgame · `opening`+`color`→Opening · `phase:middlegame`+positional→Positional.
2. **Severity bands** from `severity:0–100` → High (≥66) / Medium (33–65) / Low (<33), ranked by **rating impact** (severity × confidence × frequency as the impact proxy until real rating-impact lands).
3. **Radar "Time" axis** = sample value (no clock-analysis data source yet) — acceptable for v1?
4. **Send-to-Improve ingestion** = queued motifs surface as study-plan items merged into the matching weakness — acceptable on the sample plan until Phase 11?
5. **Reuse vs re-create** dashboard `FocusCard`/timeline: reuse the **pattern/CSS** (the dashboard components are hook-coupled) — confirm we build Improve-owned components rather than refactoring the dashboard ones now.

---

## Milestones

### M1 — Data + charts foundation
- `RadarChart` (`components/charts`): 5–6 axes, rings, "you" vs dashed "peers", ≥66px label margin, `role="img"` + aria-label.
- `lib/learning/objectives.ts`: curated catalog keyed by `weakness.key` → `{ objective, sessionTypes[], positionSet }` (Architecture §12).
- `lib/improve/` mapping: weakness category map + severity bands + rating-impact ranking (pure, unit-tested).
- `features/improve/sampleImprove.ts` + hooks (`useWeeklyFocus`, `useSkillProfile`, `useWeaknessCategories`, `useStudyPlan`, `useMilestones`) shaped to the real API; derive from `weaknessProfile` where possible, sample otherwise.
- `ImprovePage` scaffold + `/improve` route behind `ui.screen.improve` (placeholder when off).

### M2 — Weekly focus + skill profile
- Weekly-Focus **hero** (✦ label, title, rationale, 2 MetricCards sessions X/5 + phase-acc delta, **Primary "Continue · session N"**, halo) — reuse the dashboard hero pattern.
- Skill profile card (RadarChart "you" vs peers + legend).
- Header + provenance ("Built from N analyzed games").

### M3 — Weakness profile + study plan
- `WeaknessCategoryCard` (icon, category, phase accuracy, severity badge, 2–3 sub-weakness rows) + category-filter `SegmentedControl`; weakest tints `--error`.
- `StudyPlanRow` (type icon, title, description, est. minutes, Next/Queued; first highlighted) + the **plan-composition** function (rank → focus → ordered sessions; **ingest the Send-to-Improve queue**; `replay` reuses `mistakeReview`).

### M4 — Milestones + loop wiring + states/responsive/a11y
- `MilestoneTimeline` (achieved/in-progress %/future) — reuse dashboard roadmap pattern.
- "Start session" Primary → training stub (sample) routed; one Primary per view enforced.
- All four states (loading skeletons / empty "Analyze games to build your plan" / error+retry / success); mobile (weekly focus first, filter chips, stacked cards); a11y + axe; route focus.

### M5 — Visual review gate
- Screenshots (desktop/tablet/mobile + states), UX rationale, component usage; **STOP for approval.**

### M6 — PR workflow (after approval)
- Full gate + tests; commit (no squash); push `feature/phase-6-improve`; open PR (base `prod/mistake-review-b4`); CodeRabbit loop; **no merge**.

---

## Dependencies
Phase 1 tokens · Phase 2 primitives · Phase 3 shell/routing/flags/Zustand · Phase 4 chart conventions + `FocusCard`/timeline patterns + `sampleDashboard` VM shapes · Phase 5 `lib/analysis`, `lib/weaknessProfile`, `lib/mistakeReview`, **Send-to-Improve queue** (`cm.improveQueue`).

## Acceptance criteria (§9 + DoD §15 / Arch §25)
- Matches §9 layout/hierarchy/tokens; "what to work on next" answerable at a glance; each weakness → a concrete training action; **exactly one Primary** (Weekly Focus).
- Insight→action path works: a Send-to-Improve item from Analysis appears in the plan.
- All four states; mobile re-thought (chips + stacks, weekly focus first); 44px targets.
- Keyboard + visible focus + route focus; AA contrast (labels `--text-low`); charts `role="img"` + labelled; meaning never color-only; reduced-motion; **axe clean** (component + e2e, wired into CI `accessibility`).
- typecheck/lint/tests/build green; behind `ui.screen.improve`; legacy untouched; no console errors.

## Testing strategy (Arch §20)
- **Unit:** category mapping; severity banding + impact ranking; plan composition (focus pick + ordered sessions); Send-to-Improve queue ingestion; learning-objective lookup.
- **Component:** RadarChart aria-label; category filter (radiogroup); WeaknessCategoryCard severity badge (not color-only); StudyPlanRow order/Next; one-Primary invariant; all four states; jsdom axe smoke.
- **Integration:** Send-to-Improve item (seeded `cm.improveQueue`) → appears in the Study Plan; "Start session" routes.
- **E2E a11y (`e2e/improve-a11y.spec.ts`):** `/improve` structural axe + real-browser contrast + route focus + Coach/competing-primary checks; wire into CI.

## Visual review gates
- **Gate A (kickoff):** confirm the 5 decisions above (taxonomy/severity/time-axis/ingestion/reuse).
- **Gate B (M5):** screenshots + rationale → approval before any PR (per Phases 4/5 protocol).

## Out of scope (Phase 6)
Real drill/training execution engine; server-side `build-plan`; real `improvement_plans`/`training_sessions`/`milestones`/`rating_history` tables (Phase 11). Standalone **Weakness Profile** + **Progress** screens (Phase 9) — Improve shows their summary/entry points per §3.
