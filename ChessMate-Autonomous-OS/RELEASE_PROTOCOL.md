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

## Deploy (Vercel)
- `main` deploys via Vercel. Verify the production deployment succeeds.
- **Post-deploy smoke check:** app loads, sign-in works, a game imports, Stockfish analyzes,
  the AI coach responds, no console/CSP errors in the browser, security headers present
  (`curl -I` shows CSP/HSTS).
- Confirm Edge Function env in production: `GEMINI_API_KEY`, `ALLOWED_ORIGINS` (must be set —
  CORS fails closed without it), and `verify_jwt=true` is in effect.

## Monitor
- Watch Sentry (if configured) for new error signatures for the first hours.
- Watch `api_logs` for Edge Function error spikes / rate-limit anomalies.

## Rollback
- Revert the deployment to the previous Vercel build, or `git revert` the merge and redeploy.
- If a migration shipped, assess data impact before reverting schema — escalate if destructive.
