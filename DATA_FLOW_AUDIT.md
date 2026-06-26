# DATA_FLOW_AUDIT.md

**Mode:** Ground Truth. **Date:** 2026-06-26. **Branch:** `feature/stabilization-pr1-landing`.
Traced from the data hooks of each Ivory screen, verified against Supabase queries
in source. This is the single most important audit for release readiness.

---

## 1. The intended improvement loop (System Design §3)

```
Landing → Auth → Import games → Game Library → Analysis (Stockfish + coach)
   → Improve (weaknesses → plan) → Dashboard (score/focus) → back to Analysis
```

## 2. What is actually wired to real data — screen by screen

| Stage | Source file | Real or sample? | Detail |
|---|---|---|---|
| **Auth** | `contexts/AuthContext`, `lib/supabase` | **REAL** | Supabase auth, password reset, recovery. |
| **Import** | `features/games/ImportPage.tsx` | **REAL** | Parses pasted/uploaded PGN, previews, inserts into `games`. Chess.com/Lichess connect is "soon" (disabled). |
| **Game Library** | `features/games/useGames.ts` | **REAL** | Reads `games` for `user.id`, paginated (PAGE_SIZE 50), derives "Analyzed" from `game_analysis_results`. Sample **only** in the DEV `?shell` preview (`!user && DEV`). |
| **Analysis** | `features/analysis/hooks.ts` | **REAL (Phase 8B)** | For an authed user + real `gameId`: loads `games`, reads `move_analysis`; if none, runs the Stockfish pipeline and persists `move_analysis` + a `game_analysis_results` summary. Sample **only** for `id==='sample'` or DEV-unauth. |
| **Improve** | `features/improve/hooks.ts` | **MOSTLY SAMPLE** | Weaknesses, skills, milestones come from `sampleImprove`. The *plan* is computed by the real pure `composePlan` from those sample weaknesses **plus** the live Send-to-Improve queue (localStorage). So tagged items from Analysis appear, but the weakness inputs are fabricated. |
| **Dashboard** | `features/dashboard/hooks.ts` | **100% SAMPLE** | All 8 hooks resolve `sampleDashboard` via React Query (`queryFn: sample(...)`, `staleTime: Infinity`). **No Supabase call anywhere in the dashboard.** |
| Coach / Weaknesses / Progress / Settings / Profile | — | n/a | Coming-Soon placeholders. |

## 3. Where the loop disconnects

**Analysis writes real data, but nothing downstream reads it.**

- Analysis persists `move_analysis` (per-ply eval/cp-loss/classification/phase/
  motifs) and `game_analysis_results` (accuracy, blunders, etc.) for real games.
- **Dashboard** ignores all of it. Improvement score, weekly focus, rating
  history, top weaknesses, recent games, coach summary, roadmap — every tile is a
  hardcoded sample value. An authenticated user who imports and analyzes 50 games
  still sees "Week 7 · 84% last game · 5d streak."
- **Improve** ignores the user's real `move_analysis` weaknesses; it composes a
  plan from `sampleRawWeaknesses`. Only the Send-to-Improve queue (a localStorage
  bridge from Analysis) carries any real signal across.

So the loop is **real on the inbound half** (Import → Library → Analysis →
persistence) and **fabricated on the feedback half** (weaknesses → plan →
dashboard). The product's core promise — "track your improvement over time" — is
not backed by data in the default shell.

## 4. The cruel irony: the real aggregation already exists (in the legacy app)

The legacy app and shared hooks already compute the real versions:
- `src/lib/weaknessProfile.ts` + `hooks/useWeaknessProfile.ts` derive a true
  weakness profile from `move_analysis`.
- `hooks/useMistakeReview.ts` builds a real mistake-review feed.
- `components/stats/StatsDashboard.tsx` + `ProgressBar.tsx` read real
  `user_statistics` (maintained by a Supabase trigger) and `game_analysis_results`.
- `supabase/migrations` include a `user_statistics` trigger and
  `user_progress_snapshots`.

The Ivory Dashboard and Improve hub were rebuilt with sample adapters **instead of
reusing this working real-data logic**. The hooks are written so "the swap to live
Supabase reads is a one-file change" (their own comments), but that swap has not
been done.

## 5. Data sources inventory

| Table | Read by | Written by |
|---|---|---|
| `games` | `useGames`, `useAnalysis`, legacy `GameList`, ImportPage | ImportPage |
| `move_analysis` | `useAnalysis`, `useWeaknessProfile`, `useMistakeReview`, `lib/moveAnalysis` | `useAnalysis` (Phase 8B), legacy `BulkAnalysis` |
| `game_analysis_results` | `useGames`, `useAnalysis`, stats | `useAnalysis`, legacy bulk |
| `user_statistics` | legacy `StatsDashboard`/`ProgressBar` | DB trigger |
| `user_progress_snapshots` | (1 ref) | — |
| `profiles` | auth/profile | signUp/profile |

Client-side bridges: **Send-to-Improve queue** (`features/improve/queue` +
`features/analysis/sendToImprove`) passes tagged moves from Analysis to Improve
via localStorage — the only cross-screen real-data path in the Ivory app.

## 6. Sample-data modules still in the tree

`features/dashboard/sampleDashboard.ts`, `features/games/sampleGames.ts`,
`features/analysis/sampleAnalysis.ts`, `features/improve/sampleImprove.ts`,
`features/improve/mistakes/sampleMistakes.ts`, `lib/sampleData.ts`.

Games and Analysis use theirs only as a DEV-preview fallback. Dashboard and
Improve use theirs **as the production source**.

## 7. Net assessment

- **Trustworthy in production:** Auth, Import, Library, single-game Analysis.
- **Fabricated in production:** Dashboard (entirely), Improve weaknesses/skills/
  milestones (the plan is partly real via the queue).
- **Highest-value next work:** wire Dashboard + Improve to the real aggregates
  that already exist for the legacy screens. This is the difference between a demo
  and a product.
