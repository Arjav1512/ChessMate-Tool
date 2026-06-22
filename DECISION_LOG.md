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
