# Loop Log

Objective -> Hypothesis -> Change -> Verify -> Result -> Next Loop

---

## 2026-06-20 · Product-to-Production · Loop A — Accessibility & Test-Gate
- **Objective:** satisfy the Accessibility acceptance criterion (AA contrast) and restore the
  e2e/CI-green requirement. Highest leverage: AUD-21 contrast is the same root cause as the red e2e.
- **Hypothesis:** AA can be met by shade-tuning that preserves the indigo brand (engineering, not a
  product-direction change), so it proceeds autonomously (confidence ≥80%).
- **Change:** measured 9 axe nodes precisely → added `--cm-accent-strong` (AA button fill),
  `--cm-error-bright` (error chips), routed accent-text to `--cm-accent-bright`, fixed `:root`
  inverse to `#FFFFFF`, **disabled dead "coming soon" pricing CTAs**, updated the stale landing
  e2e smoke test. Verified the REAL default (`:root`) state, not just the test's forced-dark state.
- **Verify:** axe **0 violations** (default + dark). typecheck ✅ · lint ✅ 0 err · unit ✅ 76/76 ·
  build ✅ · e2e chromium **28 passed / 0 failed / 13 skipped** (was 26/2/13).
- **Result:** Accessibility criterion met on the public surface; e2e gate green. Score 73 → ~75.
  Closes AUD-21/22/23.
- **Next loop:** **Monitoring** (enable Sentry/error tracking — acceptance req, weight 7) and
  **Performance** (run Lighthouse to measure against the ≥80/90/90/80 thresholds).
- **CI resolution (same loop):** getting PR #11's e2e green in CI surfaced two real defects beyond
  the contrast work — (1) a dev-server **port conflict** (manual `npm run dev` + Playwright
  `webServer` both binding :5173) that had kept `main`'s e2e red for 5+ merges; (2) **flaky** a11y
  specs racing the SPA mount via immediate `.count()`. Both fixed → CI fully green on `4ef2468`
  (lint/build/unit/e2e/CodeRabbit). 11 CodeRabbit doc findings triaged (8 VALID fixed, 3 OPTIONAL).

## 2026-06-20 · Sprint 1 — Production Safety & Trust
- **Objective:** close the security/process gaps gating a trustworthy launch (AUD-01..05, 08, 15, 16).
- **Hypothesis:** these are mostly additive hardening with no product/security tradeoff, so they
  can land autonomously (confidence ≥ 80%) after confirming non-breaking implementations.
- **Change:**
  - AUD-01 `chess-mentor` now verifies the JWT via `auth.getUser()` (removed unverified base64
    decode); added `supabase/config.toml` pinning `verify_jwt=true`; added
    `edgeFunctionSecurity.test.ts` regression guard.
  - AUD-03 CORS fails closed — localhost-only when `ALLOWED_ORIGINS` unset (no origin echo).
  - AUD-02 Added CSP (`script-src 'self'`, no eval — Stockfish is asm.js) + HSTS +
    Permissions-Policy to `vercel.json`.
  - AUD-04 Replaced placeholder security contact with GitHub private advisories.
  - AUD-05 Added CI lint job + coverage (`@vitest/coverage-v8`, `test:coverage`, artifact upload).
  - AUD-08 Removed OAuth-payload `console.log`s (prod already strips via terser `drop_console`).
  - AUD-15 Authored `CONTEXT.md`.
  - AUD-16 Fleshed out OS protocol docs (AOS, PR, Merge, Escalation, CodeRabbit, Release).
- **Verify:** typecheck ✅ · lint ✅ (0 err) · unit+coverage ✅ 87/87 · build ✅ ·
  e2e ⚠️ 26 pass / 2 pre-existing fail (AUD-21, AUD-22) / 13 skip.
- **Result:** all 8 Sprint-1 items implemented and locally verified; the only red is two
  pre-existing v2 e2e failures untouched by this change (diff confirms). Committing → PR.
- **Next loop:** open Sprint-1 PR → CodeRabbit triage → resolve → re-verify → MERGE_READY.

---

## 2026-06-20 · Sprint 1 — PR #10 review + deploy iteration
- **Objective:** drive PR #10 to MERGE_READY; resolve CodeRabbit; verify headers on the real target.
- **Change:**
  - Rebased the 4 commits onto `origin/main` (clean — all touched files identical to base) so the
    security fixes target production independently of the v2 track (per E-1). PR #10 opened to `main`.
  - **Discovered** the live deploy is **Netlify** (vercel.json ignored → no CSP live). Added
    `public/_headers`; verified CSP/HSTS/X-Frame/Referrer/Permissions live on the deploy preview.
  - **CodeRabbit:** 2 findings (unpinned Actions). Triaged VALID; pinned all actions to verified v4
    SHAs + `persist-credentials: false`; replied with classification.
  - **Discovered** `main` CI red for 5+ merges (pre-existing e2e — AUD-21/22) → logged AUD-23.
- **Verify:** CI on PR — Lint ✅ · Type-check & Build ✅ · Unit ✅ · CodeRabbit ✅ ·
  E2E ⚠️ (pre-existing main failures, no regression). Live headers ✅ on deploy preview.
- **Result:** all Sprint-1 scope complete + review fixes in. MERGE_READY pending CodeRabbit
  incremental re-review (rate-limited ~50 min) and human approval/merge.
- **Next loop:** re-check CodeRabbit after rate-limit clears; on human approval → merge → Sprint 2
  (which absorbs AUD-21/22/23 to restore the e2e gate).

---

## 2026-06-20 · Product-to-Production · Loop B — RLS/auth integration tests
- **Objective:** highest-weighted acceptance blockers — Security (wt 15, "RLS verified") + Testing
  (wt 10, "Integration tests pass"), both gated on the same DB-level test (AUD-27).
- **Hypothesis:** can verify RLS against the real migrations with no infra/cost via PGlite (WASM PG).
- **Change:** `src/lib/rls.integration.test.ts` — PGlite + Supabase-auth shim + all 7 migrations;
  asserts cross-user isolation (games/moves/api_logs), WITH CHECK spoof-prevention, zero-row
  UPDATE/DELETE across users, and the W/L/D stats trigger. Runs under node env (docblock).
- **Verify:** `npm test` 83 passed (7 new) · typecheck ✅ · lint ✅ · build ✅.
- **Result:** Security 84→87, Testing 80→87, DB 78→82; both acceptance sections now pass. Score 78→~79.
- **Next loop:** next highest lever toward ≥85 — UI/design-system consolidation (wt 8, score 62) or
  Monitoring (alerting/cleanup); Product-Quality audit.
