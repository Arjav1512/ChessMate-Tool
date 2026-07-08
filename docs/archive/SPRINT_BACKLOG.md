# ChessMate Redesign — Sprint Backlog

> Living backlog for the Ivory redesign (strangler migration, Architecture §22). Status of every phase + the cross-phase debt/deferral queue. Pairs with `IMPLEMENTATION_ROADMAP.md` (plan) and `PROJECT_STATE.md` (snapshot).
> **Updated:** 2026-06-23 (Phase 5 merged).

## Phase status

| Phase | Title | Status | PR |
|---|---|---|---|
| 0 | Discovery + roadmap | ✅ Complete | — |
| 1 | Design Token Foundation | ✅ Complete | (in shell PR) |
| 2 | Core UI System | ✅ Complete | (in shell PR) |
| 3 | App Shell | ✅ Complete | (in shell PR) |
| 3.5 | Shell Compliance Remediation | ✅ Complete | #21 |
| 4 | Dashboard | ✅ Complete | #22 |
| 5 | Analysis Workspace | ✅ Complete | #23 |
| **6** | **Improve Hub** | ⏳ **Next** | see `PHASE_6_BACKLOG.md` |
| 7 | Game Library + Import | ⏳ Planned | — |
| 8 | Coach (standalone screen) | ⏳ Planned | — |
| 9 | Progress + Weaknesses | ⏳ Planned | — |
| 10 | Settings + Profile | ⏳ Planned | — |
| 11 | Production Hardening (data layer, server pipeline, cutover) | ⏳ Planned | — |

## Up next — Phase 6 (Improve Hub)
The differentiator (§9): weekly focus, skill radar, weakness categories, study plan, milestones; consumes the Phase-5 **Send-to-Improve** queue. Full breakdown in `PHASE_6_BACKLOG.md`.

## Cross-phase debt & deferrals queue

| Item | Origin | Target | Notes |
|---|---|---|---|
| Real client-Stockfish analysis runner (replace sample adapter) | P5 | P11 | swap behind `features/analysis/hooks.ts` |
| Persisted analysis (`analyses`/`moves`) + `move_analysis` taxonomy migration `excellent→best` | P5 | P11 | additive migration |
| `rating_history` / plan / milestone tables (replace dashboard + improve sample data) | P4/P6 | P11 | one adapter swap per feature |
| Server-side analysis pipeline (Edge Functions, jobs, pg_cron) | P0 decision #2 | post-v1 | deferred for v1 |
| `color-mix()` fallback for older browsers | P3.5 | pre-GA | confirm browser floor or precompute rgba |
| Sidebar "Collections" (saved smart-filters) | P3.5/§6 | P7 (Library) | currently omitted |
| Improve nav count badge + "Recent games" in ⌘K | P3 | P4/P7 (data) | data-dependent |
| Appearance controls (Accent/Board/Density) UI | P1/§5.10 | P10 (Settings) | `themeStore` ready |
| Analysis board click-to-move (interactive) | P5 | optional/post-v1 | §8 not required |
| Analysis-failed error state exercised end-to-end | P5 | P11 (real engine) | coded, not yet triggered |
| Legacy removal (`--cm-*`, legacy components, dev `?` guards) | all | P11 cutover | after 100% flag flip |
| Hosting deviation (Vercel vs Architecture §21 Netlify) | P0 decision | accepted | documented |

## Standing quality bar (every phase)
Strangler-safe (flag-gated, legacy untouched) · typecheck/lint/unit/e2e/build green · CI `accessibility` (axe) green · visual review gate before PR · CodeRabbit resolved · no merge without approval.
