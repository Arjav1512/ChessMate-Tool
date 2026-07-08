# Phase S — Production Stabilization Audit

> Authoritative inputs re-read: System Design, Architecture, PROJECT_STATE, IMPLEMENTATION_ROADMAP, DECISION_LOG, RELEASE_READINESS_REPORT, REAL_DATA_INTEGRATION_AUDIT, DESIGN_COMPLIANCE_AUDIT, DESIGN_SIMPLIFICATION_REVIEW, PHASE_8A_PRODUCT_SIMPLIFICATION_PLAN, VISUAL_QA_REPORT.
> **State audited:** `prod/mistake-review-b4` @ `253e0e6` (PR #33 / Phase 8B Analysis-real merged). **Read-only — no code changed.** Evidence: `/tmp/cmS/*` + prior `/tmp/cm8a1`, `/tmp/cmqa`.
> **Scope discipline:** identification only. No redesign, no new features, no refactor.

## Executive summary
The Ivory app is structurally sound, accessible (30/30 axe), and visually coherent **inside the authenticated shell**. The blockers to "production-ready" are **not architecture** — they are: (1) the **public landing is the legacy indigo design** (off-brand vs the Ivory app); (2) **placeholders are dev-flavored** ("shell placeholder · /route · Phase N") and one sits on a **primary nav item (Coach)**; (3) **Improve / Dashboard / Review Mistakes still render sample fixtures** (real users would see fake data); (4) two **orphan routes** (`/weaknesses`, `/progress`); (5) the cutover flag defaults **ON**, which would expose all of the above if promoted to `main`. None require redesign — they require gating, re-theming the landing to existing tokens, and finishing the real-data wiring that Phase 8B began.

---

## 1. Routing audit
| Route | State | Notes |
|---|---|---|
| `/` | ✅ redirect → `/dashboard` (in-shell); unauth → legacy Landing | works |
| `/dashboard` | ✅ implemented (flag `ui.screen.dashboard` ON) | real UI, **sample data** |
| `/games` | ✅ implemented (ON) | **real data** |
| `/games/import` | ✅ implemented (ON) | **real data** |
| `/games/:id` | ✅ implemented → redirects to `/analysis/:id` | works |
| `/analysis` | ✅ index → `/analysis/sample` (ON) | works |
| `/analysis/:id` | ✅ implemented (ON) | **real (Phase 8B)** for authed; sample for `sample`/unauth |
| `/improve` | ✅ implemented (ON) | real UI, **sample data** |
| `/improve/mistakes` | ✅ implemented (nested, ON) | real UI, **sample data** |
| `/coach` | ⚠️ **placeholder**, but **in primary sidebar nav** | dead-ends a primary destination |
| `/progress` | ⚠️ **placeholder + orphan** (no UI link, no ⌘K) | URL-only reachable |
| `/weaknesses` | ⚠️ **placeholder + orphan** (only link was in `BiggestWeaknessesCard`, removed in 8A) | URL-only reachable |
| `/settings` | ⚠️ **placeholder** (user menu) | account mgmt unavailable |
| `/profile` | ⚠️ **placeholder** (user menu) | account mgmt unavailable |
| `*` | ✅ redirect → `/dashboard` | works |
- **Broken:** none. **Duplicated:** none. **Unreachable (orphan):** `/weaknesses`, `/progress`. **Placeholder:** coach/progress/weaknesses/settings/profile.

## 2. Landing page audit
- Main URL `/` (unauthenticated) loads `components/marketing/LandingPage` — a **complete, polished marketing page**, but **legacy-styled (94 `--cm-*` refs, indigo/purple accent)** — visually inconsistent with the Ivory (`#EBD9B8`) app behind auth.
- **No Ivory landing exists** → "Ivory landing implementation complete" = **NO**.
- Auth flow (`App.tsx`): `!user` → Landing/`AuthForm`; `passwordRecovery` → reset; authed + `ui.newShell` → `AppRouter` → `/dashboard`. **Flow is correct.** Routing after login → `/dashboard` ✅.
- **Issue preventing the intended experience:** the public face is off-brand (legacy design), and the landing's pricing tiles read "Coming soon" (2 of 3).

## 3. Navigation audit
- **Sidebar (desktop):** Dashboard · Games · Analysis · Improve · **Coach** — Coach (primary) → placeholder (dead-end).
- **Header (mobile top bar):** brand · ⌘K · account — OK.
- **Bottom tab bar (mobile):** Home/Games/Analysis/Improve — OK (Coach correctly excluded from mobile).
- **User menu:** Profile · Settings → both placeholders.
- **Breadcrumbs:** none (not in design — OK). **Back nav / deep links:** routed SPA, deep links work; `/games/:id`→Analysis redirect works.
- **Dead links:** none live (the `/weaknesses` link lives in `BiggestWeaknessesCard`, which 8A removed from the page → not rendered). **Placeholder destinations:** Coach (primary), Settings/Profile (menu). **Inconsistent:** Coach occupies a primary slot but isn't built.

## 4. Placeholder audit
All render the **same dev-flavored `PlaceholderPage`**: title + purpose + "This screen is a shell placeholder" + the route path + a "Phase N" badge — **not production-appropriate** for end users.
| Placeholder | Reachable via | Classification |
|---|---|---|
| Coach (primary nav) | sidebar | **should be hidden until implemented** (or ship a real "coming soon") |
| Settings, Profile | user menu | **should be hidden or given a minimal real screen** (account mgmt) |
| Progress, Weaknesses | URL only (orphan) | **acceptable temporary** (hide from any future entry; harmless today) |
| `/analysis/sample`, DEV `?shell`, sample data fallbacks | dev/demo | **acceptable temporary** (DEV-gated; not prod) |
- The placeholder **component itself** should be de-dev-ified for production (drop "shell placeholder"/route/phase; show a branded "coming soon") — Major.

## 5. UI/UX audit (per implemented screen)
- **Dashboard:** hierarchy strong (8A.1 momentum + Focus hero + plan rail); one primary. *Issue:* generous **vertical whitespace** below the hero on tall/wide viewports (intentional but reads sparse). Empty/loading/error: handled (onboarding empty state, skeletons). **Data: sample.**
- **Games:** table-led finder, status badges, filters; states handled (empty/error/skeleton/no-match). *Minor:* table content packs left at 1440. **Data: real.**
- **Import:** source picker + preview + progress + recoverable/partial/duplicate/invalid states; one recommended next action. Solid. **Data: real.**
- **Analysis:** board hero + insight-led (8A/8A.1); accuracy now **collapses gracefully** (8A.1) instead of empty boxes; eval-timeline sparse only at the start position. **Data: real (8B) for authed.**
- **Improve:** Focus hero dominant, radar quieter, plan+goals stacked (8A). *Minor:* radar enlarges on tablet single-column; study-goals tail dense. **Data: sample.**
- **Review Mistakes:** master/detail, one primary; clean. **Data: sample.**
- **Tokens/consistency:** in-app screens use Ivory tokens consistently; **landing is the inconsistency** (legacy tokens).

## 6. Design system audit
- **Primitives/cards/buttons/segmented/badges/inputs/states:** consistent Ivory usage across in-app screens (Phase 1–2 system). One-primary discipline holds (8A).
- **Spacing scale / typography / radii / elevation / colors / motion:** token-bound; reduced-motion honored. 6 pre-existing lint warnings (non-blocking).
- **Inconsistencies:** (a) the **legacy LandingPage** (`--cm-*`, indigo) vs Ivory tokens; (b) the **dev PlaceholderPage** style (mono route, phase badge) is not part of the production design language.

## 7. Responsive audit
Verified 1440 / 1280 / 1024 / 820 / 768 / 430 / 390 (captures in `/tmp/cmS`, `/tmp/cm8a1`, `/tmp/cmqa`).
| Width | Result |
|---|---|
| 1440 | OK; Dashboard/Improve slightly empty below; Games table packs left |
| 1280 | OK (cutover laptop density) |
| 1024 | OK; Improve/Dashboard two-col → single where defined |
| 820 / 768 | OK; sidebar→icon rail; Improve radar enlarges (single col); Games table fits |
| 430 / 390 | OK; card lists + bottom tab bar; fixed bar overlays full-page captures (expected, not a bug) |
- **No horizontal overflow / clipping** found at any breakpoint. Issues are spacing/proportion polish (S2), not breakage.

## 8. End-to-end user flow audit
`Landing → Auth → Dashboard → Games → Import → Analysis → Improve → Review Mistakes → Dashboard`
| Hop | Status |
|---|---|
| Landing → Auth | ✅ (legacy-styled landing) |
| Auth → Dashboard | ✅ |
| Dashboard → Games | ✅ ("Continue improving"→Improve; Games via nav) |
| Games → Import | ✅ (real) |
| Import → Games | ✅ (real; success → one next action) |
| Games → Analysis (open game) | ✅ real game loads; **engine runs/persists (8B) — authenticated path unverified in sandbox** |
| Analysis → Improve (Send to Improve) | ✅ queue write real |
| Improve / Dashboard / Review Mistakes | ⚠️ **render sample data** — the loop's downstream shows fixtures, not the user's real analysis |
- **Breaks:** the *data continuity* breaks after Analysis — Improve/Dashboard/Review-Mistakes don't reflect the real game just analyzed (sample). Navigation is unbroken; **data truth is the break.**

## 9. Production blockers (ranked)
**🔴 Critical**
- C1 **Placeholders are dev-flavored & shown to users** (Coach primary nav; Settings/Profile menu) — "shell placeholder · /route · Phase N" is not shippable.
- C2 **Coach occupies a primary sidebar slot but dead-ends** — hide it or ship a branded "coming soon."
- C3 **Improve / Dashboard / Review Mistakes render sample data** — real users see fabricated content (RELEASE_READINESS B2/B3/B4; REAL_DATA audit).
- C4 **Landing is legacy-styled** — the public/brand face contradicts the Ivory app.
- C5 **Cutover flag default-ON** — promoting to `main` exposes C1–C4 to production; needs canary default.

**🟠 Major**
- M1 `/weaknesses` & `/progress` orphan placeholder routes (URL-only).
- M2 Authenticated Analysis engine→persist path **unverified** (8B) — verify before `main`.
- M3 Settings/Profile unavailable (account management) — minimal real screen or hide.
- M4 PlaceholderPage leaks internal info (route path, phase number) to users.

**🟡 Minor**
- m1 Dashboard vertical whitespace (wide/tall). m2 Games table packs left @1440. m3 Improve radar enlarges on tablet. m4 Study-goals tail density. m5 Eval-timeline sparse at start.

**Polish**
- p1 Landing pricing "Coming soon" tiles. p2 Manual screen-reader pass. p3 6 lint warnings.

## 10. Stabilization backlog (no implementation — prioritized)

### Phase S1 — Critical fixes
| Task | Effort | Files | Dependencies | Impact |
|---|---|---|---|---|
| S1.1 Production-ize `PlaceholderPage` (branded "coming soon"; drop route/phase/"shell placeholder") | S | `src/app/PlaceholderPage.tsx` | — | Removes dev leakage on every unbuilt screen |
| S1.2 Hide unbuilt destinations from nav until shipped (Coach from sidebar; Settings/Profile from menu OR keep with branded placeholder) | S | `src/app/navigation.ts`, `src/components/nav/{Sidebar,UserMenu}.tsx` | S1.1 | No dead-end primary nav |
| S1.3 Wire Improve → `useWeaknessProfile`, Review Mistakes → `useMistakeReview`, Dashboard → real aggregates (finish Phase 8B 5–7) | M | `src/features/improve/hooks.ts`, `…/mistakes/useReviewMistakes.ts`, `src/features/dashboard/hooks.ts` (+ small mappers) | hooks exist | Real data across the loop (truthful product) |
| S1.4 Verify authenticated Analysis run→persist (8B) | S (verify) | — | signed-in env | Confirms the keystone works in prod |
| S1.5 Set `main` cutover default to canary (flag default OFF for production cohort) | S | `src/lib/flags.ts` | S1.1–S1.4 | Safe promotion |
| S1.6 Resolve orphan routes: add an Improve→/weaknesses entry, or hide/redirect `/weaknesses`,`/progress` | S | `src/features/improve/*`, `src/app/AppRouter.tsx` | S1.1 | No URL-only orphans |

### Phase S2 — UI polish
| Task | Effort | Files | Impact |
|---|---|---|---|
| S2.1 Dashboard vertical balance on wide/tall (composition/spacing only) | S | `src/features/dashboard/dashboard.css` | premium feel |
| S2.2 Games table width usage @1440 | S | `src/features/games/games.css` | polish |
| S2.3 Improve radar size on tablet single-col; study-goals density | S | `src/features/improve/improve.css` | consistency |
| S2.4 Re-theme **Landing** to Ivory tokens (no redesign — token/color swap) | S–M | `src/components/marketing/LandingPage.tsx` (+ its CSS) | on-brand public face |

### Phase S3 — Production readiness
| Task | Effort | Files | Impact |
|---|---|---|---|
| S3.1 Manual screen-reader pass on all screens | M | — | a11y assurance |
| S3.2 Audit empty/loading/error coverage on the now-real hooks (S1.3) | S | feature hooks | robustness |
| S3.3 Clear the 6 lint warnings | S | various | hygiene |
| S3.4 Post-promotion: legacy `App.tsx`/components removal plan (after canary→100%) | M | `src/App.tsx`, legacy `components/*` | dead-code removal (defer to Phase 11 cutover cleanup) |
| S3.5 Perf check: client Stockfish run on open (large games) | S | `src/features/analysis/hooks.ts` | UX under load |
| Deferred (Phase 11, not stabilization) | — | — | persisted columns, Connect, server pipeline, rating-history source |

---

## Recommendation
Two S1 clusters make the app genuinely production-presentable without redesign or new features: **(A) gate/clean the placeholders + nav (S1.1, S1.2, S1.6, S1.4) and re-theme the landing (S2.4)** — so nothing dev-flavored or off-brand is user-visible; and **(B) finish the real-data wiring (S1.3)** — so the shipped screens are truthful. Then set the `main` canary default (S1.5) and promote. Everything else is polish/hardening.

*Audit only — no code, branch, or PR. Awaiting approval before any change.*
