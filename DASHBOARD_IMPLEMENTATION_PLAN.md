# Dashboard Implementation Plan (Phase 4)

> **Authority:** `CHESSMATE_SYSTEM_DESIGN.md` §7 (Dashboard, authoritative) + §4.1 + §4.11 (mobile) + Implementation Architecture §4/§5. Documentation wins.
> **Builds on:** Phase 1 tokens · Phase 2 primitives (`components/ui/iv`) · Phase 3 shell + routing + flags · Phase 3.5 compliance.
> **Scope:** the `/dashboard` screen only. No Analysis/Improve/other screens. Behind `ui.screen.dashboard` (placeholder when off). Legacy app untouched.

---

## 1. Dashboard Gap Analysis

### Current state
- **New shell:** `/dashboard` renders `PlaceholderPage` (Phase 3). No real dashboard.
- **Legacy app:** no dashboard screen; the closest is `StatsDashboard.tsx` (a modal of raw stats: totals, W/L/D, color split, a progress sparkline) + a `WelcomeScreen` empty state. It is an **analytics dump**, the exact "analytics-dashboard syndrome" the brief warns against — it leads with numbers, not insight or next action.
- **Routing/flag:** `ui.screen.dashboard` flag exists; `placeholderFor('dashboard')` wired.

### Target (System Design §7)
A focused **improvement command center** answering, in priority order: how am I doing → what's wrong → what next → what changed → where am I headed. Insight leads, numbers support, exactly one primary action.

### Gaps (current → required)
| Area | Current | Required (§7) | Verdict |
|---|---|---|---|
| Greeting + primary CTA | none | "Good evening, {name}" + Secondary "Import" + Primary "Continue improving →" | **Build** |
| Improvement Score | none | ScoreRing hero (108px) + driver text + 2 metric cards (last-game acc, streak) | **Build** (ScoreRing chart) |
| Rating trend | progress sparkline (games-analyzed) | RatingChart (LineChart) + range Segmented (30d/90d/1y) + mono header (rating, +Δ, peak) | **Build** (LineChart chart) |
| Biggest weaknesses | none on dashboard | top-3 compact WeaknessCards (icon, name, freq bar, % + trend) + "View all →" | **Build** (compact WeaknessCard) |
| Recommended focus | none | Focus hero card (✦ label, title, rationale, Primary "Start session" + time) | **Build** (FocusCard) |
| Recently analyzed | raw recent list (modal) | 5 compact GameRows + "All games →" | **Build** (compact GameRow) |
| Coach summary | none | subordinate CoachCard | **Build** (CoachCard) |
| Improvement roadmap | none | Timeline (done/in-progress/target) | **Build** (RoadmapTimeline) |
| States | partial | loading skeleton · empty (onboarding) · per-card error+retry · success | **Build all four** |
| Mobile hierarchy | n/a | score-first reorder (§4.11) | **Build** |

### Design-violation risks to avoid (brief + §2/§14)
Card spam, generic SaaS grid, vanity metrics, numbers-without-meaning, Coach as centerpiece, competing primary actions. Mitigated by the §7 hierarchy + one accent-gradient primary.

---

## 2. Proposed Layout (desktop, app shell content, max-width = `--content-max`)

```
┌────────────────────────────────────────────────────────────────────────┐
│ GreetingBar   "Good evening, {name}"  ·  subtext      [Import] [Continue→]│
├────────────────────────────────────┬───────────────────────────────────┤
│ Improvement Score (hero, ~300px)    │ Rating trend (flex)               │
│  ◍ ScoreRing 108  ·  driver text    │  1487  ▲+63  peak 1502  [30d 90d 1y]│
│  [last-game acc] [streak]           │  ╱╲ LineChart (area) · mono months │
├────────────────────────────────────┼───────────────────────────────────┤
│ Biggest weaknesses        View all →│ Recommended this week (hero ~340)  │
│  ◆ Endgame conversion  ▁▃▅ 41% ▾    │  ✦ WEEKLY FOCUS · week 7          │
│  ◆ Hanging pieces      ▁▅▇ 33% ▴    │  Convert winning endgames         │
│  ◆ Opening prep        ▁▂▃ 22% ▾    │  rationale tied to data           │
│                                     │  [sessions 2/5][phase Δ] [Start →] │
├────────────────────────────────────┴───────────────────────────────────┤
│ Recently analyzed (1.4fr)            │ RightStack (1fr)                  │
│  ● vs Opponent · opening  tag 84% 2h │  ✦ Coach summary card             │
│  ● ... ×5                  All games→│  ◷ Improvement roadmap timeline    │
└──────────────────────────────────────┴──────────────────────────────────┘
```
Row gap 16px; section gap 28–32px; respects Density max-width. Flex ratios per §7 (top 300px/flex; bottom 1.4fr/1fr).

### Mobile (≤767, §4.11 — score-first single column)
Greeting (stacked, full-width CTAs) → **Improvement Score hero** → **Recommended focus** → **Rating trend** → **Biggest weaknesses** → Recently analyzed → (Coach summary + roadmap). Bottom tab bar from the shell.

---

## 3. Component Mapping (compose from §6 — reuse first)

| Section | New components (`features/dashboard` + `components/charts`) | Reused primitives |
|---|---|---|
| Greeting | `GreetingBar` | `Button` (primary/secondary) |
| Improvement Score | `ImprovementScoreCard`, **`ScoreRing`** (chart) | `Card`, `MetricCard` |
| Rating trend | `RatingTrendCard`, **`LineChart`** (chart) | `Card`, `SegmentedControl` |
| Weaknesses | `BiggestWeaknessesCard`, `WeaknessCardCompact` | `Card`, `ProgressBar`, `Badge` |
| Focus | `FocusCard` (hero) | `Card` (hero), `Button`, `MetricCard` |
| Recently analyzed | `RecentGamesCard`, `GameRowCompact` | `Card`, `Chip`/`MoveQualityChip` |
| Coach summary | `CoachSummaryCard` | `Card` (subordinate, §14.7) |
| Roadmap | `RoadmapTimeline` | `Card`, `ProgressBar` |
| States | `DashboardSkeleton`, reuse `EmptyState`/`ErrorState` | iv primitives |

Charts go in `src/components/charts/` (Architecture §6); dashboard composition + hooks in `src/features/dashboard/`.

---

## 4. Component hierarchy

```
routes: /dashboard (flag ui.screen.dashboard) → DashboardPage
DashboardPage
├── GreetingBar (Button:secondary "Import", Button:primary "Continue improving")
├── Row1
│   ├── ImprovementScoreCard ── ScoreRing + driver + MetricCard×2
│   └── RatingTrendCard ── SegmentedControl(range) + LineChart
├── Row2
│   ├── BiggestWeaknessesCard ── WeaknessCardCompact×3 + "View all →"
│   └── FocusCard(hero) ── MetricCard×2 + Button:primary "Start session"
└── Row3
    ├── RecentGamesCard ── GameRowCompact×5 + "All games →"
    └── RightStack ── CoachSummaryCard + RoadmapTimeline
```
Each data-backed card renders its own loading/error; the page renders empty (onboarding) when the user has 0 games.

---

## 5. State requirements

- **Server state (TanStack Query)** — one hook per §7 region, keys per Architecture §7. For Phase 4 these resolve from a **typed sample/derived adapter** (locked decision #3), shaped exactly like the future API so the swap is mechanical:
  - `useImprovementScore()` → `{ score:0–100, deltaPts, driver, lastGameAccuracy, streakDays }`
  - `useRatingHistory(range)` → `{ current, deltaForRange, peak, series:[{t,rating}] }`
  - `useTopWeaknesses()` → `WeaknessCompact[3]` (derived from `weaknessProfile` lib when games exist)
  - `useWeeklyFocus()` → `{ week, title, rationale, sessionsDone, sessionsTotal, phaseDeltaPct, estMinutes }`
  - `useRecentGames(5)` → `GameRowVM[]`
  - `useCoachSummary()` → `{ text, context }`
  - `useRoadmap()` → `MilestoneNode[]`
  - `useDashboardEmptyState()` → `{ hasGames:boolean }`
- **UI state (Zustand):** range Segmented selection may live in component `useState` (not shareable) — local. Theme already global.
- **URL state:** none required (dashboard is the index).

### Data requirements / provenance
- **Available now:** `user_statistics`, `game_analysis_results` (accuracy/mistakes/blunders), `user_progress_snapshots`, `games`, `move_analysis` (phase/motif/classification), `weaknessProfile` lib.
- **Not yet available → derived/sample for Phase 4:** rating history (no `rating_history` table), Improvement Score composite, weekly focus/plan, milestones, coach summary. These come from `features/dashboard/sampleDashboard.ts` (typed) until the data layer lands (roadmap Phase 11). The Improvement Score formula (Architecture §13) is implemented as a pure function now and fed sample inputs.
- Mono for all data values (§14.14): rating, eval, %, dates, accuracy, ECO.

---

## 6. Risks

| Risk | Mitigation |
|---|---|
| Sample data masking real integration gaps | Hooks shaped to the real API contract; swap is one adapter file (Phase 11). Clearly labelled `sampleDashboard.ts`. |
| New charts (ScoreRing/LineChart) a11y | `role="img"` + descriptive `aria-label` summarizing the trend (§11); never color-only. |
| "Card spam" / SaaS look | Strict §7 hierarchy, generous spacing, one primary action, insight-led copy. Visual review gate before finalizing. |
| Coach becoming prominent | CoachCard subordinate, bottom-right stack, no accent fill (§14.7). |
| Breaking production | All behind `ui.screen.dashboard`; placeholder when off; legacy untouched. |
| `color-mix` floor (carried) | Same as Phase 3.5; pre-GA item. |

---

## 7. Acceptance criteria (Definition of Done — §15 + Arch §25)

- **Visual:** matches §7 layout/hierarchy/spacing/tokens; mono for data; insight leads each region; exactly one primary action ("Continue improving" / focus "Start session" is the in-card primary).
- **Functional:** range Segmented re-renders LineChart (200ms); game row → (future) Analysis; weakness → Improve/Weakness; focus → Improve; quick actions route correctly (Import, Analyze latest, Improve Hub, Ask Coach).
- **Success metric (§4.1):** user can name their #1 weakness and start the recommended action in ≤1 click within 5s of load.
- **Responsive:** desktop/laptop/tablet/mobile; mobile uses score-first order (§4.11), not a scaled desktop.
- **States:** loading skeletons, empty onboarding (→ Import), per-card error+retry, success.
- **A11y:** keyboard + visible focus; route focus to h1; charts labelled; AA contrast; reduced-motion; axe clean (component + e2e).
- **Quality:** typecheck/lint/tests/build green; behind flag; analytics events where relevant; no console errors.

---

## 8. Quick actions (brief requirement) → routing
Import Games → `/games/import` · Analyze Latest Game → `/analysis/:latestId` · Open Improve Hub → `/improve` · Ask Coach → `/coach`. Surfaced via the GreetingBar primary/secondary + the focus/coach card CTAs (no separate "quick actions" card — folded into the §7 sections to avoid card spam).

---

## 9. Implementation status (2026-06-23) — ✅ Built + refined

Shipped behind `ui.screen.dashboard` (placeholder when off); legacy app untouched.

- **Charts:** `components/charts/ScoreRing.tsx`, `components/charts/LineChart.tsx` (`subtle` mode for the quieter rating trend).
- **Feature:** `features/dashboard/{DashboardPage,cards,hooks,sampleDashboard,types,dashboard.css}.tsx`.
- **Route:** `/dashboard` gated in `AppRouter` (`DashboardRoute`).

### UX refinement pass (post visual-review, no redesign / no new features)
Per reviewer direction, refined hierarchy + card content to read as a Personal Chess Improvement System:
1. **Improvement Score** — verdict + drivers (what's lifting/dragging) + actionable next-step nudge.
2. **Rating trend** — de-emphasized (smaller value, `subtle` thinner chart) as an outcome companion.
3. **Weakness cards** — added *why it matters* + *recommended action* per weakness.
4. **Improvement Roadmap** — elevated to hero treatment, larger nodes, placed above Coach.
5. **Narrative** — question captions map cards to "How am I improving / What's holding me back / What to do next / What outcome can I expect".

### Tests
- Component/integration: `features/dashboard/dashboard.test.tsx` (12) + `dashboard.empty.test.tsx` (1) — score fn, each card, range switch, navigation, empty/onboarding, axe smoke.
- E2E a11y: `e2e/dashboard-a11y.spec.ts` (structural axe, color-contrast, route focus, labelled charts) — wired into the CI `accessibility` job.

### Known limitations
- Data is typed sample/derived (no `rating_history`/plan/milestone tables yet) — swap is one adapter file (Phase 11).
- Greeting name falls back to "there" without a session (resolves from auth in production).
