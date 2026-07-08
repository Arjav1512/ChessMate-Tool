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

---

## 2026-06-20 · Product-to-Production · Loop C — Product Quality audit
- **Objective:** complete the Product Quality acceptance section (dead buttons/toggles, journeys,
  loading/error/empty states, edge cases, onboarding friction).
- **Change:** audit found the app mature; the real gap was error/validation UX. Added `noValidate`
  to 3 auth forms, made the `Input` primitive accessible (`aria-invalid`/`aria-describedby`/
  `role="alert"`), routed error text to `--cm-error-bright` (AA) + announced it, fixed auth accent
  links. Added an e2e validation regression test. Verified via dynamic Playwright probe + axe.
- **Verify:** typecheck ✅ · lint ✅ · unit ✅ 83 · build ✅ · e2e ✅ 29/0/13 · auth error axe-clean.
- **Result:** Product Quality section addressed; Accessibility/UI nudged up. Score 79→~80.
- **Next loop:** remaining levers to ≥85 — UI consolidation (visual, low autonomous confidence),
  Monitoring (needs Sentry DSN), AI-coach depth. Several need the user (merges, DSN).

---

## 2026-06-20 · Product-to-Production · Loop D — Design System Consolidation P0
- **Objective:** raise UI Consistency & Design System (wt 8, biggest remaining lever) via
  consolidation — no visual redesign.
- **Change:** completed the `Button` primitive (per-variant hover via internal state; rest-state
  unchanged), adopted it in WelcomeScreen + ErrorBoundary, authored `DESIGN_SYSTEM_AUDIT.md`
  (P0–P5 plan). Verified via build/e2e/axe (Button is used in auth).
- **Verify:** typecheck ✅ · lint ✅ · unit 83 ✅ · build ✅ · e2e 29/0/13 ✅ · auth axe-clean ✅.
- **Result:** UI 62→66; foundational primitive completed so further adoption is regression-free.
  Score ~80 (UI nudge). CI green, 0 CodeRabbit findings.
- **Next loop:** DS P1 (Input adoption) / P2 (modal buttons) — autonomous; **P4 high-traffic visual
  surfaces require human/visual QA** (escalation). Also pending: PR merges (#10–#14), Sentry DSN.

---

## 2026-06-20 · Product-to-Production · Loop E — Monitoring & Observability (autonomous)
- **Objective:** make production failures visible (highest production risk from the gap analysis)
  without requiring external credentials.
- **Change:** Sentry release/env tagging (vite-injected `chessmate@<ver>+<commit>`); global
  error/rejection handlers (`src/lib/monitoring.ts`, 5 tests); durable edge-`api_logs` capture on all
  failure paths (3 assertions); `scripts/smoke-test.mjs` + `deploy-verify.yml` (canary); `MONITORING.md`.
- **Verify:** typecheck ✅ · lint ✅ · unit 91 ✅ · build ✅ · e2e 29/0/13 ✅ · smoke green vs prod+preview.
- **Result:** Monitoring 55→72, Deploy 70→76; score ~81. Credential-bound items (DSN/alerts/pg_cron)
  documented with setup guides in MONITORING.md — owner action, not blocking.
- **Next:** owner sets DSN/pg_cron to reach Monitoring ~80; remaining autonomous levers smaller.

---

## 2026-06-21 · Product-to-Production · Loop F — Weakness Profile (Personal Improvement System)
- **Objective (approved product direction):** transform Analyzer → Personal Chess Improvement System
  via a read-only Weakness Profile from existing data (E-2 reopened/approved).
- **Change:** pure `weaknessProfile.ts` engine (opening/color/recurring + low-conf phase proxy, with
  confidence/evidence/trend; 11 tests); `useWeaknessProfile` (session-cached); `WeaknessProfile` UI in
  the Progress workflow; coach context personalization (gemini + edge prompt + GameViewer).
- **Verify:** typecheck ✅ · lint ✅ · unit 102 ✅ · build ✅ · e2e 29/0/13 ✅. No schema/per-move/jobs.
- **Result:** Learning 58→75, AI Coach 66→72; score ~82. Phase-2 (per-move phase, drills) honestly deferred.
- **Next:** CodeRabbit triage on PR #16 → MERGE_READY. Owner-gated items (merges, Sentry DSN) still pending.

---

## 2026-06-21 · Product-to-Production · Loop G — Phase 2 / B-1: move_analysis data layer
- **Objective:** ship the foundational per-ply data layer (Option B) cleanly + safely. No UI/engine/drills.
- **Change:** additive `move_analysis` migration (RLS, indexes, reserved phase/motif columns); pure
  `buildMoveAnalysisRows` + non-fatal `persistMoveAnalysis` (`lib/moveAnalysis.ts`); BulkAnalysis write
  path from already-computed data (best-alternative = prior ply's engine best move); RLS isolation test
  in PGlite (executes the migration); CONTEXT.md updated.
- **Verify:** typecheck ✅ · lint ✅ · unit 108 ✅ (incl. migration execution + RLS) · build ✅ · e2e 29/0/13 ✅.
- **Result:** DB/Architecture +1 each; score ~82 (foundational). Unlocks B-2 (true phase), B-3 (motifs),
  B-4 (train-on-mistakes).
- **Next:** B-2 — derive phase + upgrade the Weakness Engine to true phase weakness (replaces the proxy).

---

## 2026-06-21 · Product-to-Production · Loop H — Phase 2 / B-2: true phase weakness
- **Objective:** replace the proxy phase signal with true opening/middle/endgame weakness from move_analysis.
- **Change:** `derivePhase` (per-move, material+move-number heuristic) tagging persisted rows; engine
  computes per-phase strength + weakest-phase weakness with sample-size confidence; hook filters to the
  user's own moves; Profile shows phase-strength meters. Proxy removed.
- **Verify:** typecheck ✅ · lint ✅ · unit 115 ✅ · build ✅ · e2e 29/0/13 ✅.
- **Result:** Learning 75→80, Analysis 78→80; score ~83. Phase data persist-forward (sparse until re-analysis).
- **Next:** B-3 lightweight motif tagging; B-4 train-on-your-mistakes.

---

## 2026-06-21 · Product-to-Production · Loop I — Phase 2 / B-3: tactical motifs
- **Objective:** lightweight, deterministic tactical-motif detection → recurring mistake patterns.
- **Change:** `lib/motifs.ts` (deterministic, eval-magnitude mate + single chess.js capture check, no
  engine pass) tagging persisted rows; engine adds recurring-motif weaknesses (freq + confidence);
  Profile shows motif cards; hook passes user moves + motifs. Phase-1 taxonomy only; no schema change.
- **Verify:** typecheck ✅ · lint ✅ · unit 127 ✅ · build ✅ · e2e 29/0/13 ✅.
- **Result:** Learning 80→85, Analysis 80→82; score ~84. Learning layer = opening + phase + motif.
- **Next:** B-4 train-on-your-mistakes (surface stored blunder positions: fen-before + best alternative).

---

## 2026-06-21 · Product-to-Production · Loop J — Phase 2 / B-4: Train-On-Your-Mistakes
- **Objective:** turn stored move_analysis into a read-only mistake-review workflow (no drills/SRS).
- **Change:** pure `buildMistakeReview` (rank by severity + motif importance + recurrence; filter by
  phase/motif; UCI→SAN); `useMistakeReview` (user's own mistakes, cached); `MistakeReview` feed of
  board cards; Weakness-Profile cards deep-link (phase/motif) → filtered feed + scroll.
- **Verify:** typecheck ✅ · lint ✅ · unit 134 ✅ · build ✅ · e2e 29/0/13 ✅.
- **Result:** Learning 85→88; read-only improvement system complete (B-1→B-4). Score ~84.
- **Next:** drills/training (SRS) would be a NEW product-direction decision; otherwise owner-gated
  items (merges, Sentry DSN) and remaining levers (UI P4, AI-coach depth) remain.
