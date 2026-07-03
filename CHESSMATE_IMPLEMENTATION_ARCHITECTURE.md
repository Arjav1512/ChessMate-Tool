# ChessMate — Implementation Architecture

> **Status:** Final engineering blueprint. Derived entirely from `CHESSMATE_SYSTEM_DESIGN.md` (the approved design source of truth). This document defines **how** to build ChessMate; it makes **no** product, UI, IA, or design decisions. Where the design doc speaks (tokens, screens, components, IA, copy), it wins — this doc never overrides it.
>
> **Stack:** React 18 + TypeScript + Vite · TanStack Query + Zustand · Tailwind (token-bound) · Supabase (Postgres, Auth, Storage, Edge Functions, Realtime) · Stockfish (WASM, client + server worker) · Gemini (server-only, AI Coach) · Netlify (hosting + CI/CD).
>
> **Fidelity target:** 90%+ implementable without further product decisions.

---

## 1. Executive Summary

**Product purpose.** ChessMate is a Personal Chess Improvement System that converts a player's own games into understanding, a personalized plan, and visible progress. Not a chatbot, engine viewer, PGN reader, or analytics dashboard (per System Design §1).

**Product loop.** `Import → Analyze → Understand → Learn → Improve → Repeat`. Every architectural component exists to advance this loop.

**Engineering philosophy.**
1. **Design doc is law.** Tokens, components, screens, IA, and the "Coach is secondary / Analysis is default / never reinvent the board / improvement over statistics" rules (System Design §14) are compile-time-binding constraints.
2. **Server owns truth; client owns interaction.** Analysis, classification, weakness detection, coaching, and progress math run server-side (deterministic, auditable). The client renders and navigates.
3. **Typed end-to-end.** One `@chessmate/types` package shared by frontend, Edge Functions, and DB-generated types. No `any` at boundaries.
4. **Deterministic before generative.** Stockfish + rule-based classification/weakness detection are the spine; Gemini only *explains* already-computed facts (minimizes hallucination).
5. **Feature-sliced, reuse-first.** Compose from the approved component library before creating anything new (System Design §14.4).
6. **Every data surface ships four states** (loading/empty/error/success) — enforced, not optional.

**Relationship to System Design.** This file references the design doc by section (e.g. "tokens §5", "Analysis §8"). If a conflict is found, the design doc is authoritative and this file must be corrected.

---

## 2. Product Architecture

### 2.1 System overview
```
┌────────────────────────────────────────────────────────────────────┐
│  CLIENT (React/Vite SPA on Netlify CDN)                              │
│  app shell · routes · TanStack Query cache · Zustand UI state        │
│  Stockfish WASM (interactive re-analysis) · Board/Chart render       │
└───────────────┬───────────────────────────────┬──────────────────────┘
                │ HTTPS (supabase-js, JWT)        │ Realtime (WS)
                ▼                                 ▼
┌────────────────────────────────────────────────────────────────────┐
│  SUPABASE                                                            │
│  Auth (JWT) · Postgres (+RLS) · Storage (PGN/avatars) · Realtime     │
│  Edge Functions (Deno):                                              │
│    import-games · run-analysis(orchestrator) · classify-moves        │
│    detect-weaknesses · build-plan · coach-respond · recompute-progress│
│  pg_cron + job queue table (analysis_jobs)                           │
└───────┬───────────────────────────┬───────────────────┬──────────────┘
        │                           │                   │
        ▼                           ▼                   ▼
 ┌─────────────┐          ┌──────────────────┐   ┌──────────────┐
 │ Stockfish    │          │ Gemini API        │   │ Chess.com /  │
 │ worker(server│          │ (server-only key) │   │ Lichess APIs │
 │ WASM/native) │          │ Coach explanations│   │ game import  │
 └─────────────┘          └──────────────────┘   └──────────────┘
```

### 2.2 Subsystems
- **Frontend.** SPA; renders approved screens; owns navigation, interactive board stepping, optional client-side Stockfish for "what-if" lines. No business math beyond display formatting.
- **Backend (Supabase).** System of record; auth + RLS; Edge Functions host all pipelines; Realtime pushes job status to the client.
- **Analysis Engine.** Server Stockfish worker → per-move eval → rule-based move classification (Brilliant→Blunder thresholds).
- **AI Coach.** Gemini, server-only, fed *only* structured facts already in the DB (eval deltas, classifications, weakness rows). Explains; never computes evals or invents lines.
- **Learning System.** Maps detected weaknesses → learning objectives → ordered training plan → sessions (System Design §9).
- **Progress Tracking.** Rating history, accuracy trend, weakness-frequency trend, milestones; pure functions over historical rows.
- **Import Pipeline.** PGN paste/upload + platform sync → parse → dedupe → persist `games` → enqueue analysis.

### 2.3 Core data flow
```
User → Import → Parse/Persist(games) → enqueue(analysis_jobs)
   → Stockfish eval(moves) → Classify(moves) → Detect weaknesses
   → Update weakness trends → Build/refresh improvement_plan
   → (on demand) Coach insights → Recompute progress/milestones
   → Realtime status → Client renders Dashboard/Analysis/Improve
```

---

## 3. Complete User Journey Maps

### 3.1 New user
| Step | Entry | Action | Outcome | Success criteria |
|---|---|---|---|---|
| Signup | Landing/`/login` | Email/OAuth | `profiles` row created, JWT issued | Authenticated, lands on Import |
| Import | `/games/import` (forced first run) | Paste PGN / connect platform | `games` rows + `analysis_jobs` enqueued | ≥1 game queued; status visible |
| Analyze (async) | background | pipeline runs | `analyses`,`moves`,`weaknesses` populated | First analysis done <30s/game (§18) |
| Dashboard | `/dashboard` | view standing | Score/rating/weaknesses/focus render | User can name #1 weakness + start action ≤1 click (§7) |
| Improve | `/improve` from focus CTA | start session | training session begins | Insight→action path works (§9) |

### 3.2 Returning user
`/dashboard` (momentum + recommended focus) → `/analysis/:id` (understand a flagged game) → `/improve` (act on the linked weakness). Entry = root redirect to `/dashboard`. Success: ≤2 navigations from open to a concrete training action.

### 3.3 Power user
`/games` (filter "losses to review" collection) → `/analysis/:id` (step turning points, send mistake to Improve) → `/weaknesses` (rank by rating impact, open trend) → `/coach` (guided review of a motif). Success: can triage many games quickly (keyboard + `⌘K`), and Coach always returns them to the originating context.

---

## 4. Route Architecture

SPA routes (React Router). Every route declares a TanStack Query loader contract and all four states. Auth guard wraps all except `/login`.

| Route | Purpose | Key components (§5) | Data (queries) | Loading | Empty | Error |
|---|---|---|---|---|---|---|
| `/login` | Auth | AuthForm, Button, Input | — | button spinner | — | inline auth error |
| `/dashboard` | Orientation+momentum | ScoreRing, RatingChart, WeaknessCard, FocusCard, CoachCard, GameRow, RoadmapTimeline | `useImprovementScore`,`useRatingHistory`,`useTopWeaknesses`,`useWeeklyFocus`,`useCoachSummary`,`useRecentGames`,`useRoadmap` | skeletons per card | onboarding focus → import | per-card Retry |
| `/games` | Library | QuickInsightStrip, FilterToolbar, GameTable/GameCardList, Collections | `useGames(filters)`,`useLibraryInsights`,`useCollections` | table skeleton rows | "Import your first game" | Retry banner |
| `/games/import` | Import | ImportSourcePicker, PgnDropzone, ParsedPreviewList, Toast | `useImportPreview`,`useConnectedAccounts` | parse spinner | source picker | parse error w/ fix |
| `/games/:id` | Game summary (pre/post analysis) | GameHeader, BoardContainer(mini), StatusBadge | `useGame(id)`,`useAnalysisStatus(id)` | skeleton | n/a | not-found/Retry |
| `/analysis/:id` | Analysis Workspace (§8) | BoardContainer, EvalBar, EvalTimeline, Tabs, InsightCard, CoachCard, MoveList, BoardControls | `useGame`,`useAnalysis`,`useMoves`,`useCoachForMove` | board paints from PGN; panel skeleton | clean-game positive state | analysis-failed + Retry |
| `/improve` | Improve Hub (§9) | FocusCard(hero), RadarChart, WeaknessCategoryCard, StudyPlanRow, MilestoneTimeline, SegmentedControl | `useWeaknessProfile`,`useSkillProfile`,`useStudyPlan`,`useMilestones`,`useWeeklyFocus` | skeletons | "Analyze games to build your plan" | Retry |
| `/weaknesses` | Weakness Profile | MetricCard, RatingChart, RadarChart, WeaknessCard(full), Sparkline | `useWeaknessProfile`,`useSkillProfile`,`useRatingHistory` | skeletons | empty until N games | Retry |
| `/progress` | Progress Tracking | RatingChart, MetricCard, SegmentedControl, ProgressBar, MilestoneTimeline | `useRatingHistory`,`useAccuracyTrend`,`usePhaseAccuracy`,`useMilestones` | skeletons | empty illustration | Retry |
| `/coach` | Coach (peer) | CoachThread, InsightCard, BoardContainer(mini), Input | `useCoachSession`,`useCoachContext` | typing skeleton | prompt suggestions | AI-failure fallback |
| `/settings` | Account/prefs/appearance | FormRow, Input, Toggle, SegmentedControl, Dropdown | `useProfile`,`useConnectedAccounts`,`usePreferences` | skeleton | — | save error toast |
| `/profile` | Identity/history | Avatar, MetricCard, RatingChart, MilestoneTimeline | `useProfile`,`useRatingHistory`,`useMilestones` | skeleton | — | Retry |

Redirects: `/` → `/dashboard` (auth) or `/login`; first-run forces `/games/import`.

---

## 5. Screen-to-Component Mapping

```
AppShell
├── Sidebar (desktop) / BottomTabBar (mobile)
├── CommandMenu (⌘K)
└── <RouteOutlet>

/dashboard
├── GreetingBar (Button:primary "Continue improving", Button:secondary "Import")
├── Row1
│   ├── ImprovementScoreCard ─ ScoreRing + MetricCard×2
│   └── RatingTrendCard ─ SegmentedControl + RatingChart
├── Row2
│   ├── BiggestWeaknessesCard ─ WeaknessCard(compact)×3
│   └── FocusCard (hero) ─ Button:primary
└── Row3
    ├── RecentlyAnalyzedCard ─ GameRow(compact)×5
    └── RightStack ─ CoachCard + RoadmapTimeline

/analysis/:id
├── BoardColumn
│   ├── PlayerBar(top) ─ Avatar, mono rating, Clock
│   ├── BoardStage ─ EvalBar + BoardContainer
│   ├── PlayerBar(bottom)
│   ├── BoardControls (⏮ ‹ › ⏭, Flip)
│   └── EvalTimelineCard ─ EvalTimeline
└── AnalysisPanel
    ├── Tabs [Analysis* | Coach | Lines]   (* default)
    ├── AccuracySummary ─ MetricCard×2
    ├── MoveQualityCounts ─ Chip×n
    ├── InsightCard (default content)
    ├── CoachCard (subordinate note)
    └── MoveList

/improve
├── Header
├── Row1 ─ FocusCard(hero, Button:primary) + SkillProfileCard(RadarChart)
├── WeaknessProfile ─ SegmentedControl + WeaknessCategoryCard×4 (grid)
└── Row3 ─ StudyPlanCard(StudyPlanRow×n) + MilestonesCard(MilestoneTimeline)

/games
├── Header (Button:primary "Import PGN", Button:secondary "Connect…")
├── QuickInsightStrip ─ MetricCard×3
├── FilterToolbar ─ Search + SegmentedControl + Dropdown×2 + SortDropdown
└── GameTable (desktop) / GameCardList (mobile) ─ GameRow×n
```
Full trees for `/weaknesses`, `/progress`, `/coach`, `/settings`, `/profile` follow the same compose-from-§6 rule; see System Design §4 for required sections.

---

## 6. Frontend Folder Structure

Feature-sliced. Shared primitives in `components/ui`; domain logic in `features/*`.

```
src/
├── main.tsx                      # entry, providers (Query, Router, Theme)
├── App.tsx                       # AppShell + route table
├── routes/                       # thin route files → feature pages
│   ├── dashboard.tsx  games.tsx  games.import.tsx  games.$id.tsx
│   ├── analysis.$id.tsx  improve.tsx  weaknesses.tsx  progress.tsx
│   └── coach.tsx  settings.tsx  profile.tsx  login.tsx
├── features/
│   ├── dashboard/   (components/ hooks/ index.ts)
│   ├── games/       (GameTable, GameCardList, GameRow, FilterToolbar, Collections)
│   ├── import/      (PgnDropzone, ParsedPreviewList, ImportSourcePicker)
│   ├── analysis/    (BoardContainer, EvalBar, EvalTimeline, MoveList, InsightCard, useStepper, useStockfishClient)
│   ├── improve/     (FocusCard, WeaknessCategoryCard, StudyPlanRow, MilestoneTimeline)
│   ├── weaknesses/  progress/  coach/  settings/  profile/
├── components/
│   ├── ui/                       # approved primitives (Button, Input, Card, MetricCard,
│   │                             #   Badge, Chip, Tabs, SegmentedControl, Dropdown, Dialog,
│   │                             #   Sheet, Toast, ProgressBar, Avatar, Skeleton, EmptyState, ErrorState)
│   ├── charts/                   # ScoreRing, LineChart(RatingChart), RadarChart, Sparkline, EvalBar
│   ├── nav/                      # Sidebar, BottomTabBar, CommandMenu, Search
│   └── coach/                    # CoachCard, CoachThread
├── hooks/                        # cross-feature (useMediaQuery, useReducedMotion, useHotkeys)
├── services/                     # supabase client, api wrappers (games, analysis, coach, progress)
├── lib/                          # chess (pgn parse, SAN, FEN), classification thresholds, formatters
├── stores/                       # zustand: uiStore, analysisStepperStore, commandMenuStore, themeStore
├── types/                        # re-export @chessmate/types + view models
├── styles/                       # tokens.css (CSS vars §5 design), tailwind preset, globals
└── test/                         # setup, msw handlers, fixtures
```
Tailwind config maps **only** to design tokens (no ad-hoc values); `tokens.css` defines the CSS variables from System Design §5, including light theme + Accent/Board/Density tweaks.

---

## 7. State Management Architecture

| Kind | Tool | Owns | Examples |
|---|---|---|---|
| **Server state** | TanStack Query | anything from Supabase | games, analysis, moves, weaknesses, plan, progress, coach |
| **Global UI state** | Zustand | cross-component ephemeral UI | command menu open, sidebar collapse, theme (Accent/Board/Density), analysis stepper (current ply, flip, active tab) |
| **Local state** | `useState`/`useReducer` | component-only | input values, hover, dropdown open |
| **URL state** | Router params/search | shareable/navigational | `/analysis/:id`, library filters, chart range |

**Why.** Query handles caching/dedup/refetch/optimistic updates for the system-of-record; Zustand is for fast, synchronous UI that shouldn't trigger network or live in URL; Context is avoided except for stable providers (Theme, Auth session) to prevent re-render storms.

**Query conventions.** Keys: `['games', filters]`, `['analysis', gameId]`, `['weaknessProfile']`, `['ratingHistory', range]`. `staleTime`: lists 60s, analysis/immutable 5min, progress 60s. Realtime job updates call `queryClient.invalidateQueries(['analysis', id])` and `['analysisStatus', id]`. Mutations (`importGames`, `sendMistakeToImprove`, `reorderPlan`) use optimistic updates + rollback.

**Ownership diagram.**
```
URL ── route/id/filters ──► Query (server cache) ──► components (read)
Zustand ── stepper/theme/menu ──► components (read/write, sync)
Realtime ── job status ──► invalidate Query keys
Mutations ──► Edge Function ──► DB ──► invalidate ──► refetch
```
The analysis stepper (current ply/flip/tab) lives in Zustand; the *data* it indexes into (moves/analysis) lives in Query.

---

## 8. Data Architecture (domain models)

Shared in `@chessmate/types`. Snake_case in DB, camelCase view models via mappers.

- **User/Profile** — `id, email, displayName, currentRating, peakRating, level('beginner'|'intermediate'|'club'), createdAt`. Owns games. Lifecycle: created at signup.
- **Game** — `id, userId, pgn, opponent, playerColor('w'|'b'), result('win'|'loss'|'draw'), eco, openingName, timeControl, playedAt, source('pgn'|'chesscom'|'lichess'), analysisStatus('queued'|'analyzing'|'analyzed'|'failed')`. Has one Analysis, many Moves. Created on import; status driven by pipeline.
- **Analysis** — `id, gameId, accuracyUser, accuracyOpponent, moveCounts{best,good,inaccuracy,mistake,blunder,brilliant}, turningPoints:int[], engineDepth, completedAt`. 1:1 Game.
- **Move** — `id, gameId, ply, san, fenAfter, evalCp, classification('brilliant'|'best'|'good'|'inaccuracy'|'mistake'|'blunder'), bestSan, bestEvalCp, phase('opening'|'middlegame'|'endgame'), motifs:string[]`. Many per Game.
- **Weakness** — `id, userId, category('tactical'|'opening'|'endgame'|'positional'), key, label, severity('high'|'medium'|'low'), frequencyPct, trend('improving'|'steady'|'worsening'), ratingImpact, firstDetected, lastSeen`. Aggregated from Moves; links to training actions.
- **ImprovementPlan** — `id, userId, weekIndex, focusWeaknessId, title, rationale, sessionsTotal, sessionsDone`. Has many TrainingSessions. Refreshed weekly / on new analysis.
- **TrainingSession** — `id, planId, weaknessId, type('drill'|'replay'|'tactics'|'coach_review'), title, description, estMinutes, status('next'|'queued'|'done'), positions/jsonb, completedAt`.
- **Milestone** — `id, userId, kind('rating'|'accuracy'|'habit'|'volume'), label, target, current, status('achieved'|'in_progress'|'future'), achievedAt`.
- **CoachInsight/Session** — `session: id,userId,context(jsonb: game/move/weakness ref); message: id,sessionId,role('user'|'coach'),content,citations(jsonb refs to moves/weaknesses),createdAt`.
- **RatingHistory** — `id, userId, rating, recordedAt, source`. Append-only; powers trend.

Relationships: `profile 1—* game 1—* move`; `profile 1—* weakness`; `profile 1—* improvement_plan 1—* training_session`; `profile 1—* milestone`; `profile 1—* rating_history`; `game 1—1 analysis`.

---

## 9. Supabase Database Architecture

All tables: `id uuid pk default gen_random_uuid()`, `created_at timestamptz default now()`, `user_id uuid references profiles(id)` where user-owned. **RLS on for every table.**

```sql
profiles(id uuid pk references auth.users, email text, display_name text,
  current_rating int, peak_rating int, level text, prefs jsonb default '{}')

games(id, user_id, pgn text, opponent text, player_color char(1),
  result text, eco text, opening_name text, time_control text,
  played_at timestamptz, source text, analysis_status text default 'queued',
  content_hash text)                          -- idx: (user_id, played_at desc), unique(user_id, content_hash)

analyses(id, game_id uuid unique references games, accuracy_user numeric,
  accuracy_opponent numeric, move_counts jsonb, turning_points int[],
  engine_depth int, completed_at timestamptz)  -- idx: (game_id)

moves(id, game_id references games, ply int, san text, fen_after text,
  eval_cp int, classification text, best_san text, best_eval_cp int,
  phase text, motifs text[])                    -- idx: (game_id, ply), (classification)

weaknesses(id, user_id, category text, key text, label text, severity text,
  frequency_pct numeric, trend text, rating_impact int,
  first_detected timestamptz, last_seen timestamptz)
                                                -- idx: (user_id, rating_impact desc), unique(user_id, key)

improvement_plans(id, user_id, week_index int, focus_weakness_id uuid references weaknesses,
  title text, rationale text, sessions_total int, sessions_done int)
                                                -- idx: (user_id, week_index desc)

training_sessions(id, plan_id references improvement_plans, weakness_id references weaknesses,
  type text, title text, description text, est_minutes int, status text,
  positions jsonb, completed_at timestamptz)    -- idx: (plan_id), (weakness_id)

coach_sessions(id, user_id, context jsonb)
coach_messages(id, session_id references coach_sessions, role text, content text,
  citations jsonb, created_at)                  -- idx: (session_id, created_at)

rating_history(id, user_id, rating int, recorded_at timestamptz, source text)
                                                -- idx: (user_id, recorded_at)

milestones(id, user_id, kind text, label text, target numeric, current numeric,
  status text, achieved_at timestamptz)         -- idx: (user_id, status)

analysis_jobs(id, game_id references games, state text default 'queued',
  attempts int default 0, error text, locked_at timestamptz)  -- idx: (state, created_at)
```

**RLS strategy.** Owner-only access on all user data:
```sql
alter table games enable row level security;
create policy games_owner on games
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- identical owner policies on analyses/moves (via join to games.user_id),
-- weaknesses, improvement_plans, training_sessions, coach_*, rating_history, milestones.
```
`moves`/`analyses` policies check ownership through `games`:
```sql
create policy moves_owner on moves for all
  using (exists(select 1 from games g where g.id = moves.game_id and g.user_id = auth.uid()));
```
**Permissions.** Client uses anon key + JWT (RLS enforced). Edge Functions use the **service-role key** (bypass RLS) but must re-scope every query by `user_id` from the verified JWT. Gemini/Stockfish keys are server-only env vars, never shipped to client.

---

## 10. Analysis Pipeline Architecture

```
import-games (Edge Fn)
  parse PGN (lib/chess) → dedupe by content_hash → insert games(status=queued)
  → insert analysis_jobs(queued)
run-analysis (orchestrator, triggered by pg_cron poll or Realtime)
  claim job (locked_at, attempts++) → set game.analysis_status='analyzing'
  → Stockfish worker: eval every ply at target depth → upsert moves(eval_cp, fen_after, phase)
  → classify-moves: eval-delta thresholds → moves.classification, best_san/best_eval_cp,
      analyses.accuracy_*, move_counts, turning_points
  → detect-weaknesses: aggregate motifs/classifications → upsert weaknesses(frequency, severity, trend, rating_impact)
  → build-plan: refresh improvement_plan + training_sessions from ranked weaknesses
  → recompute-progress: append rating_history (if rated), update milestones, accuracy/phase trends
  → set game.analysis_status='analyzed'; emit events (§15)
coach-respond (on demand): pulls structured facts → Gemini → coach_messages
```

**Move classification (deterministic).** Per ply, compare `evalCp` vs `bestEvalCp` (centipawn loss, side-relative). Thresholds (config in `lib/classification`): brilliant = best move that is a non-obvious sacrifice; best = matches engine top move; good ≤ 50cp loss; inaccuracy 50–100; mistake 100–250; blunder > 250. Phase by material/move-number heuristic.

**Background jobs.** `analysis_jobs` table + `pg_cron` poller invokes `run-analysis`; idempotent claims (`locked_at` lease, max `attempts=3`). One game = one job; moves processed in batches to respect Edge Function time limits (chunk by ply ranges, resumable).

**Failure handling.** Stockfish/timeout → job `state='failed'`, `game.analysis_status='failed'`, `error` recorded; client shows analysis-failed state + Retry (re-enqueue). Partial eval persisted so manual board stepping still works (System Design §8 failure behavior). Dedup prevents double-import; poison jobs after 3 attempts surface in an admin view.

---

## 11. AI Coach Architecture

**Role.** Explain already-computed facts in plain language; a peer feature, never the default Analysis view (System Design §14.7). Server-only (Gemini key never client-side).

**Prompt flow.** `coach-respond` Edge Fn:
1. Verify JWT, load context refs (gameId/ply/weaknessId) from `coach_sessions.context`.
2. **Gather context (allow-list only):** the move's `san, evalCp, bestSan, bestEvalCp, classification, phase, motifs`; adjacent moves for continuity; the linked `weakness` row (label, frequency, trend); user `level`. 
3. Build a structured prompt: system rules + JSON facts + user question. Instruction: *"Explain using only the provided facts and standard chess principles. Do not invent evaluations, moves, or lines. If asked beyond the facts, say what's known and suggest analyzing further."*
4. Gemini returns prose + `citations` (which fact refs it used) → persist `coach_messages`.

**Memory boundaries.** Session-scoped context only; no cross-user data; no long-term memory beyond the user's own persisted sessions. Coach **cannot** access other users' data, raw engine to compute new lines, or anything outside the allow-listed structured facts.

**Hallucination minimization.** (a) Generative layer only *explains* deterministic outputs; (b) evals/lines/classifications are passed in, never asked for; (c) responses cite fact refs; (d) temperature low; (e) UI frames Coach as guidance and links back to the concrete move/weakness so claims are verifiable.

---

## 12. Learning System Architecture (differentiator — deep)

```
Move (classified, motif-tagged)
  └─aggregate→ Weakness (category, severity by rating_impact, frequency, trend)
       └─map→ Learning Objective (per weakness key, curated)
            └─compose→ Training Plan (weekly: 1 focus + ordered sessions)
                 └─run→ Training Session (drill | replay | tactics | coach_review)
                      └─complete→ Progress Update (phase accuracy ↑, weakness freq ↓, milestone progress)
                           └─feeds back→ re-rank Weaknesses → next Weekly Focus
```

**Weakness → objective mapping.** A static `learning_objectives` catalog keyed by `weakness.key` (e.g. `endgame.rook_conversion → { objective:"Convert winning rook endgames", sessionTypes:['drill','replay'], positionSet:'rook_endgames' }`). Curated, versioned in `lib/learning` — not generated.

**Plan composition (`build-plan`).** Pick highest `rating_impact` weakness as **Weekly Focus**; expand its objective into 3–5 ordered `training_sessions` (mix of curated drills + the user's own lost games matching the motif via `moves.motifs`). Secondary weaknesses queue additional sessions. One Primary action per view (System Design §9 action hierarchy).

**Session types.**
- `drill` — curated positions for the motif (positions jsonb).
- `replay` — user's own games re-played from the critical ply (`turning_points`/flagged move).
- `tactics` — puzzle set targeting the blind spot.
- `coach_review` — guided walkthrough (invokes Coach with the weakness context).

**Completion → progress.** On `status='done'`: recompute phase accuracy from subsequent games, update `weakness.frequencyPct`/`trend`, advance `improvement_plan.sessions_done`, and milestone `current`. New games continuously refresh detection so the plan stays live (System Design §9 insight→improvement path).

---

## 13. Progress Tracking Architecture

- **Rating tracking.** Append `rating_history` on rated games/sync. Trend = ordered series; delta = `latest − series[atRangeStart]`; peak = `max(rating)`. Range switch (30d/90d/1y/all) filters the series.
- **Accuracy tracking.** Per-game `accuracy_user`; rolling avg over last N games; `accuracy_trend` = series of per-game accuracy.
- **Phase accuracy.** Mean centipawn-loss→accuracy per `moves.phase` over a window → opening/middlegame/endgame %.
- **Weakness trend.** Compare `frequency_pct` across rolling windows → `improving|steady|worsening` (sparkline series).
- **Improvement Score (0–100).** Composite, computed server-side and documented in code:
  `score = w1·norm(accuracyTrendSlope) + w2·(1 − topWeaknessFrequency) + w3·conversionRate + w4·norm(ratingSlope)`, weights summing to 1 (default `0.3/0.25/0.25/0.2`), clamped 0–100. Δ vs 30 days ago drives the "▲ Up N pts" label.
- **Milestones.** `current` recomputed on each progress update; `status` flips to `achieved` when `current ≥ target` (sets `achieved_at`).

Formulas live in `lib/progress` as pure, unit-tested functions; the client only renders results.

---

## 14. API Architecture

Supabase Edge Functions (HTTPS, JWT required unless noted). Standard error envelope `{ error: { code, message, recoverable } }`.

| Endpoint | Method | Purpose | Request | Response | Auth | Errors |
|---|---|---|---|---|---|---|
| `/import-games` | POST | Parse+persist games, enqueue analysis | `{ source, pgn?|fileId?|platformHandle? }` | `{ imported:int, gameIds:[], duplicates:int }` | JWT | 400 parse, 409 dup |
| `/games` | GET | List w/ filters | `?result&color&timeControl&q&sort&cursor` | `{ games:[], nextCursor }` | JWT | 401 |
| `/games/:id` | GET | One game + status | — | `{ game, analysisStatus }` | JWT(owner) | 404 |
| `/analysis/:gameId` | GET | Analysis + moves | — | `{ analysis, moves:[] }` | JWT(owner) | 404, 425 (not ready) |
| `/analysis/:gameId/retry` | POST | Re-enqueue failed | — | `{ jobId }` | JWT(owner) | 409 |
| `/weaknesses` | GET | Ranked profile | `?category?` | `{ weaknesses:[] }` | JWT | 401 |
| `/improve/plan` | GET | Current plan+sessions | — | `{ plan, sessions:[] }` | JWT | 401 |
| `/improve/plan/reorder` | POST | Reorder queued sessions | `{ order:[] }` | `{ ok }` | JWT | 400 |
| `/training/:id/complete` | POST | Mark session done | `{ result? }` | `{ progress, milestones }` | JWT(owner) | 404 |
| `/analysis/mistake-to-improve` | POST | Tag a move into plan | `{ gameId, ply }` | `{ weaknessId }` | JWT(owner) | 404 |
| `/progress` | GET | Trends/score | `?range` | `{ score, rating[], accuracy[], phases, milestones[] }` | JWT | 401 |
| `/coach/respond` | POST | Coach explanation | `{ context, message }` | `{ message, citations }` | JWT | 502 AI (fallback) |
| `/profile` | GET/PATCH | Profile+prefs | `{ prefs? }` | `{ profile }` | JWT(owner) | 400 |

Realtime: client subscribes to `analysis_jobs`/`games` row changes (RLS-scoped) for live status.

---

## 15. Event System

Internal domain events (emitted by Edge Functions; consumed by progress recompute, analytics, and Realtime fan-out). Stored append-only in `events(id,user_id,type,payload,created_at)` and/or pushed to analytics.

| Event | Source | Payload | Destination |
|---|---|---|---|
| `game_imported` | import-games | `{gameId, source}` | enqueue analysis, analytics |
| `analysis_completed` | run-analysis | `{gameId, accuracy, moveCounts}` | weakness detect, progress, Realtime, analytics |
| `weakness_detected` | detect-weaknesses | `{weaknessId, category, severity}` | build-plan, analytics |
| `plan_refreshed` | build-plan | `{planId, focusWeaknessId}` | Realtime, analytics |
| `training_started` | client→/training | `{sessionId, type}` | analytics |
| `training_completed` | /training/complete | `{sessionId, weaknessId}` | progress recompute, analytics |
| `milestone_completed` | recompute-progress | `{milestoneId, kind}` | Realtime, analytics |
| `coach_message_sent` | coach-respond | `{sessionId, citationsCount}` | analytics |

---

## 16. Analytics Architecture

Events (§15) → analytics sink (Supabase table + optional warehouse). Metrics:
- **Activation** = % new users who import ≥1 game **and** view Dashboard within first session. (`game_imported` ∧ first `/dashboard` view.)
- **Time-to-first-insight** = signup → first `analysis_completed`.
- **Retention (Wk1/Wk4)** = % users returning and viewing Dashboard/Analysis in the window.
- **Learning completion** = `training_completed / training_started` per user/week.
- **Loop completion** = % users traversing import→analysis→improve in a period.
- **Improvement Score movement** = mean Δ score / 30 days (the product's north star).
- **Weakness resolution rate** = % weaknesses moving `worsening/steady → improving`.
Each metric documented as a SQL/derivation in `analytics/`.

---

## 17. Error Handling Architecture

| Layer | Failure | Handling | Recovery path |
|---|---|---|---|
| Frontend | render/runtime | Route-level ErrorBoundary → ErrorState card | Reload / back; never blank (System Design §6) |
| Frontend | query error | per-card ErrorState + Retry | refetch; rest of screen intact |
| Backend | validation | 400 + `{recoverable:true}` | inline message + fix |
| Backend | authz/RLS | 401/403 | re-auth / hidden |
| Pipeline | Stockfish/timeout | job `failed`, partial moves saved | analysis-failed state + Retry re-enqueue |
| AI | Gemini error/timeout | 502, no `coach_messages` write | Coach shows "can't reach coach, try again"; Analysis insights unaffected |
| Import | bad PGN | 400 with line context | highlight + allow edit/re-paste |

Principles: errors are explained in plain language with a recovery action; AI/engine failures never block the deterministic core; partial data degrades gracefully.

---

## 18. Performance Architecture

**Budgets.**
- Initial load (LCP): < 2.5s on broadband; JS initial < 250KB gzip (route-split rest).
- Board render/step: < 16ms/frame; move-step UI update < 100ms.
- Analysis generation: < 30s per typical game (server, async; never blocks UI).
- API p95: < 400ms (excluding long-running analysis, which is job-based).
- Chart render: < 50ms.

**Strategy.** Route-based code splitting; lazy-load Stockfish WASM only on `/analysis`; memoize chart geometry; virtualize long move/game lists; TanStack Query caching + `staleTime` to cut refetch; Netlify CDN + immutable hashed assets; preload Onest + JetBrains Mono with `font-display:swap`; skeletons prevent layout shift; images/avatars via Supabase Storage with width hints.

---

## 19. Security Architecture

- **Authentication:** Supabase Auth (email + OAuth), JWT in memory/secure storage; session refresh handled by supabase-js.
- **Authorization:** RLS owner-policies on every table (§9); Edge Functions verify JWT and re-scope by `user_id`.
- **Secrets:** Gemini, Stockfish (if hosted), platform API keys, service-role key are server-only env (Supabase/Netlify env). Never in client bundle; CI checks for leaked keys.
- **API security:** all mutations through Edge Functions (no client writes to sensitive tables beyond RLS-guarded inserts); input validation (zod) on every function; rate-limit `coach/respond` and `import-games` per user; CORS locked to app origin.
- **Data:** PGNs are user-owned (RLS); no PII beyond email/display name; coach context never crosses users.

---

## 20. Testing Architecture

| Level | Tool | Scope |
|---|---|---|
| Unit | Vitest | `lib/` (pgn parse, classification thresholds, progress formulas, Improvement Score), mappers, hooks |
| Component | Vitest + Testing Library | ui primitives (all states), charts (aria-labels), Board stepping |
| Integration | Testing Library + MSW | route loaders + four states; mutations (import, complete session) optimistic+rollback |
| E2E | Playwright | critical journeys (§3) |
| Visual | Playwright snapshots | each screen desktop+mobile vs approved design; token regressions |

**Critical paths per screen.** Dashboard: loads, range switch, focus CTA routes. Analysis: board paints from PGN before analysis; Analysis tab default; Coach never auto-opens; step syncs panels; failed-analysis Retry. Improve: insight→action (start session) updates progress. Library: filter/search/sort; table↔card responsive; open game. Import: paste→preview→queue, bad PGN error. A11y: keyboard traversal + focus ring on every screen (axe in CI).

---

## 21. Deployment Architecture

- **Environments:** `local` (Vite + Supabase local/branch) → `preview` (Netlify Deploy Previews per PR + Supabase preview branch) → `production`.
- **CI/CD (Netlify + GitHub Actions):** on PR — typecheck, lint, unit/component/integration, build, Playwright (preview), axe; deploy preview. On merge to `main` — full suite → migrate (supabase db push with review) → deploy production.
- **DB migrations:** versioned SQL in `supabase/migrations`; forward-only; applied in CI with manual approval gate for production.
- **Release flow:** trunk-based; feature-flagged (§23); preview sign-off (visual diff vs design) → merge → prod. Rollback = redeploy previous Netlify build + (if needed) down-migration.

---

## 22. Migration Strategy (ChessMate already exists)

**Current → Target.** Move from the existing implementation to this token-bound, feature-sliced architecture **without breaking production**.

**Phases.**
1. **Parallel foundation.** Land the token system (`tokens.css` + Tailwind preset from System Design §5) and `components/ui` primitives alongside existing UI; no user-visible change. Acceptance: Styleguide reproduced 1:1.
2. **Strangler routing.** Introduce the new AppShell + routes behind a flag; migrate screen-by-screen (Dashboard → Analysis → Improve → Library → rest) so old and new coexist. Each migrated screen must hit Definition of Done (§25).
3. **Data/pipeline alignment.** Add new tables/migrations additively; backfill (`weaknesses`, `rating_history`, `improvement_plans`) via one-off jobs; dual-read where needed, then cut over.
4. **Cutover & cleanup.** Flip flags to new screens 100%, remove legacy components/routes, drop dead columns after a deprecation window.

**Milestones:** F1 tokens live · F2 Dashboard on new shell · F3 Analysis on new shell · F4 Improve+Library · F5 legacy removed. **Rollout:** internal → % canary → 100% per screen; instant flag rollback.

---

## 23. Feature Flag Strategy

- **Mechanism:** flags in `profiles.prefs.flags` / a `feature_flags` table, evaluated server + client; default off.
- **Redesign rollout:** `ui.newShell`, `ui.screen.dashboard|analysis|improve|library` for the strangler migration (§22), canaried per cohort.
- **Learning engine rollout:** `learning.planV1` gates `build-plan`/Improve Hub; `learning.replaySessions`, `learning.tacticsSets` for incremental session types.
- **Experimental:** `coach.enabled`, `import.platformSync` (Chess.com/Lichess), `analysis.depthBoost`. All flags documented in §24 when promoted/removed.

---

## 24. Technical Decision Log

| Decision | Rationale | Tradeoffs | Rejected alternatives |
|---|---|---|---|
| TanStack Query for server state | Caching/dedup/optimistic out of the box; matches "server owns truth" | learning curve | Redux Toolkit Query (heavier), bespoke fetch |
| Zustand for UI state | Minimal, synchronous, no provider hell for stepper/menu/theme | not for server data | Context-only (re-render cost), Redux (boilerplate) |
| Server-side analysis pipeline | Deterministic, auditable, secrets safe, heavy CPU off client | infra complexity, job orchestration | client-only Stockfish (inconsistent, drains device) |
| Gemini explains only precomputed facts | Minimizes hallucination; Coach stays secondary | less "free-form" coach | LLM-computed evals/lines (unreliable) |
| Curated learning objectives catalog | Trustworthy, consistent pedagogy; the differentiator must be reliable | manual curation effort | fully LLM-generated plans (unverifiable) |
| Tailwind bound strictly to tokens | Enforces design system; no drift | must extend preset for new tokens | ad-hoc CSS, CSS-in-JS runtime cost |
| Supabase (Postgres+RLS+Edge+Realtime) | One platform: auth, data, jobs, live status; owner-RLS simple | vendor coupling | custom Node API + separate auth |
| Strangler migration behind flags | Ships safely on a live product | temporary dual code | big-bang rewrite (risky) |

---

## 25. Engineering Definition of Done

A feature/screen is **done** only when all hold (extends System Design §15):
- **Code quality:** TypeScript strict, no `any` at boundaries, lint/format clean, reuses §6 components, PR reviewed.
- **Design fidelity:** tokens only (no off-system values); matches approved mockup; visual snapshot diff approved.
- **Accessibility:** keyboard operable + visible focus; AA contrast; ARIA roles; `aria-live` for async; meaning never color-only; `prefers-reduced-motion` honored; axe passes.
- **Responsive:** correct at desktop/laptop/tablet/mobile; mobile uses re-thought hierarchy; 44px targets; table↔card and tabs↔segmented adaptations.
- **States:** loading/skeleton, empty, error+recovery, success all implemented; no blank regions; no layout shift beyond skeleton→content.
- **Testing:** unit (logic), component (states), integration (loader+mutation), and the screen's E2E critical path green.
- **Performance:** within §18 budgets; route code-split; lists virtualized where long.
- **Analytics:** relevant events (§15) emitted with correct payloads.
- **Security:** RLS verified; no secret in client; inputs validated.
- **Documentation:** component props + feature README; any new token/flag/decision recorded (§23/§24).

---

*End of implementation architecture. Paired with `CHESSMATE_SYSTEM_DESIGN.md`, this is sufficient for Claude Code to build ChessMate at 90%+ fidelity without making product decisions.*
