# Archived project documents

Historical, point-in-time artifacts moved out of the repository root on
2026-07-08 (production-audit remediation, audit item L2). Nothing here is
maintained or authoritative — the living documents are indexed in
[`DOCUMENT_INDEX.md`](../../DOCUMENT_INDEX.md) at the root.

Contents:

- **Phase artifacts** — `PHASE_*`, `*_DISCOVERY.md`, `*_IMPLEMENTATION_PLAN.md`,
  `*_VISUAL_ARCHITECTURE.md`, `REVIEW_MISTAKES_*`: discovery/plan/report docs
  for shipped phases of the strangler rebuild.
- **2026-06 audit evidence** — `*_AUDIT.md`, `RELEASE_BLOCKERS.md`,
  `RELEASE_READINESS_REPORT.md`, `CRITICAL_BUGS.md`,
  `FINAL_RELEASE_READINESS_REPORT.md`: the ground-truth audits whose findings
  were absorbed into `CURRENT_PROJECT_STATE.md` and subsequently acted on.
- **Superseded planning docs** — backlogs, next-phase recommendations,
  stabilization plans, QA snapshots.
- **`ChessMate-Autonomous-OS/`** — the autonomous-agent operating procedure
  used during earlier development sprints; not part of the application.

Everything was moved with `git mv`, so `git log --follow <file>` preserves
full history. If a document turns out to be load-bearing, move it back and
re-list it in `DOCUMENT_INDEX.md`.
