# Production Readiness Scorecard

_Last updated: 2026-06-20 · Auditor: Autonomous Engineering System (QA + Tech Lead hats)_

## Headline Score: **70 / 100 — "Advanced Beta"**

Functionally complete, well-architected, and unit-tested. Not yet production-hardened:
security headers, Edge-Function auth hardening, observability, and design-system
consolidation are the gating gaps. No P0 data-loss or auth-bypass found.

## Category Breakdown

| # | Category | Weight | Score /100 | Notes |
|---|---|:--:|:--:|---|
| 1 | Security & Privacy | 15 | 65 | RLS solid, no client secrets, XSS-safe renderer; **gaps:** unverified JWT decode, no CSP/HSTS, permissive CORS fallback, placeholder security contact |
| 2 | Architecture & Code Quality | 10 | 82 | Strict TS, clean hooks/workers, passing gates; some 1000+ line components & inline-style sprawl |
| 3 | Database & Supabase | 8 | 78 | RLS on every user table, indexed, migration-tested; `cleanup_old_logs` unscheduled |
| 4 | Testing & QA | 10 | 70 | 82 unit tests + axe e2e; **no** RLS/auth integration tests, no coverage gate, lint not in CI |
| 5 | Performance | 8 | 78 | 89 KB gzip main, code-split, worker offload; Stockfish PWA precache ~2.1 MB |
| 6 | Accessibility | 8 | 72 | Global focus-visible, focus traps, axe in e2e; sparse `aria-live`, inline-style surfaces |
| 7 | Mobile / Responsive | 6 | 76 | `useResponsive`, mobile bottom-sheet nav, 320px overflow fixed |
| 8 | UI Consistency & Design System | 8 | 58 | v2 primitives exist but underused — 35 files hand-roll inline styles vs 3 `Button` imports; redesign mid-flight |
| 9 | Monitoring & Observability | 7 | 55 | Sentry optional/likely off, `api_logs` table; no alerting/SLO/uptime; console noise ships |
| 10 | Deployment & Release | 6 | 66 | Vercel config + CI build/test/e2e; no staging/rollback runbook, no release tagging |
| 11 | AI Coach | 6 | 66 | Context-aware, rate-limited, structured output; model hardcoded, no streaming/caching |
| 12 | Analysis Engine | 4 | 78 | Stockfish multi-PV, eval gauge, move classifier, insight cards — strong core |
| 13 | Learning & Progress System | 4 | 58 | Stats + snapshots + color split honest; thin as a "learning" loop (no drills/plan) |

**Weighted total ≈ 70 / 100.**

## Scoring Rubric
- **90–100** Production-ready: ship with monitoring.
- **75–89** Release candidate: minor hardening + verification.
- **60–74** Advanced beta: functional, gated on safety/observability. ← _current_
- **40–59** Beta: core works, material gaps.
- **<40** Alpha / prototype.

## Path to 85+ (Release Candidate)
1. Close Security gaps 1–4 (Sprint 1): verify JWT, add CSP/HSTS, fail-closed CORS, real security contact → Security 65→85.
2. Lint + RLS/auth integration in CI, seed e2e user (Sprint 1–2) → Testing 70→85.
3. Sentry on + alerting + scheduled log cleanup + strip console noise (Sprint 2) → Monitoring 55→78.
4. Release runbook + staging + tagging (Sprint 2) → Deployment 66→82.
5. Design-system consolidation / finish v2 (Sprint 3) → UI 58→80.

Projected post-Sprint-3 score: **~85 / 100.**
