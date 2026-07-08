# DOCUMENT_INDEX.md

> Index of every markdown document in the repository. The archive move this
> index previously *recommended* was executed on 2026-07-08 (production-audit
> remediation): historical phase/audit/process artifacts now live in
> `docs/archive/` and the root holds only living documents.

**Date:** 2026-07-08. **Branch:** `fix/production-audit-remediation`.

## Living documents (root)

| Document | Role |
|---|---|
| `README.md` | Repo entry point / setup. |
| `CONTRIBUTING.md` | Contributor workflow. |
| `SECURITY.md` | Security policy / disclosure. |
| `LICENSE` | MIT license for ChessMate's own code. |
| `THIRD_PARTY_LICENSES.md` | Distributed third-party components (Stockfish GPL-3.0, GSAP) and their obligations. |
| `MONITORING.md` | Observability runbook (Sentry, smoke test, deploy-verify). |
| `CURRENT_PROJECT_STATE.md` | The single source of truth for project state. |
| `PROJECT_STATE.md` | Older state snapshot — superseded by `CURRENT_PROJECT_STATE.md`; retained at root until its remaining content is absorbed. |
| `DECISION_LOG.md` | Decision rationale history. |
| `DOCUMENT_INDEX.md` | This index. |
| `CHESSMATE_SYSTEM_DESIGN.md` | Locked Ivory design spec (§3 IA, §5 tokens, §10 responsive) — the design contract the shell is built against; cited by `§` throughout the code. |
| `CHESSMATE_IMPLEMENTATION_ARCHITECTURE.md` | Locked architecture spec (§22 strangler cutover, §23 flags) — governs the migration; cited throughout the code. |
| `IMPLEMENTATION_ROADMAP.md` | Spec-vs-code divergence roadmap for the strangler rebuild. |
| `PRODUCT.md` | Product framing / vision. |
| `DESIGN.md` | Early design intent (largely realized in the spec docs). |
| `CONTEXT.md` | Repository-level context for AI agents. |

## Archived (docs/archive/)

Everything else — per-phase discovery/plan/report/architecture docs, the
2026-06 audit evidence set, superseded state/roadmap docs, QA reports, and the
`ChessMate-Autonomous-OS/` process tooling — is preserved verbatim under
`docs/archive/`. See `docs/archive/README.md` for the inventory. Nothing was
deleted; `git log --follow` traces every file's history across the move.

**Rule of thumb:** a new document starts at root only if it will be actively
maintained. Point-in-time artifacts (audits, phase reports, QA snapshots) are
born in `docs/archive/` — or better, land their findings in
`CURRENT_PROJECT_STATE.md` and the issue tracker instead of becoming files.
