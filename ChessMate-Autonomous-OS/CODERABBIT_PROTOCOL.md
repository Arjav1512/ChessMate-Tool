# CodeRabbit Protocol

How automated review comments (CodeRabbit and similar) are triaged and resolved.

## Classify every comment
For each comment, reply with one classification + a one-line justification:

| Class | Meaning | Action |
|---|---|---|
| **VALID** | Correct and worth fixing now | Fix in this PR, then reply resolving it |
| **OPTIONAL** | Reasonable but non-blocking (style/nit/possible-future) | Apply if cheap & safe, else log as follow-up in `SPRINT_BACKLOG.md` |
| **INVALID** | Wrong, not applicable, or conflicts with an invariant/decision | Reply explaining why; do not change code |

## Rules
- **Never blanket-accept or blanket-dismiss.** Each comment gets reasoned treatment.
- A VALID security/correctness comment is blocking — it must be resolved before MERGE_READY.
- If a comment proposes something that violates a `SECURITY.md`/`CONTEXT.md` invariant or a logged
  decision, it's INVALID — cite the invariant/decision.
- If a fix would trip an escalation trigger (security tradeoff, data model, cost), escalate rather
  than silently applying.
- After applying fixes, **re-run all quality gates** (`MERGE_CHECKLIST.md`) before marking resolved.
- Summarize the triage in the PR thread: counts of VALID/OPTIONAL/INVALID and what changed.

## Loop
Comment → classify → (fix | defer | rebut) → re-verify → resolve → repeat until the thread is clean.
