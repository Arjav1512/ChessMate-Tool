# Merge Checklist

A PR is **MERGE_READY** only when every box is checked. No partial credit.

## Quality gates (all green)
- [ ] `npm run typecheck` — clean
- [ ] `npm run lint` — no errors (pre-existing warnings noted, none added)
- [ ] `npm test` / `npm run test:coverage` — all pass
- [ ] `npm run build` — succeeds
- [ ] `npm run test:e2e` (chromium) — passes (auth-gated specs may skip; note it)
- [ ] CI workflow green on the PR

## Review
- [ ] CodeRabbit run complete; every comment classified VALID/OPTIONAL/INVALID with justification (`CODERABBIT_PROTOCOL.md`)
- [ ] All VALID comments resolved; OPTIONAL triaged; INVALID answered
- [ ] Gates re-run green after review fixes

## Correctness & safety
- [ ] New behavior has tests (or a documented justification for the gap)
- [ ] No `any`, no dead code, no new ESLint warnings
- [ ] Security invariants intact (RLS, no client secrets, JWT verification, CORS, PGN cap, XSS-safe rendering — see `SECURITY.md`/`CONTEXT.md`)
- [ ] No schema/data-model change without an escalation decision logged
- [ ] No partial features / dead UI

## Hygiene
- [ ] `PROJECT_STATE.md`, `SPRINT_BACKLOG.md`, `DECISION_LOG.md` updated
- [ ] `LOOP_LOG.md` appended
- [ ] Docs (`CONTEXT.md`/`README.md`) updated if architecture/invariants shifted

## Approval
- [ ] Human approval obtained (merge itself is gated on the user unless explicitly delegated)
