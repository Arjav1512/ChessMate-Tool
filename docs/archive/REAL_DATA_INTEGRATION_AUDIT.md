# Real-Data Integration & End-to-End Production Audit

> Read-only audit of `prod/mistake-review-b4` (post-consolidation) against the production user journey. Authority re-read: System Design, Architecture (§2/§7/§10/§12/§22), PROJECT_STATE, IMPLEMENTATION_ROADMAP, DECISION_LOG. **No code changed.**

## Executive finding
The real pipeline **already exists** — PGN ingestion writes real `games`; the **Stockfish engine** (`lib/stockfish.ts`), the **analysis writers** (`BulkAnalysis.tsx` → `game_analysis_results`; `lib/moveAnalysis.ts` → `move_analysis`), and the **real read hooks** (`useWeaknessProfile`, `useMistakeReview` — both query real `games`/`move_analysis`/`game_analysis_results`) are all implemented. **The Ivory UI is simply wired to sample fixtures instead of these real sources, and there is no trigger to run the engine from the new shell.** So this is mostly a *connection* problem, not a *build-from-scratch* problem — with one real build: an Analysis-time engine run wired into the new screen.

---

## 1. End-to-end architecture diagram (current state)
```
                          ┌──────────────────────── EXISTS & REAL ───────────────────────────┐
 Import (Ivory) ─writes─► games (DB) ──read─► useGames (Ivory Library)  ✅ REAL
                              │
                              │  (no Ivory trigger ↯)        ┌─ lib/stockfish.ts  StockfishEngine  ✅ exists
                              ▼                               │
                     [ analysis run ] ◀───── BulkAnalysis.tsx ┘  ─writes─► move_analysis (per ply)  ✅ writer exists
                          ↯ NOT invoked from Ivory shell      └──────────► game_analysis_results    ✅ writer exists
                              │
                              ▼  reads (REAL hooks, but UNUSED by Ivory)
        move_analysis / game_analysis_results
            ├─ useWeaknessProfile  ✅ real read ── (Improve uses SAMPLE instead ↯)
            └─ useMistakeReview     ✅ real read ── (Review Mistakes uses SAMPLE instead ↯)

 ┌──────────────────────────── IVORY UI LAYER (what users see) ──────────────────────────────┐
 │ Dashboard      → sampleDashboard            ↯ disconnected                                  │
 │ Analysis       → sampleAnalysis (ignores :id, no engine, no writes)  ↯ disconnected         │
 │ Improve        → sampleImprove (+ real cm.improveQueue)  ↯ weakness data sample             │
 │ Review Mistakes→ sampleMistakes (+ real cm.improveQueue) ↯ live hook exists, unused         │
 │ Games/Import   → REAL (games table)  ✅                                                      │
 │ Progress       → PlaceholderPage  ❌ not built                                               │
 └─────────────────────────────────────────────────────────────────────────────────────────┘
   ↯ = disconnection between an existing real source and the Ivory screen
```

## 2. Data-flow diagram (target vs actual, per stage)
```
STAGE                         TARGET                         ACTUAL
Import PGN → DB           games.insert                   ✅ REAL (useImportGames)
DB → analysis selection  open game id → load that game   ⚠️ route passes :id, useAnalysis IGNORES it → sample
Stockfish run            engine on the game's plies      ❌ engine exists; NOT triggered from Ivory
→ move_analysis (write)  per-ply upsert                  ❌ writer exists (moveAnalysis.ts); not invoked from Ivory
→ game_analysis_results  per-game upsert                 ❌ writer exists (BulkAnalysis); not invoked from Ivory
move_analysis → weakness buildWeaknessProfile(real)      ✅ useWeaknessProfile reads real — ↯ Improve ignores it
weakness → Improve       live plan from real weaknesses  ⚠️ SAMPLE (composePlan on sampleRawWeaknesses)
→ Dashboard              real score/focus/weaknesses     ⚠️ SAMPLE (sampleDashboard)
→ Review Mistakes        real mistakes (move_analysis)   ⚠️ SAMPLE (sampleDetectedMistakes); useMistakeReview unused
→ Progress               trend over real history         ❌ NOT IMPLEMENTED (placeholder)
```

## 3. Every remaining sample-data dependency
| File | Feeds | Real replacement (exists?) |
|---|---|---|
| `features/analysis/sampleAnalysis.ts` (getSampleGame/Moves/TurningPoints, computeAccuracies) | Analysis | needs: load real game by id + run `stockfish.ts` + read `move_analysis` |
| `features/analysis/hooks.ts` `useAnalysis` (ignores `id`) | Analysis | rewrite to use the real game + engine |
| `features/improve/sampleImprove.ts` (sampleRawWeaknesses, sampleSkills, sampleMilestones, sampleFocusMeta) | Improve | `useWeaknessProfile` ✅ exists (skills/milestones need derivation) |
| `features/improve/mistakes/sampleMistakes.ts` (sampleDetectedMistakes, makeSampleGames) | Review Mistakes | `useMistakeReview` ✅ exists |
| `features/dashboard/sampleDashboard.ts` (score, ratingHistory, weaknesses, weeklyFocus, recentGames, coachSummary, roadmap) | Dashboard | derive from `useWeaknessProfile` + `game_analysis_results` aggregates; rating history has no real source yet |
| `features/games/sampleGames.ts` | Games (DEV fallback only) | already real in prod; sample is DEV-only |

## 4. Missing integrations
1. **Analysis ↔ real game + engine (keystone).** Load the selected game's PGN by `:id`; run `StockfishEngine.analyzePosition` progressively over its plies; surface eval/quality/turning-points; persist results. Reuse `BulkAnalysis`/`moveAnalysis` logic.
2. **An "Analyze" trigger** in the Library (or on opening a Pending game) to invoke the run for unanalyzed games.
3. **Improve → `useWeaknessProfile`** (replace `sampleRawWeaknesses`; map `weaknessProfile` → `WeaknessVM`).
4. **Review Mistakes → `useMistakeReview`** (replace `sampleDetectedMistakes`).
5. **Dashboard → real aggregates** (score/weaknesses/focus from `useWeaknessProfile` + `game_analysis_results`).
6. **Progress screen** (Phase 9) — trend over real `game_analysis_results` / `user_progress_snapshots`.
7. **Status truth in Library** — `StatusBadge` "Analyzed/Pending" already derives from `game_analysis_results` existence (✅), so it will become truthful once runs happen.

## 5. Missing database writes
- **No new write code is missing** — `move_analysis` and `game_analysis_results` writers exist (`moveAnalysis.ts`, `BulkAnalysis.tsx`). **What's missing is invoking them from the Ivory shell** (no analyze action). Persisted `opening`/`time_control`/analysis-status columns on `games` remain deferred (derived for v1) — additive migration, Phase 11.

## 6. Missing reads
- The Ivory **Analysis/Improve/Dashboard/Review-Mistakes** screens do not call the existing real read paths:
  - Analysis never loads the real game by `:id` or reads its `move_analysis`.
  - Improve never calls `useWeaknessProfile`.
  - Review Mistakes never calls `useMistakeReview`.
  - Dashboard never reads `game_analysis_results` aggregates.
- All four read hooks/queries exist and are correct; they are simply not consumed by the new UI.

## 7. Production blockers (ranked by severity)
| # | Blocker | Severity | Why |
|---|---|---|---|
| B1 | **Analysis not wired to real games + no engine run/writes from Ivory** | 🔴 Critical | Breaks the entire loop; nothing downstream can be real until games actually get analyzed via the new UI. |
| B2 | **Improve runs on sample weaknesses** | 🔴 Critical | The differentiator shows a fabricated plan to real users. |
| B3 | **Dashboard runs on sample** | 🟠 High | The home screen shows fake score/weaknesses/focus. |
| B4 | **Review Mistakes runs on sample** (live hook exists) | 🟠 High | Quick swap; low effort, high truth gain. |
| B5 | **Progress screen unbuilt** | 🟠 High | A primary improvement-loop surface is a placeholder. |
| B6 | **No "Analyze" trigger** for pending games in the Library | 🟠 High | Without it, imported games never get analyzed → B1 has no entry point. |
| B7 | **Settings/Profile placeholders** | 🟡 Med | Account management unreachable post-cutover (Phase 10). |
| B8 | **Cutover default-ON for `main`** | 🟡 Med | Must canary (default OFF) until B1–B5 land. |
| B9 | Rating-history has no real source; Improve "Time" axis & skills sampled | 🟡 Med | Some Dashboard/Improve viz stay derived/sample until a data source exists (Phase 11). |

## 8. Recommended implementation order
1. **B1 + B6 — Analysis on real games + an Analyze trigger** (the keystone; produces real `move_analysis`/`game_analysis_results`). *Unblocks everything below.*
2. **B4 — Review Mistakes → `useMistakeReview`** (smallest swap; immediate real value).
3. **B2 — Improve → `useWeaknessProfile`** (map to VMs; keep curated `lib/learning` catalog).
4. **B3 — Dashboard → real aggregates** (score/weaknesses/focus).
5. **B5 — Progress screen** (Phase 9 proper, on real `game_analysis_results`).
6. **B8 — set `main` flag default to canary**, then promote once B1–B5 verified.
7. **B7 (Settings/Profile, Phase 10), B9 (rating history / persisted columns, Phase 11)** — defer.

## 9. Estimated effort per blocker
| Blocker | Effort | Notes |
|---|---|---|
| B1 Analysis real + engine run | **L** | Engine orchestration in the new hook (reuse `stockfish.ts` + `BulkAnalysis`/`moveAnalysis` logic); progressive UI already exists; persist results. |
| B6 Analyze trigger | **S–M** | Button on pending games → invoke the run; status from `game_analysis_results`. |
| B4 Review Mistakes → live | **S** | Swap `sampleDetectedMistakes` → `useMistakeReview`; map to `ReviewMistakeVM`. |
| B2 Improve → live | **M** | Map `weaknessProfile` → `WeaknessVM` (reuse `lib/improve/mapping`); derive focus/milestones. |
| B3 Dashboard → live | **M** | Derive score/weaknesses/focus from real aggregates; rating-history stays sampled (B9). |
| B5 Progress screen | **M–L** | New screen + chart on real history (Phase 9). |
| B7 Settings/Profile | **M** | Phase 10. |
| B8 main canary default | **S** | Flip default for production cohort. |
| B9 rating history / persisted columns | **M–L** | Phase 11 (schema + source). |

## 10. Definition of production-ready (for `main` default)
A real authenticated user can:
1. **Import** a PGN → it appears in the Library (✅ today).
2. **Analyze** that game from the new UI → a real Stockfish run produces real `move_analysis`/`game_analysis_results` (status flips to "Analyzed"). **[B1+B6]**
3. See **Analysis** of *their* game (board, real eval/quality/turning-points), not a sample. **[B1]**
4. See **Review Mistakes** populated from *their* `move_analysis`. **[B4]**
5. See **Improve** show *their* real weaknesses → a real plan (Send-to-Improve already live). **[B2]**
6. See **Dashboard** reflect *their* real score/focus/weaknesses. **[B3]**
7. Reach **Progress** (real trend) and **Settings/Profile** (real, not placeholder). **[B5, B7]**
8. No screen renders sample/fixture data in production; `main` ships with a canary flag default until the above is verified; accessibility (30/30) and responsive behavior maintained.

Until items 2–6 hold, ChessMate is a **premium, accessible demo on fixtures** (except Games/Import). The **single highest-leverage unlock is B1 (+B6)** — wiring Analysis to real games and running the existing engine; every other screen's real data flows from the `move_analysis`/`game_analysis_results` it produces, via read hooks that already exist.

---
*Audit only — no code, branch, or PR.*
