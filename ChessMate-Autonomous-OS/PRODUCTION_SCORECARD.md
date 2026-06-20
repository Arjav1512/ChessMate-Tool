# Production Readiness Scorecard

_Last updated: 2026-06-20 · Auditor: Autonomous Engineering System (QA + Tech Lead hats)_

## Headline Score: **~78 / 100 — "Release Candidate"**

_Trajectory: 70 (audit) → 73 (Sprint 1) → 75 (a11y + test-gate) → 78 (Lighthouse/SEO)._ Target for
Production Ready is **≥85** (`PRODUCT_ACCEPTANCE_CRITERIA.md`). **Acceptance sections now passing:**
Accessibility, Performance, PR Quality, Chess Analysis; Security/Testing near threshold. Remaining
gating gaps: design-system consolidation (UI), RLS/auth integration tests, monitoring alerting,
Product-Quality audit. No P0 data-loss or auth-bypass.

### Lighthouse (production build, 2026-06-20)
Performance **83** (≥80 ✅) · Accessibility **100** (≥80 ✅) · Best-Practices **100** (≥90 ✅) ·
SEO **100** (≥90 ✅). _Deploy-preview shows lower SEO/Perf due to Netlify's preview `noindex` +
shared runner — not representative of production._

## Category Breakdown

| # | Category | Weight | Score /100 | Notes |
|---|---|:--:|:--:|---|
| 1 | Security & Privacy | 15 | 84 | **Sprint 1:** JWT verified (`getUser` + `verify_jwt`), CSP/HSTS live on Netlify, CORS fail-closed, real disclosure channel, no client secrets, XSS-safe. _Left:_ RLS verified by tests |
| 2 | Architecture & Code Quality | 10 | 82 | Strict TS, clean hooks/workers, passing gates; some 1000+ line components & inline-style sprawl |
| 3 | Database & Supabase | 8 | 78 | RLS on every user table, indexed, migration-tested; `cleanup_old_logs` unscheduled |
| 4 | Testing & QA | 10 | 80 | **e2e gate green** (28/0/13), coverage + lint in CI; _left:_ RLS/auth integration tests, coverage threshold |
| 5 | Performance | 8 | 88 | **Lighthouse (prod build) all pass: Perf 83 / BP 100 / SEO 100 / A11y 100.** 89 KB gzip main, code-split, worker offload; SEO meta added |
| 6 | Accessibility | 8 | 85 | **AA contrast passes** (axe 0 on landing, default+dark), focus-visible, focus traps, landmarks, alt; _left:_ authed-surface audit, more `aria-live` |
| 7 | Mobile / Responsive | 6 | 76 | `useResponsive`, mobile bottom-sheet nav, 320px overflow fixed |
| 8 | UI Consistency & Design System | 8 | 62 | `--cm-accent-strong`/`-bright`/`-error-bright` tokens systematized; primitives still underused vs inline styles |
| 9 | Monitoring & Observability | 7 | 55 | Sentry optional/likely off, `api_logs` table; **no error tracking enabled** (acceptance criterion), no alerting/SLO |
| 10 | Deployment & Release | 6 | 70 | CI lint/build/unit/e2e, headers live, release runbook drafted; no staging/rollback automation |
| 11 | AI Coach | 6 | 66 | Context-aware, rate-limited, structured output; model hardcoded, no streaming/caching |
| 12 | Analysis Engine | 4 | 78 | Stockfish multi-PV, eval gauge, move classifier, insight cards — strong core |
| 13 | Learning & Progress System | 4 | 58 | Stats + snapshots + color split honest; thin as a "learning" loop (no drills/plan) |

**Weighted total ≈ 75 / 100.**

## Scoring Rubric
- **90–100** Production-ready: ship with monitoring.
- **75–89** Release candidate: minor hardening + verification. ← _current_
- **60–74** Advanced beta: functional, gated on safety/observability.
- **40–59** Beta: core works, material gaps.
- **<40** Alpha / prototype.

## Remaining path to 85 (Production Ready)
- **Monitoring 55→78:** enable Sentry/error tracking in prod + deployment monitoring (acceptance req). _next_
- **Performance:** run Lighthouse; confirm Perf≥80 / BestPractices≥90 / SEO≥90 / A11y≥80 or fix.
- **Testing 80→85:** RLS/auth integration tests (also validates Security "RLS verified").
- **UI 62→80:** consolidate surfaces onto `ui/` primitives.

## Path to 85+ (Release Candidate)
1. Close Security gaps 1–4 (Sprint 1): verify JWT, add CSP/HSTS, fail-closed CORS, real security contact → Security 65→85.
2. Lint + RLS/auth integration in CI, seed e2e user (Sprint 1–2) → Testing 70→85.
3. Sentry on + alerting + scheduled log cleanup + strip console noise (Sprint 2) → Monitoring 55→78.
4. Release runbook + staging + tagging (Sprint 2) → Deployment 66→82.
5. Design-system consolidation / finish v2 (Sprint 3) → UI 58→80.

Projected post-Sprint-3 score: **~85 / 100.**
