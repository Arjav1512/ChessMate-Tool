# Phase S1 — Production Stabilization Implementation Plan

> Inputs: `PRODUCTION_STABILIZATION_AUDIT.md`, `RELEASE_READINESS_REPORT.md`, `REAL_DATA_INTEGRATION_AUDIT.md`.
> **Plan only — no code, no branch, no PR.** Constraints honored: no redesign, no new features, no architecture refactor, no business-logic changes.
> **Base for all PRs:** `prod/mistake-review-b4` (current production-default). Each PR is **independently reviewable and mergeable**.
>
> **Approved modifications (applied):**
> 1. **PR2 ships first** (placeholder + nav).
> 2. **Do not redirect** `/weaknesses` & `/progress` — hide them from navigation and show a **branded "Coming soon"** (they stay reachable only by direct URL). PR3's orphan handling is therefore "hide + brand," not "redirect."
> 3. **PR4 is split** into **PR4a — Dashboard polish** and **PR4b — remaining-screen polish**, for easier visual review.
> 4. **Visual QA + accessibility check are required before EVERY merge** (not just at the end).
> **Out of scope here (separate track):** real-data wiring of Improve/Dashboard/Review-Mistakes (audit S1.3 = Phase 8B steps 5–7) and the `main` canary default (S1.5) — these are data/release tasks, not part of the four presentation PRs requested.

---

## PR1 — Landing experience & public/authenticated flow

**Goal:** the public face matches the Ivory brand; the public→auth→app flow is clean and intentional. **Re-theme only — no redesign, no copy/feature change.**

**Changes**
- Re-skin the existing marketing landing from legacy `--cm-*` (indigo) to **Ivory tokens** (`--bg`, `--accent #EBD9B8`, type scale) — a **token/color swap**, preserving structure, sections, and copy.
- Verify the `App.tsx` gate reads intentionally: `!user` → Landing/Auth; authed (+`ui.newShell`) → app → `/dashboard`. (Flow already correct — this is verification + any token-consistency fix on `AuthForm`.)

**Files affected**
- `src/components/marketing/LandingPage.tsx` (+ its styles)
- `src/components/auth/AuthForm.tsx` (token consistency only, if needed)
- `src/App.tsx` (verify gate; no logic change expected)

**Dependencies:** none.

**Risks**
- Re-theming a large legacy component (94 `--cm-*` refs) could regress its layout. → token/color substitution only; no structural edits; before/after visual diff at 1440/768/390.
- Decision point: re-theme vs. keep legacy as-is. (Audit recommends re-theme for brand consistency.)

**Rollback:** revert the single PR; landing returns to legacy styling (fully functional). No data/flow impact.

**Acceptance criteria**
- Landing uses Ivory tokens (no indigo accent); structure/copy unchanged.
- `/` unauthenticated → Ivory-styled landing; "Get started/Sign in" → auth; authed → `/dashboard`.
- No `--cm-*` color regressions visible; AA contrast holds.

**Testing checklist**
- typecheck · lint · build green.
- Manual: `/` (logged-out) at 1440/768/390; landing→auth→(mock) login→dashboard.
- a11y: landing axe (existing `e2e/accessibility.spec.ts`) green; contrast clean.
- Visual diff vs legacy (structure identical, palette Ivory).

---

## PR2 — Placeholder cleanup & hide unfinished navigation

**Goal:** nothing dev-flavored is user-visible; no primary destination dead-ends.

**Changes**
- **Production-ize `PlaceholderPage`:** remove "This screen is a shell placeholder", the route path, and the "Phase N" badge; render a branded, friendly "Coming soon" (title + one-line value + a Back/Dashboard action). Keep it for any still-unbuilt route.
- **Hide unbuilt destinations from navigation** until shipped: drop **Coach** from the primary sidebar list; drop **Settings/Profile** from the user menu (or keep with the branded coming-soon — see risk). Ensure ⌘K / mobile bar don't surface unbuilt screens.

**Files affected**
- `src/app/PlaceholderPage.tsx`
- `src/app/navigation.ts` (gate/annotate unbuilt destinations)
- `src/components/nav/Sidebar.tsx`, `src/components/nav/UserMenu.tsx`, `src/components/nav/BottomTabBar.tsx`, `src/components/nav/CommandMenu.tsx` (filter unbuilt)
- `src/components/nav/nav.test.tsx` (update Profile/Settings href assertions)

**Dependencies:** none (PR3 builds on this for verification).

**Risks**
- **IA deviation (§3):** Coach is a *primary* nav destination in the spec. Hiding it is a temporary stabilization choice until Phase 8. → keep the `/coach` route + flag intact (just unlisted), document as temporary; reversible by re-listing.
- Removing Settings/Profile from the menu removes the (placeholder) account entry. → acceptable since they're non-functional; revisit in Phase 10.
- Tests assert current nav items → update `nav.test.tsx`.

**Rollback:** revert PR; nav + placeholders return to current behavior. Routes/flags untouched, so no breakage.

**Acceptance criteria**
- No user-visible "shell placeholder"/route/phase text anywhere.
- Sidebar shows only built primary destinations (no Coach dead-end); user menu shows no unbuilt placeholder entries; ⌘K/bottom-bar surface only built screens.
- Direct-URL visits to unbuilt routes show the branded coming-soon (not the dev placeholder).

**Testing checklist**
- typecheck · lint · unit (updated `nav.test`) · build.
- Manual: sidebar, user menu, ⌘K, bottom bar — confirm no unbuilt entries; visit `/coach` directly → branded coming-soon.
- a11y: shell + (branded) placeholder axe clean; route focus → h1.

---

## PR3 — Routing cleanup, orphan routes, navigation & deep-link verification

**Goal:** no dead-ends; every route is reachable or shows a branded "Coming soon"; deep links and redirects are correct.

**Changes**
- Orphan routes `/weaknesses`, `/progress`: **hide from navigation (done in PR2) and keep a branded "Coming soon"** on direct URL — **not redirected** (per approval). Verify they render the branded page and are absent from all nav surfaces.
- Verify route table: `/`→`/dashboard`, `*`→`/dashboard`, `/games/:id`→`/analysis/:id`, `/analysis`→`/analysis/sample`, `/improve` index + `/improve/mistakes`.
- Verify deep links (open a game → Analysis at the right id) and that no UI links target removed/placeholder routes.

**Files affected**
- `src/app/AppRouter.tsx` (orphan redirects; route-table verification)
- (verification across) `src/features/*` link targets; no UI redesign

**Dependencies:** soft — best after **PR2** (so nav/placeholder decisions are settled); otherwise independent.

**Risks**
- Redirecting `/weaknesses`/`/progress` could surprise a future deep link. → low; they're unreachable today; redirect is reversible.
- Ensure no test asserts a placeholder render for these routes (update if so).

**Rollback:** revert PR; routes return to placeholders. No data impact.

**Acceptance criteria**
- No orphan routes: every route is reachable via UI or intentionally redirected.
- All listed routes resolve correctly; `*` and `/` redirects intact; `/games/:id`→Analysis works.
- No UI link points to a removed/placeholder destination.

**Testing checklist**
- typecheck · lint · unit · build.
- Manual: visit each route in §1 of the audit; click every nav/affordance; confirm deep link `/games/:id`→`/analysis/:id`.
- a11y e2e suite (30/30) green (routes still resolve).

---

## PR4 — UI polish (spacing, alignment, responsive, design-system consistency)

**Goal:** close the Minor visual items from the audit/VISUAL_QA. **CSS-only; no component/layout redesign.**

**Changes**
- Dashboard: tighten vertical balance on wide/tall viewports (composition/spacing).
- Games: table content uses available width @1440 (no left-pack).
- Improve: radar size on tablet single-column; lighten study-goals tail density.
- Analysis: minor eval-timeline start-state spacing (optional).
- Sweep token usage for any stray hard-coded values on in-app screens.

**Files affected**
- `src/features/dashboard/dashboard.css`
- `src/features/games/games.css`
- `src/features/improve/improve.css`
- `src/features/analysis/analysis.css`

**Dependencies:** none (independent; ideally last so it polishes the settled layouts).

**Risks**
- Spacing changes could shift a11y contrast/focus or responsive breakpoints. → CSS-only; re-run full axe e2e + responsive sweep; contrast unaffected by spacing.

**Rollback:** revert PR; layouts return to current (already-acceptable) spacing.

**Acceptance criteria**
- Dashboard reads intentional (not sparse) at 1440/1920; Games table uses width; Improve radar consistent on tablet; no overflow/clipping at any breakpoint.
- All values token-bound; no new hard-coded colors/spacing.

**Testing checklist**
- typecheck · lint · build.
- Visual sweep at 1440/1280/1024/820/768/430/390 (before/after).
- Full a11y e2e (30/30) green; contrast clean.

---

## Cross-PR summary

| PR | Theme | Effort | Risk | Files (primary) |
|---|---|---|---|---|
| PR1 | Landing → Ivory + flow verify | S–M | Med (re-theme legacy) | LandingPage, AuthForm, App.tsx |
| PR2 | Placeholder + hide nav | S | Med (IA: hide Coach) | PlaceholderPage, navigation.ts, nav/*, nav.test |
| PR3 | Routing/orphans + verification | S | Low | AppRouter.tsx |
| PR4 | UI polish | S | Low | dashboard/games/improve/analysis .css |

**Shared rules (every PR):** preserve routing/flags/tokens/a11y/responsive; no new features; no business-logic change; each PR independently green (typecheck · lint · unit · build · a11y e2e) and opened against `prod/mistake-review-b4`; do not merge without review.

**Recommended sequence:** PR2 → PR3 (nav settled before route verification) → PR1 → PR4. Each can also stand alone.

**Explicitly deferred (not these PRs):** real-data wiring (Improve/Dashboard/Review-Mistakes), `main` canary default, manual SR pass, legacy `App.tsx` removal, Phase-11 data work.

*Plan only — no implementation, branch, or PR. Awaiting approval to begin (one PR at a time).*
