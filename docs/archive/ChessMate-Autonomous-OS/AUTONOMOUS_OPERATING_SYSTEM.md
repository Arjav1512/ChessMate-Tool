# Autonomous Operating System

The governance loop the engineering system runs under. The goal: ship production-grade
change autonomously, stopping only at genuine decision gates.

## State machine

```text
VISION ─► ROADMAP ─► SPRINT ─► IMPLEMENT ─► VERIFY ─► PR ─► REVIEW ─► MERGE_READY ─► RELEASE
   ▲                                                                                    │
   └──────────────────────── learnings feed back into VISION/ROADMAP ◄─────────────────┘
```

| State | What happens | Source of truth |
|---|---|---|
| VISION | Mission, users, positioning, success metrics | `PRODUCT_VISION.md` |
| ROADMAP | Prioritized findings → sprints | `SPRINT_BACKLOG.md`, `PRODUCTION_SCORECARD.md` |
| SPRINT | A bounded, exit-criteria'd batch of items | `SPRINT_BACKLOG.md` |
| IMPLEMENT | Branch + code the items | `PR_PROTOCOL.md` |
| VERIFY | typecheck · lint · unit(+coverage) · build · e2e | `MERGE_CHECKLIST.md` |
| PR | Open PR with evidence | `PR_PROTOCOL.md` |
| REVIEW | CodeRabbit + automated review; resolve comments | `CODERABBIT_PROTOCOL.md` |
| MERGE_READY | All gates green, review clean, approval criteria met | `MERGE_CHECKLIST.md` |
| RELEASE | Tag, deploy, monitor | `RELEASE_PROTOCOL.md` |

## Operating principles

1. **Autonomy within governance.** Proceed without asking when confidence ≥ 80% and no
   escalation trigger fires. Otherwise stop — see `ESCALATION_PROTOCOL.md`.
2. **Evidence over assertion.** Every state transition is backed by command output, not claims.
   Report failures honestly with the output.
3. **No partial features.** Nothing half-wired reaches the release path. Parallel/experimental
   work lives on its own branch until it can land cleanly.
4. **Smallest safe change.** Match surrounding code; don't refactor opportunistically inside a fix.
5. **Update the OS.** After each loop, update `PROJECT_STATE.md`, `DECISION_LOG.md`,
   `SPRINT_BACKLOG.md`, and append to `LOOP_LOG.md`.
6. **Security/data/cost decisions are gates,** not judgment calls — escalate.

## The loop (per sprint item or batch)

1. Select the next backlog item(s) by priority.
2. Gather facts that determine a *correct, non-breaking* implementation (read the code, not just the issue).
3. Implement.
4. VERIFY locally (all gates).
5. Fix failures automatically; re-verify.
6. Commit (focused, conventional message).
7. Push; open/refresh PR with evidence.
8. Await review; classify & resolve comments (`CODERABBIT_PROTOCOL.md`).
9. Re-verify; update OS docs; append to `LOOP_LOG.md`.
10. Repeat until the sprint's exit criteria are met → MERGE_READY.
