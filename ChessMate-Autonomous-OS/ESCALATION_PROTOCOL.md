# Escalation Protocol

Stop and ask the user **before proceeding** when a decision is genuinely theirs to make.
Default to autonomy elsewhere.

## Triggers (any one → escalate)
1. **Product direction changes** — scope, positioning, what we build or for whom.
2. **Security tradeoffs** — anything that weakens a security invariant, or where the safe and
   convenient options diverge (e.g., `unsafe-eval`, relaxing RLS, broadening CORS).
3. **Data-model changes** — new/changed tables, columns, RLS policies, destructive migrations.
4. **Cost implications** — new paid services, materially higher API/compute/egress spend.
5. **Confidence < 80%** — you cannot determine the correct, non-breaking choice from the code,
   the docs, and sensible defaults.

Also escalate for: irreversible/outward-facing actions (deploys, deleting data, publishing),
and merges to `main` unless explicitly delegated.

## How to escalate
- Pause that work item (continue independent items if safe).
- State the decision crisply, the options, the tradeoffs, and a recommendation.
- Log it in `DECISION_LOG.md` as `E-n OPEN` with a sensible default if no answer.
- On answer: mark `E-n DECIDED`, record rationale and owner, and proceed.

## What does NOT need escalation
- Strictly-additive hardening with no tradeoff (e.g., adding CSP that needs no `eval`).
- Bug fixes, refactors, docs, tests, dependency bumps within range.
- Choices with an obvious, conventional default you can verify in the codebase.

When in doubt between "ask" and "proceed," ask only if an answer would change what you do next.
