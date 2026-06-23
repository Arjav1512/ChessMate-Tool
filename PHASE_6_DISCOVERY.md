# Phase 6 — Improve Hub · Discovery & Gap Analysis

> **Authority:** `CHESSMATE_SYSTEM_DESIGN.md` §9 (+ §4.6, §6, §12) · `CHESSMATE_IMPLEMENTATION_ARCHITECTURE.md` §4 (`/improve`), §5, §7, §12 (Learning System) · `PROJECT_STATE.md` · `PHASE_6_BACKLOG.md`. Documentation wins.
> **Status:** Discovery only — no code, no branch, no PR.
> **Method:** read §9 + the existing weakness/progress/mistake libs, the dashboard Improve-adjacent code, and the Phase-5 Send-to-Improve queue.
> **Context:** Phases 1–5 merged. Improve is **the differentiator** (§4.6) and the screen that **closes the loop** Phase 5 opened. Behind `ui.screen.improve`; client-side; typed sample/derived where data is missing (decision #3).

---

## 1. Current-state audit

- **New shell:** `/improve` renders `PlaceholderPage` (Phase 3). `ui.screen.improve` flag exists. No real screen.
- **Legacy app:** no "Improve Hub". The nearest legacy surfaces are `components/stats/WeaknessProfile.tsx` (193 LOC, Obsidian modal — frequency/severity list) and `ProgressBar.tsx`/`StatsDashboard.tsx` (modals). These are **not** an improvement plan — they're read-only stat views, on `--cm-*` tokens.
- **Dashboard (Phase 4)** already renders Improve-flavored *summaries* (biggest weaknesses compact, Weekly Focus card, roadmap) from `features/dashboard/sampleDashboard.ts` — the Hub is the full screen those summaries link to.
- **Verdict:** Improve Hub is **net-new** on the Ivory shell. Legacy stats components are untouched (Phase 9/11 territory).

---

## 2. Existing learning / progress systems audit

| System | What exists | Reuse? |
|---|---|---|
| `lib/weaknessProfile.ts` | `buildWeaknessProfile(games, moves)` → ranked `Weakness[]` (`category`, `severity:0–100`, `trend`, `confidence`, `frequency`, `detail`, `evidence`) + `PhaseStrengths` (per opening/middlegame/endgame accuracy) + `summaryLine`. Read-only, session-cached. | **Reuse** the engine + data; **map** category + severity to §9. |
| `useWeaknessProfile()` hook | builds/caches the profile from the user's games. | **Reuse** (or shape an Improve hook around it). |
| `lib/mistakeReview.ts` (`buildMistakeReview`) | mistake cards with drillable FEN positions + filters. | **Reuse** for `replay`-type study sessions. |
| `lib/motifs.ts` / `lib/moveAnalysis.ts` / `move_analysis` table | motif tags + per-ply classification (phase/motif). | **Reuse** as weakness/plan inputs. |
| Progress data | `user_statistics`, `game_analysis_results`, `user_progress_snapshots`, `games`, `move_analysis`. | **Reuse** for phase accuracy / milestone current-values; sample for gaps. |
| `lib/learning` (Architecture §12 catalog) | **does not exist.** | **Create** — curated weakness→objective→session mapping. |
| Plan / training-session / milestone tables | not present (`improvement_plans`, `training_sessions`, `milestones`). | **Defer** to Phase 11; sample/derived for v1. |

**Gap — category taxonomy mismatch (high priority).** `weaknessProfile` categories are `opening | recurring | phase | color | motif`. §9's Weakness Profile filter + radar use **Tactical · Opening · Endgame · Positional** (+ radar axes Tactics/Openings/Middlegame/Endgame/Positional/Time). A **mapping/derivation layer** is required (analogous to Phase 5's `excellent→best`), e.g. `motif`/`recurring`→Tactical, `phase:endgame`→Endgame, `opening`/`color`→Opening, `phase:middlegame`/positional→Positional. **Decision needed** (see Plan).

**Gap — severity bands.** Existing `severity:0–100` (number); §9 wants a **High/Medium/Low** badge ranked by **rating impact**. Need a banding + impact-ranking layer.

**Gap — linked training action.** §9/§12 require each weakness to carry a **linked action** (drill / replay / tactics / coach-review). Not present → comes from the new `lib/learning` catalog.

---

## 3. Send-to-Improve integration audit

- **Phase 5 writes** `cm.improveQueue` (localStorage) on "Send to Improve": `{ gameId, ply, motif, san, addedAt }` (`features/analysis/sendToImprove.ts`).
- **Nothing reads it** — the loop is currently **open**. Phase 6 must **ingest** the queue into the Study Plan (the §9 insight→action path: motif → weakness → focus → study plan).
- **Verdict:** add a reader/ingestion layer; queued motifs should surface as study-plan items (or merge into the matching weakness). Keep the localStorage shape; swap to server when the learning engine lands (Phase 11).

---

## 4. User journey analysis

`Analysis (Send-to-Improve) → Improve (plan) → Start session → progress updates → Dashboard reflects` (§9 path).

| Step | Today | Gap |
|---|---|---|
| Tag a mistake | ✅ Phase 5 writes the queue | — |
| See it in a plan | ❌ queue unread | **build ingestion + Study Plan** |
| Know what to work on | ❌ no Hub | **Weekly Focus (one glance, one Primary)** |
| Act (start session) | ❌ | **"Continue/Start session"** → training stub (real engine later) |
| See progress | partial (dashboard) | **Milestones + phase-accuracy delta**; loop back to dashboard |

**Friction to remove:** the loop dead-ends after Send-to-Improve; "what next?" isn't answerable in one screen; no single Primary action.

---

## 5. Weakness system analysis (§9 §4)

- **Have:** ranked weaknesses with severity/trend/frequency/evidence + phase strengths (real, from games).
- **Need (§9):** group into the **4 categories** with a 2×2 **WeaknessCategoryCard** grid (icon, category, phase accuracy, severity badge, 2–3 sub-weakness rows w/ severity tags), category **filter** (All/Tactical/Opening/Endgame/Positional), weakest category border-tints `--error`.
- **Build:** category mapping + severity banding + per-weakness training-action link; the category card + filter UI.

---

## 6. Study plan architecture (§9 §12)

- **Composition (`build-plan`, Architecture §12):** pick highest **rating-impact** weakness as **Weekly Focus**; expand its objective into **3–5 ordered sessions** (mix of curated drills + the user's own lost games matching the motif via `moves.motifs` / `mistakeReview` + tactics sets); secondary weaknesses queue more. First item = Next (highlighted).
- **Session types (§12):** `drill` (curated positions) · `replay` (user's own games from the critical ply — **reuse `mistakeReview`**) · `tactics` (puzzle set) · `coach_review` (invokes Coach with weakness context).
- **Inputs:** `lib/learning` catalog (create) + `weaknessProfile` + ingested Send-to-Improve queue.
- **Build:** `StudyPlanRow` component + the composition function (pure, unit-tested) + curated catalog. Sample/derived positions for v1.

---

## 7. Milestone architecture (§9)

- **Weekly:** Weekly Focus + 5 sessions; progress bar X/5.
- **Monthly:** targets (e.g. "Endgame conversion 80%", "Reach 1550") with current vs target.
- **Have:** the dashboard `RoadmapTimeline` **pattern** (achieved ✓ / in-progress % / future hollow) — reuse the pattern/CSS (the dashboard component is hook-coupled).
- **Build:** `MilestoneTimeline` for Improve + milestone current-values (real where derivable: rating from `rating_history`—absent→sample; phase accuracy from `game_analysis_results`/`move_analysis`).

---

## 8. Progress architecture

- **Phase accuracy** (radar + category cards + focus delta): derive from `PhaseStrengths` (`weaknessProfile`) / `game_analysis_results` / `move_analysis` (real where present; sample otherwise).
- **Skill radar axes:** Tactics/Openings/Middlegame/Endgame/Positional/**Time** — Time has **no data source** → sample (flagged). Others derivable/sample.
- **Note:** the full **Progress** screen is **Phase 9**; Improve shows the *summary* (radar, focus delta, milestones) per §3 ("Progress = sub-view within Improve").

---

## 9. Technical risks

| Risk | Mitigation |
|---|---|
| Plan composition is the differentiator — must be trustworthy | Curated `lib/learning` catalog (versioned, not LLM-generated); pure, unit-tested composition; deterministic ranking by rating impact. |
| Category taxonomy mismatch | Explicit mapping layer (decision needed); single source consumed by cards + radar + filter. |
| Sample/derived data masking gaps | Hooks shaped to the real API; swap = one adapter (Phase 11). Clearly labelled. |
| RadarChart a11y / label clipping (§6) | ≥66px label margins; `role="img"` + summary aria-label; never color-only. |
| "Time" radar axis has no data | Sample value, documented; real source TBD (clock data not analyzed yet). |
| Send-to-Improve ingestion divergence | Keep localStorage shape; one reader module; reconcile to weaknesses by motif key. |
| Density on a 6-section screen → card-zoo | Strict §9 hierarchy, one Primary, generous spacing, visual review gate. |

---

## 10. Accessibility requirements (§11)

- One Primary action (Weekly Focus "Continue/Start session"); category cards / study rows are secondary — never competing primaries.
- RadarChart + any chart: `role="img"` + descriptive aria-label (skill summary); meaning never color-only (severity paired with badge text + High/Med/Low).
- Category filter = `SegmentedControl` (radiogroup, arrow keys — reuse Phase 2).
- Keyboard: full operability + visible focus; route focus → screen `h1/h2`.
- AA contrast (carry the Phase-5 lesson: small mono/labels use `--text-low`, not `--text-faint`).
- Reduced-motion for halo/progress animations.
- Wire an `/improve` axe e2e into the CI `accessibility` job (as Phases 3.5/4/5).

---

## 11. Mobile requirements (§9 responsive / §4.11)

- **Weekly focus first** (with X/5 progress bar + Primary).
- Category filter → **horizontal scrolling chips**; **category cards stack**; study plan as **cards**.
- Radar may move below or be deferred to Progress; 44px touch targets; shell bottom tab bar (Improve active).

---

## Summary: reuse / replace / create

- **Reuse:** `weaknessProfile` engine + `useWeaknessProfile`, `mistakeReview` (replay sessions), `motifs`/`moveAnalysis`/`move_analysis`, Phase-2 primitives (`Card` hero, `SegmentedControl`, `Badge`, `ProgressBar`, `MetricCard`, `Button`, states), dashboard `FocusCard`/`RoadmapTimeline` **patterns** + `sampleDashboard` VM shapes, Phase-5 Send-to-Improve queue.
- **Replace:** nothing in place to replace (legacy stats stay until Phase 9/11). Map (not replace) the weakness taxonomy + severity.
- **Create:** `lib/learning` catalog; category/severity mapping layer; Send-to-Improve **reader**; plan-composition function; `RadarChart`; `WeaknessCategoryCard`, `StudyPlanRow`, `MilestoneTimeline`, Weekly-Focus hero, `ImprovePage`; `/improve` route gating; `lib/improve` sample/derived adapter + hooks; `/improve` axe e2e.

See `PHASE_6_IMPLEMENTATION_PLAN.md` for milestones, dependencies, acceptance criteria, testing strategy, and visual review gates.
