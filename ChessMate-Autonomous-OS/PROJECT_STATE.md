# Project State

_Last updated: 2026-06-20 · Snapshot by Autonomous Engineering System_

## Operating Mode
**Product-to-Production** (per `PRODUCT_ACCEPTANCE_CRITERIA.md`): drive to Production Score ≥85,
every required section complete, all CI green, AA contrast, no Critical/High bugs, no unresolved
VALID review comments. Do not stop at sprint boundaries.

## Production Score: **~80 / 100** (70 → 73 → 75 → 78 → 79 RLS → 80 Product Quality)

## Latest loop — Product Quality audit (PR #13, stacked on #12)
**Acceptance "Product Quality" section addressed.** Audit found the app mature (toggles consumed,
empty/loading states present, no dead buttons beyond the already-fixed pricing CTAs). Fixed the one
systemic gap — **error & validation UX**: `noValidate` on all 3 auth forms (consistent styled custom
validation), `Input` primitive now `aria-invalid`/`aria-describedby`/`role="alert"`, error messages →
`--cm-error-bright` (AA) + announced, auth accent links → `--cm-accent-bright`. Auth error state
axe-clean; e2e 29/0/13 (new validation regression test).

## Latest loop — RLS/auth integration tests (PR #12, stacked on #11)
**Closes AUD-27; satisfies Security "RLS verified" + Testing "Integration tests pass."**
Real DB-level test via **PGlite** (in-process Postgres WASM — no Docker/Supabase/cost): applies the
actual migrations under a Supabase-auth shim and asserts cross-user isolation, WITH CHECK, and the
stats trigger. `npm test` → **83 passed** (7 new). Security 84→87, Testing 80→87, DB 78→82.

## Completed loop — Accessibility & Test-Gate (PR #11, **all CI green incl. e2e**)
**Closes AUD-21/22/23.** Verified green in CI on commit `4ef2468`.
- WCAG **AA contrast** passes — axe **0 violations** in both default (`:root`) and explicit-dark.
  Brand-preserving tokens: `--cm-accent-strong` (button fill), `--cm-error-bright` (error chips),
  accent-text → `--cm-accent-bright`, `:root` inverse fix; **disabled dead "coming soon" pricing CTAs**.
- **e2e gate restored AND made trustworthy** by fixing two real root causes (not just the symptoms):
  1. The job started `npm run dev` manually **and** Playwright's `webServer` did too →
     port-5173 conflict erroring the job before any test ran (the true reason `main` was red 5+ merges).
  2. The a11y specs `goto('/')` then `.count()` immediately, racing React's mount → flaky zero-button
     failures. Added a `beforeEach` render-gate.
- **CI: Lint ✅ · Type-check & Build ✅ · Unit ✅ · E2E ✅ (1m44s) · CodeRabbit ✅** (11 doc findings
  triaged; 8 VALID fixed).

## Phase 2 — Sprint 1 (Production Safety & Trust): in PR #10, review fixes applied.
All 8 items + CodeRabbit fixes landed on `sprint-1/production-safety-and-trust` (rebased onto
`origin/main`). **MERGE_READY pending** human approval/merge. CodeRabbit check passed.

### Mid-sprint discoveries (handled)
- **Deploy target is Netlify, not Vercel.** `vercel.json` headers were dead config — the live
  preview had no CSP. Added `public/_headers`; CSP/HSTS/X-Frame-Options/Referrer/Permissions now
  **verified live** on the deploy preview (`curl -I`) with the app still loading. AUD-02 now effective.
- **`main` CI has been red for 5+ consecutive merges** — the e2e job's 2 failures (AUD-21 contrast,
  AUD-22 stale smoke test) pre-exist on `main`. This PR introduces no e2e regression, but the e2e
  gate is currently untrustworthy → restore in Sprint 2 (AUD-22 cheap, AUD-21 = v2 a11y).
- **CodeRabbit findings (2):** GitHub Actions unpinned → pinned all to verified v4 SHAs +
  `persist-credentials: false`. Both resolved; CodeRabbit check passed.

## Sprint-1 Gate Results (2026-06-20)
| Gate | Result |
|---|---|
| typecheck | ✅ clean |
| lint | ✅ 0 errors (5 pre-existing fast-refresh warnings, none added) |
| unit + coverage | ✅ 87/87 pass (5 new edge-function security tests) |
| build | ✅ success (89 KB gzip main, unchanged) |
| e2e (chromium) | ⚠️ 26 pass / 2 **pre-existing** fail / 13 skip — failures (AUD-21 landing contrast, AUD-22 stale smoke test) are untouched by this PR |

## Branch / Repo State (2026-06-20)
- Remote: `github.com/Arjav1512/ChessMate-Tool`.
- **Open PRs:**
  - **#10** `sprint-1/production-safety-and-trust` → `main` — security/CI/docs. CI green
    (lint/build/unit/CodeRabbit); pending human merge.
  - **#11** `prod/accessibility-aa-and-test-gate` → `main` (stacked on #10) — AA contrast +
    e2e-gate fix. **All CI green incl. e2e**; CodeRabbit VALID comments resolved.
- Working branch: `prod/accessibility-aa-and-test-gate`.
- The v2 redesign (`v2/phase-2-analysis-workspace`) remains a parallel track per E-1.

## Architecture Snapshot
- React 18 + TS 5.5 (strict), Vite 5 + PWA, Tailwind 3 + CSS-var token system.
- Supabase: Postgres (RLS on all user tables), Auth (email + Google/GitHub OAuth +
  password reset), one Deno Edge Function (`chess-mentor`, Gemini proxy).
- Stockfish.js in a Web Worker (UCI); PGN parsing in a dedicated worker.
- Sentry optional (behind `VITE_SENTRY_DSN`).
- 7 SQL migrations; stats maintained by a `SECURITY DEFINER` trigger reading
  `games.user_color`.

## Escalations — RESOLVED (2026-06-20)
- **E-1 → PARALLEL:** Sprint-1 security/CI hardening proceeded on the current base; v2 redesign
  continues as a separate track.
- **E-2 → DEFER:** v1 stays stats + AI coach; revisit learning depth later.
- _R-1..R-4 from the Phase-1 audit are all resolved_ (JWT verified, CSP/HSTS live, lint+RLS in CI, `CONTEXT.md` authored).

## Next Objective
Open PRs are all CI-green (#10–#13) — **pending human merge** (sequence #10 → #11 → #12 → #13).
Remaining autonomous levers to ≥85: UI consolidation (visual, low autonomous confidence), AI-coach
depth, mobile/deploy polish. User-gated: PR merges, Sentry DSN (Monitoring). See
`PRODUCTION_SCORECARD.md` "Remaining path to 85".
