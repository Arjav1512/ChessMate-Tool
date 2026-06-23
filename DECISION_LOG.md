# ChessMate — Decision Log

> Durable engineering/product decisions for the Ivory redesign, with rationale and trade-offs. Newest first. Pairs with `IMPLEMENTATION_ROADMAP.md` and Architecture §24.

## D-008 · Command menu is top-anchored, not literally centered (Phase 3.5)
- **Decision:** keep the ⌘K palette anchored in the upper third (`padding-top:12vh`) rather than vertically centered.
- **Why:** the spec's stated design influences (Linear, Raycast, Arc) all top-anchor their command palettes; top-anchoring keeps results stable as the list grows and matches user muscle memory. The spec text says "centered overlay dialog" but the cited products are top-anchored.
- **Trade-off:** literal deviation from the word "centered". Flagged for designer sign-off; trivially reversible (one CSS line).

## D-007 · Avatar uses `role="img"` for the initials fallback (Phase 3.5)
- **Decision:** the avatar container carries `role="img" aria-label={name}`; inner image/initials are `aria-hidden`.
- **Why:** `aria-label` on a bare `<span>` is flagged by axe (`aria-prohibited-attr`); `role="img"` is the standard accessible-name pattern and passes.
- **Trade-off:** none.

## D-006 · Command menu uses the WAI-ARIA combobox focus-trap pattern (Phase 3.5)
- **Decision:** focus stays on the input; options are `tabIndex=-1` and addressed via `aria-activedescendant`; Tab/Shift+Tab loop back to the input.
- **Why:** satisfies §11 "dialogs trap focus" without making every option a tab stop; matches the established command-palette pattern.
- **Trade-off:** options aren't reachable by Tab (intended); arrow keys + click are the interaction model.

## D-005 · Navigation group labels use `--text-low`, not `--text-faint` (Phase 3.5)
- **Decision:** sidebar/command-menu group headers use `--text-low`.
- **Why:** `--text-faint` (#726B61) fails WCAG AA at 11px (~3.5:1); group labels are meaningful navigation headers, and §6 already maps "label" styling to `--text-low`. Placeholders keep `--text-faint` per §6 (and are excluded from the contrast gate).
- **Trade-off:** none; improves legibility.

## D-004 · Settings/Profile live in a user menu; Weakness/Progress are Improve sub-views (Phase 3.5)
- **Decision:** primary sidebar nav = Dashboard/Games/Analysis/Improve/Coach only. Settings + Profile → `UserMenu` pinned bottom. Weakness Profile + Progress → Improve sub-views. Import → route off Games.
- **Why:** §3 specifies a "user/profile menu pinned bottom of sidebar" and lists Weakness/Progress as "sub-views within Improve" and Import as "route off Games." The Phase 3 catch-all "Library" group violated this.
- **Trade-off:** these destinations are no longer one-click in the sidebar; all remain reachable via ⌘K and their parent screens.

## D-003 · Phase 3.5 PR targets `prod/mistake-review-b4`, not `main` (Phase 3.5)
- **Decision:** branch `feature/phase-3-5-shell-compliance` off the current tip; PR base = `prod/mistake-review-b4`. CI triggers broadened to `prod/**` + `feature/**`.
- **Why:** the new-shell work sits on top of `prod/mistake-review-b4` (50 commits ahead of main). Targeting that branch keeps the PR diff scoped to shell work; targeting main would drag in 50 unrelated B-series commits. "Do not modify main" is honored.
- **Trade-off:** CI's default `pull_request: [main]` filter had to be widened so the stacked PR runs.

## D-002 · New UI primitives live in `src/components/ui/iv/` (Phase 2)
- **Decision:** build the Ivory component library in a parallel `iv/` namespace; promote to canonical `components/ui` at cutover.
- **Why:** strangler coexistence — the legacy Obsidian primitives keep powering production until each screen migrates.
- **Trade-off:** temporary dual component sets; resolved at Phase 11.

## D-001 · Approved Phase-0 decisions (carried from roadmap "Locked decisions")
- Strangler migration behind flags; analysis stays **client-side** for v1 (server pipeline deferred); differentiator screens build on **typed sample/derived data**; hosting stays **Vercel** (documented deviation from Architecture §21 Netlify).

## D-010 · Dashboard reads as an improvement system, not analytics (Phase 4)
- **Decision (post visual-review refinement):** Improvement Score leads with a verdict + drivers + actionable next-step; Rating trend de-emphasized (smaller value, `subtle` chart) as an outcome companion; weakness cards add *why it matters* + *recommended action*; Improvement Roadmap elevated to hero treatment above Coach; subtle question captions map cards to the improvement narrative (how improving / what's holding me back / what next / what outcome).
- **Why:** §2 "improvement over analysis / insight over raw data"; reviewer flagged the first cut felt like a premium analytics dashboard. Refinement only — no redesign, no visual-language change, no new features.
- **Trade-off:** two hero cards now in view (Focus + Roadmap); accepted as action-anchor + outcome-anchor. Reversible.

## D-011 · Dashboard ships on typed sample/derived data (Phase 4)
- **Decision:** dashboard hooks resolve from `features/dashboard/sampleDashboard.ts`, shaped to the future API; Improvement Score is a real pure fn (Arch §13) fed sample inputs.
- **Why:** locked decision #3 — `rating_history`/plan/milestone tables don't exist yet. Swap to live reads is one adapter file (Phase 11).
- **Trade-off:** dashboard numbers are illustrative until the data layer lands; clearly labelled.

## D-012 · Analysis Workspace decisions (Phase 5)
- **Decisions (approved):** (1) Move List is a **persistent section**, not a peer tab; peer tabs are Analysis/Coach/Lines. (2) Move-quality taxonomy = `brilliant·best·good·inaccuracy·mistake·blunder`; legacy `excellent → best`. (3) **InsightCard** = one component with four variants (Turning Point / Blunder / Missed Opportunity / Recommendation). (4) Analysis **auto-runs on open** — board paints immediately, skeletons, progressive populate, no Analyze button. (5) **Send-to-Improve** queues to a typed sample/derived plan (localStorage) until the learning engine exists.
- **Why:** §8 (insight-first, Coach-as-peer, never reinvent the board) + reuse-first; keeps the default view from regressing into an engine viewer (engine confined to the Lines tab).
- **Trade-off:** analysis is sample/derived for v1 (real client-Stockfish runner + persisted analysis + `move_analysis` taxonomy migration deferred to Phase 11); board is display/stepping only.

## D-013 · Improve Hub decisions (Phase 6)
- **Decisions (approved):** (1) weakness category map `motif+recurring→Tactical · opening+color→Opening · phase:endgame→Endgame · phase:middlegame+positional→Positional`; (2) severity **High/Med/Low** badge, internal score stays 0–100; (3) skill-radar **Time** axis = sample/derived; (4) Improve **consumes** the Send-to-Improve queue (`cm.improveQueue`) into the study plan; (5) reuse Dashboard **patterns**, build Improve-owned components, do not refactor Dashboard.
- **Refinement:** milestones are **chess study goals** ("Convert 10 rook endgames", "Review 20 tactical misses", "Reduce opening inaccuracies 15%"), not generic productivity tasks — Improve must feel like a coach.
- **Why:** §9 insight→action; the differentiator must read as a chess improvement system, not an analytics dashboard.
- **Trade-off:** sample/derived for v1; real `weaknessProfile`/plan/milestone wiring + curated `lib/learning` catalog expansion deferred to Phase 11.

## D-014 · Mistake Review is an Improve sub-view, not a new screen (Phase 7 workstream)
- **Decision:** the System Design has **no standalone "Mistake Review" screen** (§3/§4); deliver it as **Improve → Review Mistakes** (`/improve/mistakes`, view switcher under `/improve`, same `ui.screen.improve` flag). Keep the roadmap intact — **roadmap Phase 7 = Game Library + Import** stays the next screen.
- **Decisions (Gate-0):** no standalone destination; Improve sub-view; sample/derived v1; taxonomy `excellent→best`; responsibility boundaries (Dashboard=overview · Analysis=understand games · Improve=weaknesses/plan/progress/review mistakes · Games=library/import).
- **Why:** §14.3 — never change the IA without approval. Mistake-review functionality is spec-distributed (Analysis §8 send-to-improve, Improve §9 `replay`, Weakness §4.7); a feed reusing the B-4 engine fits inside Improve.
- **Trade-off / guardrails:** **one source of truth** (`buildReviewFeed` = B-4 engine ∪ queue); **one Primary per mistake** ("Open in Analysis"); hands off to Analysis for deep study (never re-implements the board/engine). Live `useMistakeReview` swap deferred to Phase 11.
