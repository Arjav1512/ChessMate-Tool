# Sprint Backlog

_Last updated: 2026-06-20 · Priority-ordered. Effort: XS≤2h · S≤0.5d · M≈1–2d · L≈3–5d._

## Top 20 Priorities

Severity: 🔴 High · 🟠 Medium · 🟡 Low. Impact and recommendation per item.

| ID | Sev | Area | Issue | Impact | Recommendation | Effort |
|----|:--:|------|-------|--------|----------------|:--:|
| AUD-01 | 🔴 | Security | `chess-mentor` decodes JWT and trusts `sub` **without verifying the signature**; no `supabase/config.toml` pinning `verify_jwt=true` | If verify_jwt is ever off, attacker forges `sub` → bypasses per-user rate limit → Gemini cost/abuse | Verify token in-function via `auth.getUser(token)`, **and** commit `config.toml` with `verify_jwt=true`; add a test | S |
| AUD-02 | 🔴 | Security | No `Content-Security-Policy` and no `Strict-Transport-Security` header | Weakens defense-in-depth against XSS via PGN/AI-rendered content; no HTTPS pinning | Add CSP (self + Supabase + Sentry origins) and HSTS to `vercel.json`; verify no breakage | M |
| AUD-03 | 🟠 | Security | CORS fails **open** — echoes request origin when `ALLOWED_ORIGINS` unset | A prod deploy missing the env ships permissive CORS | Fail closed in prod (require allowlist); only echo in dev | S |
| AUD-04 | 🟡 | Security | `security@chessmate.local` placeholder contact in `SECURITY.md` | Blocks responsible disclosure | Set a real reporting address | XS |
| AUD-05 | 🟠 | CI/QA | Lint not run in CI; no coverage gate | Warnings/regressions rot silently | Add `eslint` + coverage threshold jobs to `ci.yml` | S |
| AUD-06 | 🟠 | CI/QA | No RLS/auth integration tests; auth-gated e2e specs **skip** in CI (no seeded user) | RLS is _the_ security boundary yet unverified in CI; core authed flows untested | Seed a CI Supabase test user; add RLS policy assertions | M |
| AUD-07 | 🟠 | Observability | Sentry optional/likely off; no alerting/SLO/uptime; `cleanup_old_logs` needs manual pg_cron | Blind to prod errors; `api_logs` grows unbounded, slowing rate-limit query | Wire Sentry in prod + alert rules; schedule `cleanup_old_logs` via pg_cron | M |
| AUD-08 | 🟡 | Observability | 48 `console.*` in `src/` incl. `console.log(...OAuth..., data)` | Noise + minor PII/token-shape leakage in prod console | Strip/guard console behind dev flag; never log auth payloads | S |
| AUD-09 | 🟠 | UI / DS | Design-system primitives underused — 35 files hand-roll inline styles; only 3 import `Button`; `App.tsx` ~670 lines of inline markup | Inconsistency, drift, high maintenance; worsened by mid-flight v2 | Migrate surfaces to `ui/` primitives + tokens incrementally | L |
| AUD-10 | 🟠 | Product/Process | v2 redesign mid-flight on active branch (partial features) vs CONTRIBUTING "no partial features" | Half-wired UI risk; unclear release target | **Escalation E-1** — decide harden-vs-finish before more work | — |
| AUD-11 | 🟠 | A11y | Sparse `aria-live` (3) for async toasts/errors/engine eval/chat | Screen-reader users miss eval changes & coach replies | Add polite live regions for eval, toasts, coach responses | M |
| AUD-12 | 🟠 | Deploy/Release | No staging env, release tagging, or rollback runbook (`RELEASE_PROTOCOL` is a stub) | Risky, non-repeatable releases | Write release runbook; add tag-on-merge + rollback steps | M |
| AUD-13 | 🟠 | Data Quality | Stats silently drop NULL-`user_color` games from W/L/D; detection brittle | Users may distrust totals that "don't add up" | Surface excluded-game count in UI; improve color detection + manual override | M |
| AUD-14 | 🟡 | DB | `cleanup_old_logs` defined but unscheduled | `api_logs` unbounded growth | Schedule via pg_cron (covered under AUD-07) | S |
| AUD-15 | 🟡 | Docs | `CONTEXT.md` referenced by README/CONTRIBUTING but missing | Broken onboarding promise for agents/humans | Author `CONTEXT.md` or remove the references | XS |
| AUD-16 | 🟡 | Process | Autonomous-OS protocol docs are skeleton stubs | Governance loop under-specified | Flesh out PR/Merge/CodeRabbit/Release/Escalation protocols | S |
| AUD-17 | 🟡 | AI Coach | Gemini model hardcoded (`gemini-2.0-flash`); no streaming, no answer persistence/caching to `questions` | Higher latency/cost; no chat history; model migration is a code edit | Make model an env; persist Q&A; consider streaming | M |
| AUD-18 | 🟡 | Perf | Stockfish assets in PWA precache (~2.1 MB) | Slow first install / data cost on mobile | Lazy/runtime-cache the engine instead of precache | M |
| AUD-19 | 🟡 | Perf | Modals/routes not lazy-loaded; 355 KB main chunk | Larger-than-needed initial load | `React.lazy` heavy modals (Analyze/Stats) | M |
| AUD-20 | 🟠 | Product | "Learning system" is stats-only; no drills/spaced-repetition/training plan | Gap vs "real coach" positioning | **Escalation E-2** — scope v1 learning depth | — |

## Recommended Roadmap (3 sprints to Release Candidate)

```
Sprint 1  Production Safety & Trust       → close auth/CSP/CORS + CI hygiene
Sprint 2  Verify & Observe                → RLS/auth tests, monitoring, release runbook, a11y, data quality
Sprint 3  Experience & Product Depth      → design-system consolidation / finish v2, AI coach UX, learning scope
```
Each sprint ends at MERGE_READY per `MERGE_CHECKLIST.md`; no partial features merged.

---

## Sprint 1 — Production Safety & Trust
**Goal:** eliminate the security/process gaps that block a trustworthy launch; cheap high-value wins.
**Exit:** Security category ≥85; lint+coverage in CI; no placeholder contacts.
**Status (2026-06-20):** all items IMPLEMENTED on `sprint-1/production-safety-and-trust`;
gates green (typecheck/lint/unit+coverage/build); in PR pending CodeRabbit + merge.

- [x] AUD-01 — Verify JWT in `chess-mentor` via `auth.getUser()` + `config.toml` `verify_jwt=true` + `edgeFunctionSecurity.test.ts`
- [x] AUD-02 — CSP + HSTS + Permissions-Policy in `vercel.json` (`script-src 'self'`, no eval — Stockfish is asm.js)
- [x] AUD-03 — CORS fail-closed: localhost-only when `ALLOWED_ORIGINS` unset (no origin echo)
- [x] AUD-04 — Real disclosure channel in `SECURITY.md` (GitHub private advisories)
- [x] AUD-05 — CI lint job + coverage (`@vitest/coverage-v8`, `test:coverage`, artifact upload)
- [x] AUD-08 — Removed OAuth-payload `console.log`s (prod already strips via terser `drop_console`)
- [x] AUD-15 — Authored `CONTEXT.md`
- [x] AUD-16 — Fleshed out OS protocol docs (AOS/PR/Merge/Escalation/CodeRabbit/Release)

### Discovered during Sprint 1 (logged, not in Sprint-1 scope)
| ID | Sev | Area | Issue | Disposition |
|----|:--:|------|-------|-------------|
| AUD-21 | 🟠 | A11y/UI | v2 landing hero+nav has 91 axe **color-contrast** (WCAG AA) violations; e2e `accessibility` spec fails | Belongs to v2 track / **AUD-09** + Sprint-2 a11y (**AUD-11**). Pre-existing on base branch. |
| AUD-22 | 🟡 | Test debt | `game-import` "sign-in form on landing" smoke test is stale vs the `LandingPage` marketing split | Update spec to the landing→auth flow; folds into **AUD-06** (e2e in CI). Pre-existing. |
| AUD-23 | 🟠 | CI/Process | `main` CI has been **red for 5+ consecutive merges** (e2e job, via AUD-21/22) → the e2e gate is not currently enforced/trustworthy | Fix AUD-22 (cheap) + AUD-21, then treat e2e as a required check. Sprint 2. |
| AUD-24 | 🟢 | Deploy (DONE) | Live deploy target is **Netlify**, which ignored `vercel.json` → security headers were not served | **Fixed in this PR:** added `public/_headers`; CSP/HSTS verified live on the deploy preview |

> Note: the two e2e failures (AUD-21/22) pre-exist on `main` itself — this PR's diff touches none of
> the implicated files and introduces no e2e regression. They keep the chromium e2e job red until
> Sprint 2 / the v2 track addresses them (AUD-23).

## Sprint 2 — Verify & Observe
**Goal:** prove the security boundary in CI and gain production visibility + repeatable releases.
**Exit:** Testing ≥85, Monitoring ≥78, Deployment ≥82.

- [ ] AUD-06 — Seed CI test user; RLS policy + authed-flow integration tests
- [ ] AUD-07 — Sentry in prod + alert rules; schedule `cleanup_old_logs` (+AUD-14)
- [ ] AUD-12 — Release runbook: staging, tag-on-merge, rollback
- [ ] AUD-11 — `aria-live` regions for eval, toasts, coach responses
- [ ] AUD-13 — Surface excluded-game count + color override in stats UI
- [ ] AUD-18 — Move Stockfish to runtime cache (start)

## Sprint 3 — Experience & Product Depth
**Goal:** consolidate the UI and deepen the differentiators.
**Decisions applied:** E-1 → v2 runs as a **parallel track** to a clean cutover (not a
release blocker); E-2 → learning depth **deferred** (AUD-20 out of committed scope,
revisit post-Sprint-2).
**Exit:** UI/DS ≥80; AI coach UX improved; v2 cutover plan landed cleanly.

- [ ] AUD-09 — Migrate surfaces to `ui/` primitives + tokens (incremental)
- [ ] AUD-10 — Land v2 redesign behind a clean cutover (parallel track per E-1)
- [ ] AUD-17 — Env-driven model + persist Q&A history (+ streaming if approved)
- [ ] AUD-19 — Lazy-load heavy modals
- [ ] ~~AUD-20 — Learning depth~~ → **deferred (E-2)**; re-scope after Sprint 2 with usage signal
