# Release Protocol

From MERGE_READY to deployed and monitored. _Note: a full staging + tag-on-merge +
rollback runbook is a Sprint-2 deliverable (AUD-12); this is the working baseline._

## Pre-merge
- [ ] PR is MERGE_READY (`MERGE_CHECKLIST.md`) and human-approved.
- [ ] CI green on the PR head.
- [ ] `DECISION_LOG.md` / `PROJECT_STATE.md` current.

## Merge
- Squash-merge to `main` with a clean title.
- Confirm CI is green on `main` post-merge.

## Versioning & tagging
- Bump `package.json` `version` per semver (fix → patch, feature → minor).
- Tag the release `vX.Y.Z` and note highlights (link the PR/backlog IDs).

## Deploy (Netlify)
- `main` deploys via **Netlify** (`chess-mateapp`) — the live target. Security headers ship from
  `public/_headers` (copied into `dist/` by Vite); `vercel.json` is kept in sync but Netlify ignores
  it. Verify the production deployment succeeds.
- **Post-deploy smoke check:** app loads, sign-in works, a game imports, Stockfish analyzes,
  the AI coach responds, no console/CSP errors in the browser, security headers present
  (`curl -I` shows CSP/HSTS).
- Confirm Edge Function secrets in production: `GEMINI_API_KEY` and `ALLOWED_ORIGINS` (must be set —
  CORS fails closed without it).
- Confirm `verify_jwt = true` for `chess-mentor` — it lives in `supabase/config.toml` (committed),
  not in env vars.

## Monitor
- Watch Sentry (if configured) for new error signatures for the first hours.
- Watch `api_logs` for Edge Function error spikes / rate-limit anomalies.

## Rollback
- Revert the deployment to the previous Netlify deploy, or `git revert` the merge and redeploy.
- If a migration shipped, assess data impact before reverting schema — escalate if destructive.
