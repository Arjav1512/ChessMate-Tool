# Decision Log

_Append-only. Record major approved decisions and open escalations._

## Format
`[DATE] [ID] STATUS — Decision · Rationale · Owner`
STATUS ∈ DECIDED · OPEN · SUPERSEDED · NOTED (observation, not a decision) · RESOLVED (closes an OPEN item).

---

## Decided

- **[2026-06-20] D-001 DECIDED** — Initialize the Autonomous Engineering OS and run
  a non-destructive Phase-1 audit (no code, no PRs). _Rationale:_ establish a
  governed baseline before any change. _Owner:_ Autonomous System.
- **[2026-06-20] D-002 DECIDED** — Production Readiness Score set at **70/100
  ("Advanced Beta")** with the category model in `PRODUCTION_SCORECARD.md`.
  _Rationale:_ functionally complete + tested, gated on security/observability/UI.
  _Owner:_ QA hat.

## Sprint 1 implementation decisions (autonomous, confidence ≥ 80%, no escalation trigger)

- **[2026-06-20] D-003 DECIDED** — AUD-01 fixed by verifying the caller via
  `supabase.auth.getUser(token)` **and** pinning `verify_jwt=true` in `config.toml`
  (defense-in-depth). Removed the unverified base64 decode entirely. _Tradeoff:_ one extra
  GoTrue round-trip per request — negligible at 10 req/min/user; strictly more secure.
- **[2026-06-20] D-004 DECIDED** — AUD-02 CSP uses `script-src 'self'` with **no** `eval`
  directive. Verified safe: no inline scripts in built HTML; `stockfish.js` is asm.js
  (no `eval`/`Function`/`WebAssembly`). Fonts/Supabase/Sentry origins explicitly allowed.
  CSP applies on Vercel only (not the dev server), so it does not affect local e2e.
- **[2026-06-20] D-005 DECIDED** — AUD-03 CORS fails closed: with no `ALLOWED_ORIGINS`,
  only localhost origins are reflected; all others get `Access-Control-Allow-Origin: null`.
- **[2026-06-20] D-006 DECIDED** — AUD-04 disclosure channel = GitHub private security
  advisories (no personal email exposed). _Rationale:_ standard best-practice default.
- **[2026-06-20] D-007 DECIDED** — AUD-05 coverage is **measured/uploaded without a failing
  threshold** for now; a coverage gate is deferred to Sprint 2 to avoid a flaky gate on day one.
- **[2026-06-20] D-008 NOTED** — Two pre-existing e2e failures (AUD-21 v2 landing contrast,
  AUD-22 stale smoke test) are **not** in Sprint-1 scope and are tracked for the v2 track /
  Sprint 2. The chromium e2e CI job stays red until then; this PR introduces no e2e regression.

## Accessibility & test-gate loop decisions (product-to-production)

- **[2026-06-20] D-009 DECIDED** — AUD-21 contrast fixed **without changing the brand palette**
  (indigo stays `#7B6CF6`). Introduced `--cm-accent-strong` (#6A5BF0) for button FILLS where white
  text needs 4.5:1, `--cm-error-bright` (#F2685D) for error TEXT on dim chips, and routed small
  accent-text to the existing `--cm-accent-bright`. This is AA remediation (engineering), not a
  product-direction change → no escalation. Verified by axe (0 violations, default + dark).
- **[2026-06-20] D-010 DECIDED** — `:root` `--cm-text-inverse` corrected to `#FFFFFF`. The pre-auth
  landing renders under `:root` (ThemeToggle only mounts in the authed app), so the dark default must
  carry white button text to clear AA — previously `#0C0E12`, inconsistent with the dark block.
- **[2026-06-20] D-011 DECIDED** — Non-Free pricing CTAs are now `disabled` + `aria-label`led
  ("coming soon"). They had no `onClick` (**dead buttons**, Product-Quality violation) and failed
  contrast at opacity 0.6. Disabling fixes both and is honest UI for roadmap plans.
- **[2026-06-20] D-008 → RESOLVED** — AUD-21/22 are now fixed on branch
  `prod/accessibility-aa-and-test-gate`; chromium e2e is green (28/0/13). AUD-23 (the e2e gate had
  been red on `main`) is thereby addressed — e2e can become a trustworthy required check.

- **[2026-06-20] D-012 DECIDED** — AUD-27 RLS/auth integration tests use **PGlite** (in-process
  Postgres WASM) rather than a live Supabase test project. _Rationale:_ runs the real migrations in
  the existing CI unit job with no Docker, no external service, no secrets, and **no cost** — so it
  needs no escalation (earlier flagged as possibly cost/secret-gated; PGlite removes that). A minimal
  `auth.uid()`/roles shim lets the unmodified migrations apply.

- **[2026-06-20] D-013 DECIDED** — Forms adopt `noValidate` + the app's custom validation as the
  single path (was: browser-native popups intercepting). Rationale: consistent, styled, announced
  (`role="alert"`), AA-contrast error UX; native popups can't be styled or wired to aria. UI/a11y
  only — no escalation. The shared `Input` primitive now carries `aria-invalid`/`aria-describedby`.

- **[2026-06-20] D-014 DECIDED** — Design-system consolidation enhances the `Button` primitive with
  hover via internal state (not CSS classes), because the primitive sets bg/border inline and a
  `:hover` rule cannot override inline styles. Rest-state is unchanged; hover is additive. Adoption
  proceeds on low-traffic surfaces autonomously; **high-traffic visual surfaces (P4) are escalated to
  a visually-QA'd pass** (no-major-redesign constraint is unverifiable headless → confidence <80%).

- **[2026-06-20] D-015 DECIDED** — Monitoring loop ships the **autonomous** scaffolding only:
  Sentry release/env tagging, global error/rejection handlers, durable edge-`api_logs` capture on
  every failure path, a live-URL **smoke test + hourly canary**, and `MONITORING.md`. The three
  credential-bound items (`VITE_SENTRY_DSN`, Sentry alerts, pg_cron for `cleanup_old_logs`) are
  **documented with step-by-step setup guides** and left for the owner — no escalation block; all
  other work proceeded. Verified without any external credential (91 unit tests, smoke vs prod+preview).

## Resolved Escalations

- **[2026-06-20] E-1 DECIDED — Priority direction: PARALLEL.**
  Run path-independent Sprint-1 security/CI hardening **now** against the current
  base, while the **v2 redesign continues as a separate track** toward a clean
  merge (no partial features land on the release path). _Owner:_ user.
  _Effect:_ Sprint 1 proceeds immediately; AUD-10 (v2 cutover) stays a parallel
  branch deliverable, not a blocker.

- **[2026-06-20] E-2 DECIDED — Learning-system depth: DEFER.**
  Keep v1 as **stats + AI coach**; revisit drills / spaced repetition / training
  plans **after Sprint 1–2**, informed by usage signal. _Owner:_ user.
  _Effect:_ AUD-20 deferred out of the committed Sprint-3 scope; revisit as a
  scoping decision post-Sprint-2.

## Notes
- Escalation gates are governed by `ESCALATION_PROTOCOL.md`: pause for user input on
  major product, architecture, business, or security decisions.
- No production functionality was modified during Phase 1.
