# Project State

_Last updated: 2026-06-20 · Snapshot by Autonomous Engineering System_

## Current Phase
**Phase 2 — Sprint 1 (Production Safety & Trust): in PR #10, review fixes applied.**
All 8 items + CodeRabbit fixes landed on `sprint-1/production-safety-and-trust` (rebased onto
`origin/main`). **MERGE_READY pending:** (1) CodeRabbit incremental re-review (rate-limited ~50 min)
to confirm the action-pinning fix; (2) human approval/merge. Phase 1 audit complete; OS docs initialized.

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

## Branch / Repo State
- Active branch: `v2/phase-2-analysis-workspace` (ahead of `main`).
- Remote: `github.com/Arjav1512/ChessMate-Tool`.
- Open PRs: none detected.
- Other branches in flight: `feat/sprint-2-stabilization-and-experience`,
  `fix/user-color-consistency-and-cleanup`, `qa/production-readiness-audit`,
  `v2/phase-1-design-system`.
- **Note:** a v2 redesign is mid-flight on the current branch (design-system v2,
  tabbed insights workspace, Stockfish hook extraction). Partial-feature risk —
  see Escalation E-1.

## Quality Gates (verified 2026-06-20)
| Gate | Command | Result |
|---|---|---|
| Type-check | `tsc --noEmit -p tsconfig.app.json` | ✅ clean |
| Lint | `eslint .` | ✅ 0 errors, 5 `react-refresh/only-export-components` warnings |
| Unit tests | `vitest run` | ✅ 82/82 passing (8 files) |
| Build | `vite build` | ✅ success — main 355 KB (88.96 KB gzip), vendor 140 KB |
| E2E | Playwright + axe | ⚠️ runs locally; auth-gated specs skip without seeded user |

## Architecture Snapshot
- React 18 + TS 5.5 (strict), Vite 5 + PWA, Tailwind 3 + CSS-var token system.
- Supabase: Postgres (RLS on all user tables), Auth (email + Google/GitHub OAuth +
  password reset), one Deno Edge Function (`chess-mentor`, Gemini proxy).
- Stockfish.js in a Web Worker (UCI); PGN parsing in a dedicated worker.
- Sentry optional (behind `VITE_SENTRY_DSN`).
- 7 SQL migrations; stats maintained by a `SECURITY DEFINER` trigger reading
  `games.user_color`.

## Production Readiness
**Score: 70 / 100 — "Advanced Beta."** Functionally complete and well-tested at the
unit level; gated on security headers, JWT-verification hardening, CI/observability
maturity, and design-system consolidation. Full breakdown in `PRODUCTION_SCORECARD.md`.

## Escalations — RESOLVED (2026-06-20)
- **E-1 → PARALLEL:** Sprint-1 security/CI hardening proceeds now on the current
  base; v2 redesign continues as a separate track to a clean merge.
- **E-2 → DEFER:** v1 stays stats + AI coach; revisit learning depth after Sprint 1–2.

## Blockers / Risks
- **R-1:** Edge Function trusts `sub` from an unverified JWT decode; no
  `supabase/config.toml` pinning `verify_jwt=true`.
- **R-2:** No CSP / HSTS; CORS falls back to echoing request origin when
  `ALLOWED_ORIGINS` is unset.
- **R-3:** Lint + RLS/auth integration not enforced in CI.
- **R-4:** `CONTEXT.md` referenced by README/CONTRIBUTING but absent from repo.

## Next Objective
Open the Sprint-1 PR → CodeRabbit triage (`CODERABBIT_PROTOCOL.md`) → resolve comments →
re-verify → MERGE_READY + human approval. Then **Sprint 2 — Verify & Observe**, which also
absorbs the discovered AUD-21 (v2 contrast a11y) and AUD-22 (stale e2e smoke test).
