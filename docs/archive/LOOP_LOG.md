# ChessMate — Loop Log

> Chronological record of the build loop (one entry per phase / working session). What was done, gates run, outcome. Newest last.

---

## 2026-06-22 · Phase 0 — Discovery
- Read both spec docs in full; audited the codebase.
- Produced gap analysis + `IMPLEMENTATION_ROADMAP.md` (11 phases). No code.
- Decisions approved: strangler behind flags · client-side analysis v1 · typed sample data · stay on Vercel.

## 2026-06-22 · Phase 1 — Design Token Foundation
- Added `src/styles/tokens.css` (Ivory §5: dark/light + Accent/Board/Density), `globals.css`, Tailwind token bindings, Onest font, `?styleguide` verification page.
- Strangler: legacy `--cm-*` untouched.
- Gates: typecheck ✅ · lint ✅ · build ✅ · tests ✅ (145, +11 token tests).

## 2026-06-22 · Phase 2 — Core UI System
- Built 18 Ivory primitives in `src/components/ui/iv/` + `iv.css` + `?components` gallery.
- Installed Testing Library; enabled jsdom cleanup + jest-dom.
- Gates: typecheck ✅ · lint ✅ (0 err) · build ✅ · tests ✅ (161, +16 component tests).
- Visual checkpoint: dark/ivory + light/periwinkle screenshots.

## 2026-06-22 · Phase 3 — App Shell
- React Router SPA + Sidebar + BottomTabBar + CommandMenu; TanStack Query + Zustand; `ui.newShell` flag; placeholder routes (no screens, no migration).
- Gates: typecheck ✅ · lint ✅ · build ✅ · tests ✅ (170, +9 flag/nav).
- Visual checkpoint: desktop shell, ⌘K, mobile.

## 2026-06-22 · Phase 3 — Design Compliance Audit
- Produced `DESIGN_COMPLIANCE_AUDIT.md` (10 items). Verdict: tokens/color/theme ✅; 7 areas partial. No code.

## 2026-06-22 · Phase 3.5 — Shell Compliance Remediation
- Branch `feature/phase-3-5-shell-compliance` off `prod/mistake-review-b4`.
- Fixed the high-priority audit findings:
  1. Command menu focus trap + Tab loop + Esc + focus restoration.
  2. Accessibility automation — jsdom component axe (`src/test/axe.ts`), Playwright a11y e2e w/ real-browser contrast (`e2e/shell-a11y.spec.ts`), explicit `accessibility` CI job, skip link, `Avatar role="img"`.
  3. Sidebar IA — primary nav only; `UserMenu` (Profile/Settings/Sign out); Weakness/Progress as Improve sub-views; Import off Games.
  4. Typography primitives (`.iv-display…/.iv-data`); removed inline `font:` in shell.
  5. Four-tier responsive breakpoints (§10) incl. tablet icon-rail.
- Docs: updated audit (Phase 3.5 report + scorecard) + roadmap; created `PROJECT_STATE.md`, `DECISION_LOG.md`, this log.
- Gates (local): typecheck ✅ · lint ✅ (0 err) · unit/component 177 ✅ · a11y e2e 4/4 ✅ · build ✅.
- Strangler intact: legacy app untouched, `ui.newShell` OFF by default.
- Outcome: PR #21 opened (base `prod/mistake-review-b4`); CI all green (incl. Accessibility (axe)). **Not merged.**

## 2026-06-22 · Phase 3.5 — CodeRabbit review round
- Triggered CodeRabbit manually (auto-review disabled on non-default base). 15 inline findings.
- Resolved 14 (commit `bfaae8e`): DEV-gated preview surfaces; AppRouter explicit throw; Button `type="button"` + loading sr-only name; Card native-click keyboard activation; Dialog `useId` title + guaranteed name; tokenized `--progress-track`; MetricCard SR delta direction; ProgressBar required name + numeric guards; flags/themeStore localStorage sanitization; Styleguide/Gallery `<html>` restore on unmount; 44px coarse targets on all nav rows.
- Skipped 1 with reason: Import stays a ⌘K Action (avoid duplicate "Go to" entry).
- Re-ran gates locally: typecheck ✅ · lint ✅ · unit 177 ✅ · a11y e2e 4/4 ✅ · build ✅. Pushed; CI re-running.

## 2026-06-23 · Phase 4 — Dashboard
- Branch `feature/phase-4-dashboard` off the merged shell (`prod/mistake-review-b4`).
- Discovery + `DASHBOARD_IMPLEMENTATION_PLAN.md` (gap analysis, layout, component mapping, data reqs).
- Built `/dashboard` (§7) behind `ui.screen.dashboard`: ScoreRing + LineChart charts; ImprovementScore/Rating/Weaknesses/Focus/Recent/Coach/Roadmap cards; typed sample/derived data hooks; all four states; mobile score-first reorder.
- Visual review gate → reviewer approved direction after a **UX refinement pass** (no redesign): explanatory+actionable score, de-emphasized rating, why+action on weaknesses, elevated roadmap, narrative question captions.
- Tests: component/integration (`dashboard.test.tsx` 12 + `dashboard.empty.test.tsx` 1); e2e a11y (`dashboard-a11y.spec.ts` 3) wired into CI accessibility job.
- Gates (local): typecheck ✅ · lint ✅ (0 err) · unit 190 ✅ · e2e 36 passed ✅ · build ✅ · dashboard axe (jsdom + real-browser contrast) ✅.
- Behind flag; legacy app untouched. PR to be opened (base `prod/mistake-review-b4`); not merged.

## 2026-06-23 · Phase 5 — Analysis Workspace
- Discovery + visual architecture approved (`ANALYSIS_WORKSPACE_DISCOVERY.md`, `ANALYSIS_WORKSPACE_VISUAL_ARCHITECTURE.md`, `PHASE_5_IMPLEMENTATION_PLAN.md`); 5 decisions locked (Move List persistent + Tabs Analysis/Coach/Lines; taxonomy `excellent→best`; InsightCard one component/4 variants; auto-run progressive; Send-to-Improve on sample plan).
- Built M1–M5 behind `ui.screen.analysis`: BoardContainer (flip/last-move/aspect-ratio/mini), EvalBar, PlayerBars, BoardControls, EvalTimeline (playhead + turning points), stepper store; spec-taxonomy classifier; Tabs + InsightCard (4 variants) + persistent MoveList + AccuracySummary + counts + Lines; Coach peer tab + subordinate note; Send-to-Improve; route wiring; all four states; mobile re-think.
- Audit → remediation: fixed move-list contrast (AA), a11y chart-selector ambiguity; added 12 unit tests + analysis a11y e2e (wired into CI).
- CodeRabbit (PR #23): 8 findings → all resolved (reset-on-route-id, arrow-key scoping, Coach loading a11y name, EvalTimeline off-by-one, turning-point clamp, Send-to-Improve no-false-success, accuracy tie/%, currentcolor).
- Production verification: prod build healthy; dev-preview surfaces correctly disabled in prod; flags OFF → legacy served (strangler intact); dark/light + mobile + routing + flag gating verified. Verdict: production-ready.
- Gates: typecheck ✅ · lint ✅ (0 err) · unit 202 ✅ · a11y 11/11 ✅ · build ✅. **Merged (PR #23).**

## 2026-06-23 · Phase 6 — Improve Hub
- Discovery → visual architecture → 5 decisions locked (D-013); built behind `ui.screen.improve`: Weekly Focus hero (one Primary), RadarChart skill profile, weakness categories + filter, study plan (ingests `cm.improveQueue`), chess study goals.
- New: `lib/improve/{types,mapping,composePlan}`, `lib/learning/objectives`, `features/improve/*`, `components/charts/RadarChart`.
- CodeRabbit (PR #24): 5 findings → all resolved (composePlan empty guard, hooks null handling, RadarChart empty guard, fabricated-rationale removal, doc counts). PR #24 **merged early before the fix commit landed** → crash-guard **hotfix PR #25** cherry-picked the fixes (1 CodeRabbit doc-count comment resolved).
- Gates: typecheck ✅ lint ✅ unit 215 ✅ improve a11y 3/3 ✅ build ✅. **Merged (PR #24 + #25).**

## 2026-06-23 · Phase 7 workstream — Improve · Review Mistakes
- Gate-0 resolved the scope conflict: no standalone screen → **Improve sub-view** (D-014); roadmap Phase 7 (Game Library) untouched.
- Built `/improve/mistakes` (M1–M5): `features/improve/mistakes/*` reusing the **B-4 `lib/mistakeReview` engine** ∪ Send-to-Improve queue (`buildReviewFeed`, one source of truth), master/detail, one Primary per mistake ("Open in Analysis") + ghost "Add to study plan" (shared `cm.improveQueue`), phase/motif filters, four states. Taxonomy bridge via `mapLegacyClassification`.
- Visual review gate: desktop/mobile/empty/loading/error + 66-mistake scalability + the Analysis→Review loop. Removed the temporary dev forced-state helper; states wired to the hook contract.
- CodeRabbit (PR #26): 3 findings → all resolved (pathname trailing-slash, filtered-empty state + reset, queue-reactive feed via event/storage). Caught + fixed a CI a11y flake (axe sampled text mid-`.iv-page-enter` fade) with Playwright `reducedMotion: 'reduce'`.
- Gates: typecheck ✅ lint ✅ (0 err) unit 225 ✅ a11y e2e 24/24 ✅ build ✅. **Merged (PR #26).**
