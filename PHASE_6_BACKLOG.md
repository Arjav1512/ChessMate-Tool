# Phase 6 — Improve Hub · Backlog

> **Authority:** `CHESSMATE_SYSTEM_DESIGN.md` §9 (Improve Hub, authoritative) + §4.6, §6, §12; Architecture §4 (`/improve`), §5, §7, §12 (Learning System). Documentation wins.
> **Status:** Not started — planning backlog. Detailed discovery + visual architecture happen at Phase 6 kickoff (same gated flow as Phases 4/5).
> **Constraints:** strangler — behind `ui.screen.improve` (placeholder when off); legacy untouched; typed sample/derived data (decision #3); reuse Phase 1–5 tokens/primitives/charts; PR base `prod/mistake-review-b4`; visual review gate before PR; no merge without approval.

Improve is **the product differentiator** (§4.6): it organizes detected weaknesses into a personalized plan and answers "what should I work on next?" in one glance, with every weakness linked to a concrete training action. It closes the loop that Phase 5's **Send-to-Improve** opens.

---

## Sections to build (§9)
1. **Header + provenance** — "Your improvement plan" + "Built from N analyzed games · refreshes as you play".
2. **Weekly focus (hero, 1.4fr)** — ✦ "Weekly focus · week N", title, data-tied rationale, 2 MetricCards (sessions X/5, phase-accuracy delta), Primary "Continue · session N", ambient halo. *(Reuse the dashboard `FocusCard` hero pattern.)*
3. **Skill profile (1fr)** — **RadarChart** (Tactics/Openings/Middlegame/Endgame/Positional/Time): "you" vs dashed "peers" + legend.
4. **Weakness profile** — category filter Segmented (All/Tactical/Opening/Endgame/Positional) → 2×2 **WeaknessCategoryCard** grid (header: icon, category, phase accuracy, severity badge + 2–3 sub-weakness rows). Weakest category border-tints `--error`.
5. **Recommended study plan (1.4fr)** — ordered **StudyPlanRow** list (icon by type, title, description, est. time, status Next/Queued); first item highlighted as the next action.
6. **Milestones (1fr)** — **MilestoneTimeline** (achieved ✓ green · in-progress accent + % · future hollow). *(Reuse the dashboard roadmap timeline pattern.)*

One Primary action per view = "Continue/Start session" on the Weekly Focus (§9 action hierarchy). Mobile: weekly focus first, categories → horizontal filter chips, category cards stack, study plan as cards (§9 responsive).

---

## Milestones / work items

### M1 — Charts + scaffold
- [ ] `RadarChart` (`components/charts`) — 5–6 axes, concentric rings, "you" polygon + dashed "peers", ≥66px label margin (§6), `role="img"` + aria-label.
- [ ] `ImprovePage` scaffold + `/improve` route behind `ui.screen.improve` (placeholder when off).
- [ ] Reuse `FocusCard` hero from dashboard as the Weekly Focus.

### M2 — Weakness profile
- [ ] `WeaknessCategoryCard` (icon, category, phase accuracy, severity badge, sub-weakness rows; error tint for weakest).
- [ ] Category filter `SegmentedControl` (All/Tactical/Opening/Endgame/Positional).
- [ ] Data: derive from existing `lib/weaknessProfile.ts` + typed sample where missing.

### M3 — Study plan + milestones
- [ ] `StudyPlanRow` (type icon, title, description, est. minutes, Next/Queued); first highlighted.
- [ ] `MilestoneTimeline` (reuse dashboard roadmap pattern; achieved/in-progress/future).
- [ ] Curated **learning-objectives catalog** (`lib/learning`, Architecture §12) keyed by `weakness.key` → objective + session types + position set (sample/curated, not generated).

### M4 — Insight→action loop + states/responsive/a11y
- [ ] Plan composition: highest rating-impact weakness → Weekly Focus → ordered sessions; **consume the Phase-5 Send-to-Improve queue** (localStorage `cm.improveQueue`) into the plan.
- [ ] "Start session" Primary routes into training (stub/sample); one Primary per view.
- [ ] All four states (loading/empty "Analyze games to build your plan"/error+retry/success); mobile chips + stacks; a11y + axe; route focus.

### M5 — Visual review gate → PR
- [ ] Screenshots (desktop/tablet/mobile + states), UX rationale; **STOP for approval**; then full gate + tests + CodeRabbit loop. No merge.

---

## Dependencies
- Phase 1 tokens · Phase 2 primitives (`Card` hero, `SegmentedControl`, `Badge`, `ProgressBar`, `MetricCard`, `Button`, `Skeleton`, `EmptyState`, `ErrorState`) · Phase 3 shell/routing/flags · Phase 4 `FocusCard`/timeline patterns + chart conventions · Phase 5 `Send-to-Improve` queue + `lib/analysis` + `lib/weaknessProfile`.

## Risks
| Risk | Mitigation |
|---|---|
| Plan composition logic is the differentiator and must be trustworthy | Curated objectives catalog (not LLM-generated); pure, unit-tested composition over ranked weaknesses. |
| Sample/derived data masking integration gaps | Hooks shaped to real API; swap is one adapter (Phase 11). |
| Card-zoo / density on a section-heavy screen | Strict §9 hierarchy, one Primary, generous spacing, visual review gate. |
| RadarChart label clipping / a11y | Guarantee label margins (§6); `role="img"` + summary aria-label; never color-only. |

## Acceptance criteria (§9 + DoD §15/§25)
- Matches §9 layout/hierarchy; "what to work on next" answerable at a glance; each weakness → concrete training action; exactly one Primary.
- Send-to-Improve items from Analysis appear in the plan.
- All four states; mobile chips + stacks; keyboard + visible focus; AA contrast; charts labelled; reduced-motion; axe clean (component + e2e, wired into CI).
- typecheck/lint/tests/build green; behind `ui.screen.improve`; legacy untouched.

## Testing strategy
- Unit: plan composition / weakness→objective mapping; severity ranking; Send-to-Improve queue ingestion.
- Component: RadarChart aria-label; category filter; study-plan order; states.
- E2E a11y: `/improve` structural axe + contrast + route focus; wire into CI `accessibility` job.

## Out of scope (Phase 6)
Real training/drill execution engine, server-side plan generation, real `improvement_plans`/`training_sessions` tables (Phase 11). Weakness Profile + Progress *standalone screens* are Phase 9 (Improve shows the summary/entry points per §3 "sub-views within Improve").
