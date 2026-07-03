# RELEASE_BLOCKERS.md

**Mode:** Ground Truth. **Date:** 2026-06-26. **Branch:** `feature/stabilization-pr1-landing`.
**Question:** what prevents this from being production-ready today? Ranked by severity.

The app *builds, typechecks, and renders every route without errors.* It is not
broken. It is **not trustworthy** — the headline screen shows fabricated data, and
the real product lives off `main`. Those are the blockers.

---

## CRITICAL — must fix before any public release

| ID | Blocker | Evidence | Why it blocks |
|---|---|---|---|
| C1 | **Dashboard shows fabricated data to authenticated users.** Every tile (improvement score, weekly focus, streak, rating history, weaknesses, recent games, roadmap) is a hardcoded sample. | `features/dashboard/hooks.ts` — all 8 hooks `queryFn: sample(...)`, zero Supabase calls. | The home screen lies. A user who imports/analyzes real games still sees "Week 7 · 84% · 5d streak." Core promise ("track improvement") is unbacked. |
| C2 | **`main` does not contain the product.** | `main` HEAD = PR #5 legacy; trunk is 123 commits ahead on a feature branch. | No production trunk; CI/deploy from `main` would ship the old legacy app. Releasing requires reconciling `main` first. |

## HIGH — fix before calling it "v1"

| ID | Blocker | Evidence | Impact |
|---|---|---|---|
| H1 | **Improve weaknesses/plan are sample, not the user's games.** | `features/improve/hooks.ts` uses `sampleRawWeaknesses`; only the Send-to-Improve queue carries real signal. | "Personalised plan" is generic. The real `weaknessProfile` logic exists (legacy) but isn't wired. |
| H2 | **Settings & Profile are unreachable.** Routes are Coming-Soon placeholders; nav hides them; user menu has only "Sign out". | `navigation.ts` `built:false`; verified in browser. | User cannot manage account, connected platforms, analysis depth, or appearance/theme. The Ivory theming system is dormant as a result. |
| H3 | **AI Coach is advertised but unbuilt.** Landing hero + FAQ + pricing tout the Gemini coach ("10 AI coach queries/day"); `/coach` is a placeholder. | `LandingPage.tsx` copy vs `flag ui.screen.coach` OFF, `built:false`. | Expectation gap / borderline false advertising. Either build it or soften the copy. |
| H4 | **Test + build verification not on record for the trunk.** | This audit didn't run `npm test` / `test:e2e` / `build`. | Cannot certify green. Must run all three and record before release. |

## MEDIUM — quality / maintainability, not user-blocking

| ID | Blocker | Evidence |
|---|---|---|
| M1 | Two design-token systems + two UI-primitive libraries + two toast systems live at once. | DESIGN_SYSTEM_AUDIT. Cutover (Phase 11) pending. |
| M2 | Landing page is legacy-token + inline styles, mislabeled "Ivory." Will need re-theming at cutover. | DESIGN_SYSTEM_AUDIT §2. |
| M3 | Rollback path (`?ff=-ui.newShell`) exposes a visually different legacy app. | App.tsx:147. Fine as a kill-switch, not as a user feature. |
| M4 | ~30 branches, ~45 root planning docs — operational drag, unclear source of truth. | GSTACK_BRANCH_AUDIT, TECH_DEBT §5–6. |
| M5 | Stockfish depth hardcoded (15) with no user control in the Ivory path. | `features/analysis/hooks.ts` `runAndPersist`. |

## LOW — cosmetic / config

| ID | Item | Evidence |
|---|---|---|
| L1 | Sentry DSN not configured → "Error monitoring disabled" warning. | Console at runtime. Set DSN in prod env. |
| L2 | `baseline-browser-mapping` data >2 months old (Vite warning). | Dev log. |
| L3 | Dashboard desktop layout is bottom-heavy/empty — reads unfinished. | UI_UX_AUDIT §3. |
| L4 | `/games/:id` ⇒ `/analysis/:id` redirect may confuse deep-links/back-button. | AppRouter.tsx:46. |

---

## Verdict

**Not production-ready today.** Two things make it shippable:
1. **C1** — wire Dashboard (and ideally Improve, H1) to the real aggregates that
   already exist for the legacy screens. This is the difference between a demo and
   a product.
2. **C2** — reconcile `main` so there is a real trunk to deploy.

Everything else (H2–H4) is "good v1 hygiene"; M/L are post-launch cleanup. The
encouraging part: the hard plumbing (auth, import, Stockfish analysis +
persistence, the whole shell) is real and works. The gap is the feedback half of
the loop, not the foundation.
