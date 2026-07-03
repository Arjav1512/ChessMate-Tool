# DOCUMENT_INDEX.md

> Classification of every markdown document in the repository, to make
> `CURRENT_PROJECT_STATE.md` the single source of truth. **No files were moved or
> deleted** — this is classification + recommendation only.

**Date:** 2026-06-26. **Branch:** `feature/stabilization-pr1-landing`.

## Classification key

- **Canonical** — authoritative, keep at root, actively maintained.
- **Reference** — still useful as background/spec/standard; keep (root or `docs/`).
- **Superseded** — replaced by `CURRENT_PROJECT_STATE.md` or by newer docs; safe to
  archive.
- **Archive** — historical phase artifact (discovery/plan/report) with no ongoing
  authority; move to `docs/archive/`.

---

## Canonical (keep at root, maintain)

| Document | Why |
|---|---|
| `CURRENT_PROJECT_STATE.md` | The single source of truth (this audit's output). |
| `DOCUMENT_INDEX.md` | This index. |
| `README.md` | Repo entry point / setup. |
| `CONTRIBUTING.md` | Contributor workflow. |
| `SECURITY.md` | Security policy / disclosure. |

## Reference (keep; background, spec, or standards)

| Document | Why |
|---|---|
| `CHESSMATE_SYSTEM_DESIGN.md` | Locked Ivory design spec (§3 IA, §5 tokens, §10 responsive) — still the design contract the shell is built against. |
| `CHESSMATE_IMPLEMENTATION_ARCHITECTURE.md` | Locked architecture spec (§22 strangler cutover, §23 flags) — still governs the migration. |
| `MONITORING.md` | Observability runbook (Sentry, smoke test, deploy-verify). |
| `PRODUCT.md` | Product framing / vision (dated but still the "why"). |
| `DESIGN.md` | Early design intent (Reference; largely realized in the spec docs). |
| `ARCHITECTURE_AUDIT.md` | Ground-truth audit — feeds the canonical doc; keep as evidence. |
| `ROUTING_AUDIT.md` | Ground-truth audit evidence. |
| `UI_UX_AUDIT.md` | Ground-truth audit evidence. |
| `DESIGN_SYSTEM_AUDIT.md` | Ground-truth audit evidence. |
| `DATA_FLOW_AUDIT.md` | Ground-truth audit evidence (most important for §B work). |
| `GSTACK_BRANCH_AUDIT.md` | Ground-truth audit evidence. |
| `TECH_DEBT_AUDIT.md` | Ground-truth audit evidence. |
| `RELEASE_BLOCKERS.md` | Ground-truth audit evidence. |
| `NEXT_IMPLEMENTATION_PLAN.md` | Forward plan; folded into §10 of canonical — keep as the detailed PR-level companion. |

> The 9 audit docs above (`*_AUDIT.md`, `RELEASE_BLOCKERS.md`,
> `NEXT_IMPLEMENTATION_PLAN.md`) are the verified basis of the canonical doc. Keep
> them as Reference; once their findings are fully absorbed and acted on, they may
> be moved to `docs/audit-2026-06/`.

## Superseded (replaced by CURRENT_PROJECT_STATE.md — recommend `docs/archive/`)

| Document | Superseded by |
|---|---|
| `PROJECT_STATE.md` | `CURRENT_PROJECT_STATE.md` |
| `CONTEXT.md` | `CURRENT_PROJECT_STATE.md` §1–2 |
| `IMPLEMENTATION_ROADMAP.md` | `CURRENT_PROJECT_STATE.md` §10 |
| `NEXT_PHASE_RECOMMENDATION.md` | `CURRENT_PROJECT_STATE.md` §10 |
| `SPRINT_BACKLOG.md` | `CURRENT_PROJECT_STATE.md` §10 |
| `PHASE_6_BACKLOG.md` | `CURRENT_PROJECT_STATE.md` §10 |
| `DECISION_LOG.md` | Reference-history; superseded as a live doc (keep in archive for rationale). |
| `LOOP_LOG.md` | Autonomous-OS run log; superseded. |
| `BRANCH_CONSOLIDATION_PLAN.md` | `GSTACK_BRANCH_AUDIT.md` + §7 |
| `PHASE_11_CUTOVER_ANALYSIS.md` | `CURRENT_PROJECT_STATE.md` §6/§10 Phase C (re-do at cutover time). |
| `PRODUCTION_STABILIZATION_AUDIT.md` | This audit set (more current). |
| `PRODUCTION_STABILIZATION_IMPLEMENTATION_PLAN.md` | `NEXT_IMPLEMENTATION_PLAN.md` |
| `REAL_DATA_INTEGRATION_AUDIT.md` | `DATA_FLOW_AUDIT.md` |
| `RELEASE_READINESS_REPORT.md` | `RELEASE_BLOCKERS.md` + §9 |
| `DESIGN_COMPLIANCE_AUDIT.md` | `DESIGN_SYSTEM_AUDIT.md` |
| `DESIGN_SIMPLIFICATION_REVIEW.md` | `DESIGN_SYSTEM_AUDIT.md` / §6 |
| `UI_UX_REMEDIATION_PLAN.md` | `UI_UX_AUDIT.md` |
| `VISUAL_QA_REPORT.md` | `UI_UX_AUDIT.md` (re-run QA fresh per release). |

## Archive (historical phase artifacts — recommend `docs/archive/phases/`)

Per-phase discovery/plan/report/architecture docs. Their work has shipped; they
carry no ongoing authority. Keep for history only.

| Document |
|---|
| `DASHBOARD_IMPLEMENTATION_PLAN.md` |
| `ANALYSIS_WORKSPACE_DISCOVERY.md` |
| `ANALYSIS_WORKSPACE_VISUAL_ARCHITECTURE.md` |
| `IMPROVE_HUB_VISUAL_ARCHITECTURE.md` |
| `PHASE_5_IMPLEMENTATION_PLAN.md` |
| `PHASE_6_DISCOVERY.md` |
| `PHASE_6_IMPLEMENTATION_PLAN.md` |
| `PHASE_7_DISCOVERY.md` |
| `PHASE_7_IMPLEMENTATION_PLAN.md` |
| `PHASE_7_VISUAL_ARCHITECTURE.md` |
| `PHASE_8A_PRODUCT_SIMPLIFICATION_PLAN.md` |
| `PHASE_8A_IMPLEMENTATION_REPORT.md` |
| `PHASE_8A1_REFINEMENT_REPORT.md` |
| `REVIEW_MISTAKES_DISCOVERY.md` |
| `REVIEW_MISTAKES_IMPLEMENTATION_PLAN.md` |
| `REVIEW_MISTAKES_VISUAL_ARCHITECTURE.md` |
| `REVIEW_MISTAKES_POST_MERGE_REPORT.md` |

## Separate subproject (out of scope — leave as-is)

`ChessMate-Autonomous-OS/*.md` (AUTONOMOUS_OPERATING_SYSTEM, CLAUDE,
CODERABBIT_PROTOCOL, DECISION_LOG, DESIGN_SYSTEM_AUDIT, ESCALATION_PROTOCOL,
LOOP_LOG, MERGE_CHECKLIST, PR_PROTOCOL, PRODUCT_ACCEPTANCE_CRITERIA, …) belong to
the autonomous-OS tooling, not the app. Not reclassified here. Treat as that
subproject's own Reference set.

---

## Recommended target structure (proposal — not executed)

```
/                         README, CONTRIBUTING, SECURITY,
                          CURRENT_PROJECT_STATE.md, DOCUMENT_INDEX.md
/docs/spec/               CHESSMATE_SYSTEM_DESIGN.md, CHESSMATE_IMPLEMENTATION_ARCHITECTURE.md,
                          PRODUCT.md, DESIGN.md, MONITORING.md
/docs/audit-2026-06/      the 9 ground-truth audit docs + NEXT_IMPLEMENTATION_PLAN.md
/docs/archive/            superseded state/roadmap/audit docs
/docs/archive/phases/     all per-phase discovery/plan/report/architecture docs
```

**Net effect:** root shrinks from ~45 markdown files to ~5 canonical + a clean
`docs/` tree. One document — `CURRENT_PROJECT_STATE.md` — is the authoritative
reference for every future session.

**Reminder:** moving files is a separate, approved task. This document only
classifies and recommends.
