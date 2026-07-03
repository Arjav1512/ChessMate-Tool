# Release Readiness Report — `prod/mistake-review-b4` (post-consolidation)

> Read-only audit after PR #32 merged the Ivory cutover + Phase 8A/8A.1 into the integration branch (`prod/mistake-review-b4` tip `60d6c78`). No code changed.
> **Two readiness lenses are reported separately** because they diverge sharply:
> **(A) as a flagged integration / internal demo** vs **(B) as the default production experience on `main`.**

## Headline
The **shell, UI system, accessibility, and the Game Library/Import flow are production-grade.** But **four of the five primary screens (Dashboard, Analysis, Improve, Review Mistakes) render typed sample/derived fixtures, not the user's real data**, and **Analysis is not wired to the games a user imports** — so the core loop *import → analyze → improve* is broken at the "analyze" step. Because the cutover defaults `ui.newShell` **ON**, promoting this to `main` as-is would show **fake data to real users**. **Not ready to promote to `main`.** It is, however, an excellent feature-flagged integration state.

---

## Per-area audit

### 1. Dashboard
- **Status:** UI complete (Phase 8A.1 — momentum line · Weekly Focus hero · "Your plan" rail). Data = **sample/derived** (`sampleDashboard.ts` via `useImprovementScore/WeeklyFocus/TopWeaknesses/Roadmap`).
- **Risks:** real users would see a fabricated score/focus/weaknesses → misleading.
- **Tech debt:** swap sample hooks → live aggregates (`move_analysis`, `user_statistics`).
- **UX debt:** vertical whitespace on tall viewports (intentional but loose).
- **Readiness:** **(A) 95% · (B) 50%** (looks done; shows fake data).

### 2. Games + Import
- **Status:** **Real data.** `useGames` queries the live `games` table; `useImportGames` parses (worker) + inserts real PGNs with progress/dedupe. The only genuinely live screen. Table-led finder (8A).
- **Risks:** import dedupe is signature-based (no DB unique constraint); "Open in Analysis" lands on Analysis but Analysis shows sample (see #3).
- **Tech debt:** opening/time-control/status **derived** at render (no persisted columns); `?ply=` passed but not consumed; Connect (Chess.com/Lichess) deferred/disabled.
- **UX debt:** table packs left at 1440 (minor).
- **Readiness:** **(A) 90% · (B) 82%** (production-capable; the downstream analyze step is the gap).

### 3. Analysis
- **Status:** UI complete (board hero, insight-led after 8A/8A.1, accuracy collapses gracefully). Data = **sample only** (`sampleAnalysis`, progressive). **Renders the sample game regardless of `:id`** — not connected to real imported games or a real engine run.
- **Risks:** **the import→analyze loop is broken** — a user imports a real game, opens it, and sees an unrelated sample analysis. This is the single most damaging production gap.
- **Tech debt:** wire the client Stockfish run to the selected game's PGN; persist `move_analysis`; consume `?ply=`.
- **UX debt:** eval-timeline sparse at the start position (inherent).
- **Readiness:** **(A) 90% · (B) 40%** (UI ready; not wired to real games).

### 4. Improve
- **Status:** UI complete (§9 — focus hero, radar, weakness 2×2, plan+goals; 8A.1). Data = **sample/derived** (`sampleImprove` + pure `composePlan`); **does** consume the real Send-to-Improve queue (`cm.improveQueue`).
- **Risks:** plan/weaknesses are fixtures → not the user's real improvement plan.
- **Tech debt:** swap sample weaknesses → live `weaknessProfile`; expand the curated `lib/learning` catalog; persist plan/milestones (Phase 11).
- **UX debt:** Study-Goals tail density; radar enlarges on tablet; "Time" radar axis is sample.
- **Readiness:** **(A) 95% · (B) 50%**.

### 5. Review Mistakes
- **Status:** UI complete (Improve sub-view; feed + drill, one primary). Data = **sample** (`sampleMistakes`) ∪ real `cm.improveQueue`. Live `useMistakeReview` (real `move_analysis`) not wired (Phase 11).
- **Risks:** mistakes are fixtures except the queued items.
- **Tech debt:** swap to live `useMistakeReview`; persist "reviewed" state.
- **UX debt:** none significant.
- **Readiness:** **(A) 95% · (B) 50%**.

### 6. Routing
- **Status:** AppRouter is the default runtime (post-auth) via the cutover. `/dashboard /games /games/import /games/:id→/analysis/:id /analysis(/:id) /improve(/mistakes)` live; `/weaknesses /progress /coach /settings /profile` = graceful `PlaceholderPage`.
- **Risks:** **Settings/Profile are placeholders** — account management is unavailable to a real user reaching them from the user menu. Coach (primary nav) is a placeholder.
- **Tech debt:** legacy `App.tsx` modal app still present (removal = Phase 11 cutover cleanup).
- **UX debt:** 5 destinations are "coming soon."
- **Readiness:** **(A) 90% · (B) 65%** (Settings/Profile gap matters for production users).

### 7. Feature flags
- **Status:** `ui.newShell` + `ui.screen.{dashboard,analysis,improve,games}` default **ON**; coach/weaknesses/progress/settings/profile default OFF. Resolution defaults ← localStorage ← URL; instant rollback via `?ff=-ui.newShell`.
- **Risks:** **default-ON is wrong for `main`** until the data is real — it would expose sample-data screens to production. For main, the shell should canary (default OFF or % cohort) per Architecture §22/§23.
- **Tech debt:** no server-side/cohort flagging (URL+localStorage only).
- **Readiness:** **(A) 90% · (B) 55%** (mechanism solid; default is integration-appropriate, not production-appropriate).

### 8. Real PGN flow
- **Status:** Paste/upload → worker parse → preview (new/dup/invalid) → insert into `games` → appears in Library. **Works end-to-end for ingestion.**
- **Risks:** the flow **dead-ends at analysis** (imported game → Analysis shows sample). One recommended next action after import is preserved, but it leads to non-real analysis.
- **Tech debt:** connect import → real analysis; auth/profile bootstrap is reused from legacy (sound).
- **Readiness:** **(A) 85% · (B) 70%** (ingestion real; downstream not).

### 9. Accessibility
- **Status:** **Strong.** 30/30 axe e2e across shell/dashboard/analysis/improve/review-mistakes/games/landing; AA contrast; route focus; one-primary; keyboard models; reduced-motion. Automated in CI.
- **Risks:** low — automated coverage is broad; no manual SR pass logged.
- **Tech debt:** none material; a manual screen-reader pass before GA would be prudent.
- **Readiness:** **(A) 95% · (B) 90%**.

### 10. Responsive
- **Status:** Verified desktop/laptop/tablet/mobile across phases; shell adapts (sidebar→rail→bottom bar); screens re-think layout (not shrink).
- **Risks:** low.
- **Tech debt:** none.
- **UX debt:** dashboard vertical whitespace (wide); Improve radar enlarges on tablet; games table packs left (1440) — all minor.
- **Readiness:** **(A) 92% · (B) 88%**.

---

## Overall readiness
- **(A) As a flagged integration branch / internal demo: ~92%** — coherent, accessible, premium; ready to keep building on.
- **(B) As the default production experience on `main`: ~55%** — gated by the sample-data reality and the broken import→analyze loop.

---

## Answers

### 1. Is the product ready to promote `prod/mistake-review-b4 → main`?
**No.** The code quality is there, but with `ui.newShell` default-ON, promotion would make authenticated production users land on Ivory screens that show **fabricated sample data** (Dashboard/Improve/Review-Mistakes) and an **Analysis screen disconnected from their real games**, plus **placeholder Settings/Profile**. That is a misleading/broken experience for real users. The code *can* go to `main` **only if the production flag default is OFF** (canary), so live users stay on the legacy app until the data is real.

### 2. What blockers remain (for a real-user default)?
1. **Sample/derived data** on Dashboard, Analysis, Improve, Review Mistakes — must be live before they're the default.
2. **Analysis not wired to real imported games** — the import→analyze→improve loop is broken at "analyze." (Highest-impact functional blocker.)
3. **Settings/Profile are placeholders** — account management unreachable for production users post-cutover.
4. **Cutover default-ON** is integration-appropriate, not production-appropriate — needs a canary default for `main`.

### 3. What should be fixed before Phase 9?
- **Decide the data-reality strategy** and, at minimum, **wire Analysis to the selected real game** (client-side Stockfish on the imported PGN) so the import→analyze loop works — this unblocks de-sampling everything downstream. Without it, Phase 9 (Progress/Weaknesses) would also be built on fixtures.
- Confirm `main`'s flag default = OFF (canary) so the legacy app keeps serving real users during the build-out.
- Optional polish: dashboard whitespace, tablet radar (low priority).

### 4. What can safely wait until Phase 11?
- Full **de-sampling** of Dashboard/Improve/Review-Mistakes to live hooks (`weaknessProfile`, `useMistakeReview`, rating/plan/milestone tables).
- **Persisted** game metadata columns (opening/time-control/status), server-side Collections/Favorites, server analysis pipeline + `move_analysis` taxonomy migration.
- **Connect Chess.com/Lichess** (deferred), **legacy `App.tsx` removal** (cutover cleanup), server/cohort feature flagging.
- Settings/Profile (Phase 10) and Coach (Phase 8) standalone screens are their own phases — until then they remain graceful placeholders, acceptable behind canary.

---
*Audit only — no implementation, branch, or PR.*
