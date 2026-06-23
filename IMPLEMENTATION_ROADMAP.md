# ChessMate — Implementation Roadmap

> **Status:** Draft for approval (Phase 0 — Discovery output).
> **Derived from:** `CHESSMATE_SYSTEM_DESIGN.md` (authoritative) + `CHESSMATE_IMPLEMENTATION_ARCHITECTURE.md`.
> **Rule:** Documentation wins. Where existing code conflicts with the spec, the code is updated. No invented requirements, IA, layouts, or components.
>
> This roadmap sequences the gap between the **current** implementation (Obsidian/indigo design system, modal-based navigation, client-side analysis) and the **target** (Ivory/dark-first design system, routed app shell, server-owned improvement loop). It follows the strangler migration in Implementation Architecture §22 so production never breaks.

---

## Locked decisions (approved 2026-06-22)

1. **Migration approach: strangler behind feature flags.** New shell/screens land behind `ui.newShell` / `ui.screen.*`; the current modal app keeps working until each screen is cut over (Architecture §22). Temporary dual code is accepted.
2. **Analysis stays client-side for v1.** Ship the redesign on the existing client Stockfish worker. The server-owned Edge Function pipeline (Architecture §2/§10) is **deferred** — Phase 11 drops the pipeline build and keeps only additive schema/data work needed by the new screens. This is a conscious, documented deviation from spec §2/§10 for v1.
3. **Differentiator screens build on typed sample/derived data.** Dashboard/Improve/Progress/Weaknesses render against typed fixtures + values derived from existing aggregates (`move_analysis`, `game_analysis_results`, `user_statistics`), with query hooks shaped for the real data so the swap is mechanical.
4. **Hosting stays Vercel.** Documented deviation from Architecture §21 (Netlify). CI/preview adapt to Vercel.

> Consequence for effort: total drops to **≈ 12–16 weeks** (no server pipeline). Phase 11 is re-scoped to hardening + additive migrations + sample→live data swap, not pipeline construction.

---

## Legend

- **Risk:** 🟢 Low · 🟡 Medium · 🔴 High
- **Affected files** lists the principal paths; supporting files (tests, types, barrels) are implied.
- Every phase's Definition of Done = System Design §15 (visual/functional/responsive/a11y/production) **and** Implementation Architecture §25 (code quality/fidelity/a11y/responsive/states/testing/perf/analytics/security/docs).

---

## Phase 1 — Design Token Foundation

**Objectives**
- Replace the existing **Obsidian** token system (indigo `#7B6CF6`, cold `#0C0E12`, DM Sans, `--cm-*` names) with the approved **Ivory** system from System Design §5: warm near-black `--bg #0C0B0A`, ivory accent `--accent #EBD9B8`, Onest + JetBrains Mono, the exact token names the spec uses (`--bg`, `--surface-1..3`, `--text-hi/body/mid/low/faint`, `--accent*`, `--mq-*`, `--board-*`, semantic, spacing, radii, shadows, motion, focus).
- Define dark (`:root`) + light (`[data-theme="light"]`) themes (§5.1–5.2).
- Implement the three theme tweaks — Accent (Ivory/Periwinkle/Sage/Clay), Board (Wood/Slate/Tournament), Density (Cozy/Comfortable/Spacious) — as data-attributes that recolor live (§5.10).
- Bind the Tailwind preset strictly to tokens (no ad-hoc values); load Onest + JetBrains Mono with `font-display:swap`.
- Motion + focus utilities (`--dur-*`, `--ease-*`, `--focus-ring`), reduced-motion handling.

**Affected files**
- `src/styles/tokens.css` (new — replaces token block in `src/style.css`), `src/styles/globals.css`, `tailwind.config.js`, `index.html` (font preload), `postcss.config.js`.
- Compatibility shim: keep `--cm-*` aliases mapping to new tokens during migration, removed in Phase 11.

**Risk:** 🔴 High — the entire app currently renders on `--cm-*` inline styles (682 references). A bad alias map breaks every screen at once.

**Dependencies:** none.

**Acceptance criteria**
- Styleguide reproduced 1:1 from tokens (colors, type scale, radii, shadows, halos).
- Theme switch recolors accent/board/density live with no reload.
- AA contrast verified for body + essential UI on their surfaces.
- Existing screens still render (via alias shim) with no console errors.

**Testing**
- Unit: token-resolution snapshot; contrast assertions (axe color-contrast on a token harness page).
- Visual: styleguide page snapshot (desktop + mobile) vs spec.

---

## Phase 2 — Core UI System

**Objectives**
- Bring the approved component library (§6) to token-true parity and fill gaps.
- **Rework to tokens (keep API where sound):** Button (variants primary/secondary/ghost/accent-bright per §6, not the current indigo set), Input/textarea/search, SegmentedControl, Toggle, Modal→Dialog + Sheet (mobile), Toast, Badge, Chip, Drawer, LoadingSpinner, MarkdownRenderer.
- **Replace:** `Card` (currently raw Tailwind `bg-white dark:bg-gray-800` — off-system) with token-based Card (standard/hero/category variants + halo).
- **Create (missing):** MetricCard, Tabs (underline, Analysis-default semantics), Dropdown, Avatar, Skeleton, EmptyState, ErrorState, ProgressBar (token), Chip move-quality variant.
- Every primitive ships all mandatory states + visible focus + 44px mobile targets + correct ARIA (§6, §11).

**Affected files**
- `src/components/ui/*` (rework + new), `src/components/ui/index.ts` barrel.

**Risk:** 🟡 Medium — broad surface; primitives are reused everywhere downstream.

**Dependencies:** Phase 1.

**Acceptance criteria**
- Each primitive matches §6 spec, uses tokens only, exposes rest/hover/active/focus/disabled (+loading where relevant).
- Tabs enforce "Analysis default / Coach never auto-selected" contract at the component level.
- A11y: roles correct (tablist/tab/tabpanel, radiogroup, dialog aria-modal), focus ring visible, no color-only meaning.

**Testing**
- Component (Vitest + Testing Library): every primitive, every state, keyboard interaction, aria attributes.
- Visual snapshots per primitive (light + dark).

---

## Phase 3 — App Shell

**Objectives**
- Introduce **React Router** (SPA routes per Architecture §4) replacing the current `openModal` state-machine navigation.
- Build the persistent left **Sidebar** (desktop): brand, search (`⌘K`), nav items in IA order — Dashboard / Games / Analysis / Improve / Coach (§3) — with active state + count badge, Collections group, user block pinned bottom.
- Build the mobile **BottomTabBar** (Home/Games/Analysis/Improve, 64px) + Coach via contextual entry.
- **Command Menu** (`⌘K`) overlay: go-to, recent games, actions; arrow-nav/Enter/Esc.
- Introduce **TanStack Query** (provider, query-key conventions, staleTime) and **Zustand** stores (uiStore, themeStore, commandMenuStore, analysisStepperStore).
- Responsive shell: sidebar → icon rail/top bar (tablet) → bottom tab bar (mobile); route-change focus management + 320ms page transition (reduced-motion aware).
- Auth guard wrapping all routes except `/login`; `/` → `/dashboard`; first-run → `/games/import`.

**Affected files**
- `src/main.tsx` (providers), `src/App.tsx` (shell + route table — major rewrite), `src/routes/*` (new thin route files), `src/components/nav/{Sidebar,BottomTabBar,CommandMenu,Search}.tsx`, `src/stores/*`, `src/services/queryClient.ts`.

**Risk:** 🔴 High — replaces the app's entire navigation/state backbone. Behind `ui.newShell` flag per §23 so old modal app coexists during migration.

**Dependencies:** Phases 1–2.

**Acceptance criteria**
- Navigate all five destinations + secondary routes; `aria-current="page"` correct.
- `⌘K` opens, searches, executes; Esc closes; focus restored.
- Shell adapts correctly across desktop/laptop/tablet/mobile breakpoints (§10).
- Query + Zustand wired; no Context re-render storms.

**Testing**
- Integration: route table renders, auth guard redirects, first-run forces import.
- Component: Sidebar/BottomTabBar active state, CommandMenu keyboard nav.
- E2E: navigation across all destinations; `⌘K` flow.

---

## Phase 3.5 — Shell Compliance Remediation _(inserted after the Phase 3 design audit)_

**Status:** ✅ Complete (PR open, awaiting approval). Shell-compliance-only; no screens, no new features.

**Objective**
- Eliminate shell-level design drift before screen work, per `DESIGN_COMPLIANCE_AUDIT.md` high-priority findings.

**Scope delivered**
1. **Command menu a11y** — focus trap + Tab loop (combobox pattern), Esc, focus restoration to trigger; options non-tabbable via `aria-activedescendant`.
2. **Accessibility automation** — jsdom component axe smoke tests (`src/test/axe.ts`), Playwright a11y e2e with real-browser contrast (`e2e/shell-a11y.spec.ts`), explicit `accessibility` CI job (fails on regressions), skip-to-content link, `Avatar` `role="img"`.
3. **Sidebar IA** — primary nav = Dashboard/Games/Analysis/Improve/Coach only; Settings/Profile → `UserMenu` pinned bottom; Weakness/Progress → Improve sub-views; Import → off Games (§3).
4. **Typography primitives** — `.iv-display/.iv-h1…/.iv-data` bound to scale tokens; shell components use them, no inline `font:`.
5. **Responsive architecture** — four-tier breakpoints (§10): mobile / tablet icon-rail / laptop / desktop.

**Affected files**
- `src/components/nav/{CommandMenu,Sidebar,UserMenu,BottomTabBar}.tsx`, `src/app/{AppShell,AppRouter,navigation,PlaceholderPage}.tsx`, `src/components/ui/iv/{Avatar,Tabs,Dialog}.tsx`, `src/styles/globals.css`, `src/app/shell.css`, `src/test/axe.ts`, `e2e/shell-a11y.spec.ts`, `.github/workflows/ci.yml`, tests.

**Risk:** 🟡 Medium — touches the shell backbone, but legacy app untouched and `ui.newShell` stays flagged OFF.

**Acceptance (met)**
- All 10 audit items ✅ (see audit's Phase 3.5 Remediation Report); typecheck/lint/unit/e2e/a11y/build green; production unchanged.

**Testing:** unit 177 passing (+ component axe), a11y e2e 4/4, full Playwright suite, build verification.

---

## Phase 4 — Dashboard

**Status:** ✅ Built + UX-refined (PR open on `feature/phase-4-dashboard`, awaiting review). Behind `ui.screen.dashboard`; typed sample/derived data (locked decision #3). See `DASHBOARD_IMPLEMENTATION_PLAN.md`.

**Objectives**
- Build `/dashboard` per System Design §7: Greeting + primary CTA; Row1 Improvement Score (ScoreRing + 2 MetricCards) + Rating trend (SegmentedControl + LineChart); Row2 Biggest weaknesses (3 compact WeaknessCards) + Recommended-this-week FocusCard (hero); Row3 Recently analyzed (5 compact GameRows) + Coach summary + Roadmap timeline.
- Build supporting charts: **ScoreRing**, **LineChart (RatingChart)**, compact **WeaknessCard**, compact **GameRow**, **FocusCard**, **CoachCard**, **RoadmapTimeline**.
- All four states (loading skeletons / new-user onboarding empty / per-card error+Retry / success).
- Mobile score-first re-thought hierarchy (§4.11, §7).

**Affected files**
- `src/features/dashboard/*`, `src/components/charts/{ScoreRing,LineChart}.tsx`, `src/components/coach/CoachCard.tsx`, `src/features/dashboard/hooks/*` (queries: `useImprovementScore`, `useRatingHistory`, `useTopWeaknesses`, `useWeeklyFocus`, `useCoachSummary`, `useRecentGames`, `useRoadmap`).

**Risk:** 🟡 Medium — depends on data that the backend (Phase 9/11 pipeline) must supply; initial build uses typed query stubs/derived values from existing aggregates.

**Dependencies:** Phases 1–3.

**Acceptance criteria**
- Matches §7 hierarchy; range Segmented Control re-renders chart (200ms).
- User can name #1 weakness and start recommended action ≤1 click within 5s of load (§4.1 success criteria).
- All four states implemented; mobile order correct.

**Testing**
- Component: ScoreRing/LineChart aria-labels + data accuracy; card states.
- Integration: loader four-states; range switch; focus CTA routes to `/improve`.
- E2E: dashboard load + focus CTA journey.

---

## Phase 5 — Analysis Workspace

**Status:** ✅ **COMPLETE** — merged (PR #23). Behind `ui.screen.analysis`; client-side analysis on typed sample/derived data (decisions #2/#3/#4). Spec taxonomy `brilliant·best·good·inaccuracy·mistake·blunder` (legacy `excellent→best`). See `ANALYSIS_WORKSPACE_DISCOVERY.md`, `ANALYSIS_WORKSPACE_VISUAL_ARCHITECTURE.md`, `PHASE_5_IMPLEMENTATION_PLAN.md`. Deferred to Phase 11: real client-Stockfish runner, persisted analysis, `move_analysis` taxonomy migration.

**Objectives**
- Build `/analysis/:id` per System Design §8 (the most detailed screen).
- Board column: PlayerBars (avatar, mono rating·color, clock), **BoardContainer** + **EvalBar**, BoardControls (⏮‹›⏭ + Flip + material), **EvalTimeline** card.
- Analysis column: **Tabs [Analysis* | Coach | Lines]** (Analysis default, Coach never auto-open), accuracy summary (2 MetricCards), move-quality counts (chips/dots), **InsightCard** (default content), subordinate **CoachCard** note, **MoveList** (independent scroll, current move highlighted, quality dot per move).
- Keyboard nav (←/→ step, ↑/↓ start/end, `f` flip); step syncs all panels in lockstep (200ms).
- "Best move" reveal; **"Send to Improve"** mistake→plan action + toast.
- States: loading (board paints from PGN, panel skeleton), failure (+Retry, board stays usable), clean-game positive state.
- Tablet (60/40 or stack) + mobile (board-first, controls row, tabs→segmented, coach collapsed).

**Affected files**
- `src/features/analysis/*` (BoardContainer, EvalBar, EvalTimeline, MoveList, InsightCard, BoardControls, useStepper, useStockfishClient), `src/components/charts/EvalBar.tsx`, reuse `src/lib/{pgn,moveAnalysis,motifs}.ts`, `src/lib/stockfish.ts`.
- Migrates/replaces existing `GameViewer.tsx` (910 LOC) + `EnginePanel.tsx` (795 LOC) + `chess/ChessBoard.tsx` + `EvaluationGauge.tsx`.

**Risk:** 🔴 High — largest, most interaction-dense screen; must preserve chess conventions exactly (§14.6) and keep Coach subordinate (§14.7). Reuses substantial existing engine logic but re-homes the layout.

**Dependencies:** Phases 1–3 (Dashboard not required, but charts/primitives are).

**Acceptance criteria**
- Matches §8; Analysis is default tab; Coach never auto-opens; Lines shows variations.
- Move stepping syncs board/eval bar/timeline/insight/move-list together.
- Turning-point jump works; loading/failure/clean-game states implemented.
- Mobile stack + segmented tabs; keyboard nav complete.

**Testing**
- Unit: stepper logic, classification mapping, SAN/FEN formatting.
- Component: board paints before analysis; Coach-never-auto-open invariant; move-step sync.
- E2E: open game → step turning points → send mistake to Improve; failed-analysis Retry.

---

## Phase 6 — Improve Hub

**Status:** ✅ **COMPLETE** — merged (PR #24; crash-guard hotfix PR #25). Behind `ui.screen.improve`; typed sample/derived (decision #3). Delivered weekly focus, RadarChart skill profile, weakness categories + filter, study plan (ingests `cm.improveQueue`), and **chess study goals** (not generic milestones). See `PHASE_6_*.md`, `IMPROVE_HUB_VISUAL_ARCHITECTURE.md`, D-013.
> **Sub-view added (the "Phase 7" workstream):** **Improve · Review Mistakes** at `/improve/mistakes` — merged (PR #26). The single mistake feed (reuses the B-4 `lib/mistakeReview` engine ∪ Send-to-Improve queue), master/detail, one Primary per mistake. Per Gate-0 this is an **Improve sub-view, not a new IA destination**, so the roadmap below is unchanged. See `PHASE_7_*.md`, D-014.

**Objectives**
- Build `/improve` per System Design §9 — the product differentiator.
- Header + provenance; **Weekly focus** hero (✦ label, title, rationale, 2 MetricCards, Primary "Continue · session N", halo); **Skill profile** RadarChart (you vs peers); **Weakness profile** category filter (Segmented) + 2×2 **WeaknessCategoryCards**; **Recommended study plan** (ordered StudyPlanRows, first highlighted); **Milestones** timeline.
- Build charts/components: **RadarChart**, **WeaknessCategoryCard**, **StudyPlanRow**, **MilestoneTimeline**, FocusCard (hero, shared with Dashboard).
- Implement the insight→action path (§9): each weakness links to a concrete training action; one Primary per view.
- Mobile: weekly focus first, categories→filter chips, cards stack, study plan as cards.

**Affected files**
- `src/features/improve/*`, `src/components/charts/RadarChart.tsx`, `src/lib/learning/*` (curated learning-objectives catalog, Architecture §12), queries `useWeaknessProfile`, `useSkillProfile`, `useStudyPlan`, `useMilestones`, `useWeeklyFocus`.
- Builds on existing `src/lib/weaknessProfile.ts`, `src/hooks/useWeaknessProfile.ts`, `src/lib/mistakeReview.ts` (B-3/B-4 read-only work).

**Risk:** 🔴 High — the differentiator and the most spec-defined-but-not-yet-built logic (plan composition, objective mapping). Depends on weakness/plan data the backend must produce.

**Dependencies:** Phases 1–5 (consumes Analysis-tagged motifs / "send to Improve").

**Acceptance criteria**
- Matches §9; "what should I work on next?" answerable at a glance.
- Each weakness → concrete training action; exactly one Primary action.
- Mobile chips + stacks; radar guarantees label margins.

**Testing**
- Unit: plan composition (`build-plan` ordering), weakness→objective mapping.
- Component: RadarChart aria-label; category filter; study-plan order.
- E2E: insight→action (start session) updates progress.

---

## Phase 7 — Game Library

**Status:** ⏳ **Next (unbuilt).** Note: the "Phase 7" *workstream* just merged (Review Mistakes) was an **Improve sub-view**, not this phase — Game Library + Import remains the next roadmap screen. See `NEXT_PHASE_RECOMMENDATION.md`.

**Objectives**
- Build `/games` per System Design §4.2: Header + import actions; **Quick-insight strip** (3 MetricCards: most common mistake / best opening / avg accuracy); **Filter toolbar** (search, result, color, time control, sort); **Collections** (saved smart-filters); **GameTable** (desktop) ↔ **GameCardList** (mobile, ≤767).
- Build `/games/import` per §4.3: source picker (paste/upload/connect), drop zone, parsed-preview list, import progress, errors explained + recoverable.
- Components: GameRow (full), ImprovementTag, StatusBadge, QuickInsightStrip, FilterToolbar, Collections, PgnDropzone, ParsedPreviewList, ImportSourcePicker.
- Locate any game in ≤2 actions; analysis status unambiguous at a glance.

**Affected files**
- `src/features/games/*`, `src/features/import/*`, queries `useGames(filters)`, `useLibraryInsights`, `useCollections`, `useImportPreview`, `useConnectedAccounts`.
- Replaces existing `game/GameList.tsx` (942 LOC sidebar list + import) — logic salvageable, layout rebuilt as table/cards.

**Risk:** 🟡 Medium — table↔card responsive + virtualization for long lists; import parsing reuses proven `lib/pgn.ts` + `workers/pgnWorker.ts`.

**Dependencies:** Phases 1–3.

**Acceptance criteria**
- Filter/search/sort work; table↔card adaptation at breakpoint; open game → Analysis.
- Import: paste→preview→queue with status; bad PGN error with fix path.
- All four states; virtualized long lists.

**Testing**
- Integration: filter/sort/search; import paste→preview→queue; bad-PGN error.
- Component: table↔card responsive; row click target.
- E2E: locate a game in ≤2 actions; import journey.

---

## Phase 8 — Coach

**Objectives**
- Build `/coach` per System Design §4.5 as a **peer** feature (never centerpiece, never full-screen chatbot — §14.7): context header (game/move/weakness), guided explanation thread, suggested follow-ups, "back to analysis/plan" return, constrained prompt input, read-only mini board.
- Wire the in-Analysis **Coach tab** (built in Phase 5) and Coach cards across screens to this context.
- Server: `coach-respond` Edge Function (Architecture §11) — Gemini, server-only key, allow-listed structured facts only, citations, low temperature, AI-failure fallback that never blocks the deterministic core.

**Affected files**
- `src/features/coach/*`, `src/components/coach/{CoachCard,CoachThread}.tsx`, queries `useCoachSession`, `useCoachContext`.
- Server: `supabase/functions/coach-respond/` (evolves existing `chess-mentor/index.ts`, which already does Gemini + CORS + service-role).

**Risk:** 🟡 Medium — existing `chess-mentor` function provides a working base; main work is the fact allow-list, citations, and keeping Coach visually/architecturally subordinate.

**Dependencies:** Phases 1–5 (Coach context originates from Analysis/Improve).

**Acceptance criteria**
- Coach never the first thing seen on Analysis; always returns user to originating context.
- Reads as a guide, not a generic chatbot; responses cite fact refs.
- AI failure → "can't reach coach" fallback; Analysis insights unaffected.

**Testing**
- Integration: coach-respond context allow-list; citation persistence; AI-failure fallback.
- Component: CoachThread, return-to-context.
- E2E: ask scoped question → return to analysis.

---

## Phase 9 — Progress + Weaknesses

**Objectives**
- Build `/weaknesses` (§4.7): stat tiles, rating trend, skill radar, ranked weakness list (frequency, trend sparkline, impact, practice CTA), phase accuracy. Components: MetricCard, RatingChart, RadarChart, full WeaknessCard, **Sparkline**, ProgressBar, CoachCard.
- Build `/progress` (§4.8): rating-over-time (range switch 30d/90d/1y/all), accuracy trend, phase accuracy, streak/peak stats, milestones achieved.
- Server progress math as pure unit-tested functions (Architecture §13): rating/accuracy/phase trends, weakness trend windows, **Improvement Score** composite (documented weights), milestone recompute.

**Affected files**
- `src/features/weaknesses/*`, `src/features/progress/*`, `src/components/charts/Sparkline.tsx`, `src/lib/progress/*` (pure functions), queries `useAccuracyTrend`, `usePhaseAccuracy`, `useRatingHistory`, `useMilestones`.
- Reworks existing `stats/WeaknessProfile.tsx` (193 LOC) + `stats/ProgressBar.tsx` (568 LOC) + `stats/StatsDashboard.tsx` (513 LOC).

**Risk:** 🟡 Medium — formulas must be deterministic + tested; requires `rating_history`, `weaknesses`, phase data from the backend (Phase 11 pipeline / additive migrations).

**Dependencies:** Phases 1–6.

**Acceptance criteria**
- Each weakness shows frequency + direction + one-click practice entry.
- Trend direction + biggest driver obvious; range switch works.
- Improvement Score reproducible from documented formula.

**Testing**
- Unit: every `lib/progress` formula incl. Improvement Score + clamping.
- Component: Sparkline/RadarChart aria-labels; range switch.
- Integration: four states; weakness practice CTA routes to Improve.

---

## Phase 10 — Settings + Profile

**Objectives**
- Build `/settings` (§4.9): account, connected platforms, analysis depth, appearance (Accent/Board/Density tweaks), notifications — form rows, Input, Toggle, SegmentedControl, Dropdown; preferences persist (`profiles.prefs`).
- Build `/profile` (§4.10): identity, rating, play-history summary, achievements — Avatar, MetricCard, RatingChart, MilestoneTimeline.

**Affected files**
- `src/features/settings/*`, `src/features/profile/*`, queries `useProfile`, `useConnectedAccounts`, `usePreferences`.
- Replaces `layout/ProfileModal.tsx` (237 LOC); appearance controls drive the Phase 1 theme tweak attributes.

**Risk:** 🟢 Low — bounded forms over an established profile/prefs model.

**Dependencies:** Phases 1–3 (theme tweaks from Phase 1).

**Acceptance criteria**
- Connected accounts + analysis prefs editable and persist; theme tweaks apply without breakage.
- Profile shows current rating, peak, headline improvement at a glance.

**Testing**
- Integration: settings save + persist; save-error toast.
- Component: theme tweak controls recolor live.

---

## Phase 11 — Production Hardening

**Objectives** _(re-scoped per Locked Decision 2 — server pipeline deferred)_
- **Backend alignment (Architecture §8–10, additive only):** additive migrations to reach the target schema — extend `games` (eco, opening_name, time_control, source, analysis_status, content_hash), add `analyses`, extend `moves`, add `weaknesses`, `improvement_plans`, `training_sessions`, `milestones`, `coach_sessions`/`coach_messages`, `rating_history`, `events`. RLS on every new table. Populate from the **client-side** analysis flow (analysis stays on-device for v1) + backfill jobs.
- **Sample → live data swap:** replace the typed fixtures/derived values behind Dashboard/Improve/Progress/Weaknesses query hooks with reads from the new tables, mechanically (hooks were shaped for this in Phases 4/6/9).
- **Deferred (NOT in v1):** server Edge Function pipeline (`run-analysis`/`classify-moves`/`detect-weaknesses`/`build-plan`/`recompute-progress`), `analysis_jobs`, `pg_cron`. Tracked as a post-v1 milestone.
- **Cross-cutting:** all four data states audited on every surface; full a11y audit (axe in CI, keyboard, reduced-motion); performance budgets (§18 — code-split, lazy Stockfish WASM, virtualization, font preload); analytics events (§15–16); security (RLS verified, no client secrets, zod validation, rate limits).
- **Migration cutover (§22 phase 4):** flip flags to new screens 100%, remove legacy components/routes + `--cm-*` alias shim, drop dead columns after deprecation window.

**Affected files**
- `supabase/migrations/*` (new, additive), `supabase/functions/*` (new pipeline fns), `src/services/*`, `src/lib/{classification,progress,learning}/*`, CI config, `vercel.json`/Netlify config.

**Risk:** 🔴 High — touches production data + the server pipeline; must not break live users. Staged: internal → canary → 100% per screen with instant flag rollback.

**Dependencies:** Phases 1–10.

**Acceptance criteria**
- Every screen meets System Design §15 + Architecture §25 Definition of Done.
- Pipeline runs async (<30s/typical game), idempotent, with failure→Retry; partial moves persisted.
- axe passes; perf budgets met; analytics events emitted; legacy removed; no off-system tokens remain.

**Testing**
- Full unit/component/integration/E2E suites green; Playwright visual diffs vs approved mockups (desktop + mobile, all screens).
- Pipeline integration: import→analyze→detect→plan→progress; failure/retry; RLS isolation tests.
- a11y (axe) + reduced-motion + performance regression checks in CI.

---

## Cross-phase dependency graph

```
P1 Tokens ─┬─► P2 UI ─┬─► P3 Shell ─┬─► P4 Dashboard
           │          │             ├─► P5 Analysis ─► P6 Improve ─► P9 Progress+Weaknesses
           │          │             ├─► P7 Library
           │          │             └─► P8 Coach (needs P5)
           │          └────────────────► P10 Settings+Profile
           └──────────────────────────────────────────────► P11 Hardening (needs P1–P10)
```

Backend/data work (target schema + pipeline) is consolidated in **P11** but its additive migrations may land earlier (Architecture §22 phase 1/3, "parallel foundation") to unblock real data for P4/P6/P9 — gated behind feature flags so nothing user-visible changes until a screen is cut over.
