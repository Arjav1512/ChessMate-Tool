# Monitoring & Observability Runbook

How ChessMate is observed in production, how to check health, how to respond to
incidents, and the **operator setup steps** that require credentials (Sentry DSN,
Sentry alerts, pg_cron) — those are the only parts not wired automatically.

---

## What's instrumented (no credentials needed)

| Signal | Where | What it captures |
|---|---|---|
| **Front-end errors** | Sentry SDK (`src/lib/sentry.ts`) + **global handlers** (`src/lib/monitoring.ts`) | Uncaught errors, unhandled promise rejections, `ErrorBoundary` crashes — routed through `logError`. Tagged with **release** (`chessmate@<version>+<commit>`) and **environment**. |
| **Edge-function errors** | `api_logs` table (durable) | Every `chess-mentor` failure path logs a row: unauthenticated, rate-limited, missing key, and the catch-all — now attributed to the **caller + question** (see `logRequest`). |
| **Deployment health** | `scripts/smoke-test.mjs` via `.github/workflows/deploy-verify.yml` | Live-site 200, app shell, and security headers — on every `main` deploy, hourly canary, and manual dispatch. |
| **Hosting** | Netlify dashboard | Build/deploy status, bandwidth, function invocations. |

> The production build strips `console.*` (`vite drop_console`). The Sentry path
> and the global handlers are therefore the **only** way a prod front-end error
> becomes visible — which is why they exist.

## How to check health

- **Smoke test now:** `npm run smoke` (or `node scripts/smoke-test.mjs <url>`). Exits non-zero with the failing check.
- **Canary:** GitHub → Actions → *Deploy Verify*. A red run = the live site is down or lost its headers.
- **Edge errors:** query `api_logs` —
  ```sql
  select created_at, user_id, error_message
  from api_logs
  where success = false and created_at > now() - interval '1 hour'
  order by created_at desc;
  ```
- **Front-end errors:** Sentry dashboard (once the DSN is set — see below).

## Incident response (quick)

1. **Site down / headers missing** → Deploy Verify is red. Check Netlify deploy log; roll back to the previous deploy (`RELEASE_PROTOCOL.md` → Rollback).
2. **Coach failing** → spike of `success=false` in `api_logs`. Check `error_message`: `GEMINI_API_KEY not configured` (secret missing), `Rate limit exceeded` (abuse/load), or a Gemini/network error. Verify Supabase secrets `GEMINI_API_KEY` and `ALLOWED_ORIGINS`.
3. **Front-end spike** → Sentry: group by release to find the regressing build; roll back that release.

## Recommended alert thresholds (configure in Sentry / Netlify)
- Front-end error rate > 2% of sessions (acceptance target) → alert.
- New issue on the latest release → alert.
- Deploy Verify failure → GitHub notifies on the failed Action.

---

# Operator setup (credential-bound — not automatable)

These three steps require credentials/settings only the project owner can provide.
Everything above works the moment they're done; nothing else is blocked on them.

## 1. Enable front-end error tracking — `VITE_SENTRY_DSN`
1. Create a project at <https://sentry.io> → **Browser / React**. Copy the **DSN**.
2. Netlify → Site → **Site settings → Environment variables** → add
   `VITE_SENTRY_DSN = <dsn>` (build-time; it is safe to expose — DSNs are public ingest keys).
3. Trigger a redeploy. Errors now flow to Sentry, tagged by release/environment.
4. Verify: in the app, throw a test error (or wait for one) and confirm it appears in Sentry under the current `chessmate@…` release.

## 2. Sentry alerts
1. Sentry → **Alerts → Create Alert** → *Number of errors* or *Issue state*.
2. Rule: notify when a **new issue** appears on the **latest release**, and when error count exceeds your threshold in 1h.
3. Route to email/Slack.

## 3. Schedule `api_logs` cleanup — pg_cron
`cleanup_old_logs()` exists (`supabase/migrations/20251018010000_add_api_logs.sql`)
but is **not scheduled**, so `api_logs` grows unbounded (slowing the rate-limit query).
1. Supabase → **Database → Extensions** → enable **`pg_cron`**.
2. Run once in the SQL editor:
   ```sql
   select cron.schedule('cleanup-old-logs', '0 2 * * *', $$ select cleanup_old_logs() $$);
   ```
3. Verify: `select * from cron.job;` shows the job. (Alternative if pg_cron is unavailable: a scheduled Supabase Edge Function calling `cleanup_old_logs`.)

---

_Updated by the Monitoring & Observability loop. See `ChessMate-Autonomous-OS/RELEASE_PROTOCOL.md`
for release/rollback and `PRODUCTION_SCORECARD.md` for the Monitoring score._
