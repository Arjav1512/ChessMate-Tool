# Next-Phase Recommendation (post Improve + Review Mistakes)

> **Authority re-read:** `CHESSMATE_SYSTEM_DESIGN.md` (§3 IA, §4 screens), `CHESSMATE_IMPLEMENTATION_ARCHITECTURE.md`, `IMPLEMENTATION_ROADMAP.md`, `PROJECT_STATE.md`, `DECISION_LOG.md`. **No implementation / branch / PR.**
> **Date:** 2026-06-24.

## TL;DR
**Build roadmap Phase 7 — Game Library + Import next.** It is the only remaining gap that is simultaneously (a) a top-level IA destination, (b) the **entry point** of the improvement loop, and (c) the **prerequisite for replacing sample/derived data with real data** across every screen already shipped. **No roadmap reordering is needed.**

---

## Where we are (reconciliation)
The IA (§3) defines 5 primary destinations, ordered to mirror the improvement loop:
**Dashboard → Games → Analysis → Improve → Coach.**

| Primary destination | State |
|---|---|
| ◉ Dashboard (P4) | ✅ shipped (sample data) |
| ▦ **Games** (P7) | ❌ **placeholder** |
| ◎ Analysis (P5) | ✅ shipped (sample data) |
| ▲ Improve (P6) + Review Mistakes | ✅ shipped (sample data) |
| ✦ **Coach** (P8) | ❌ placeholder |

Only **Games** and **Coach** remain. Secondary/owned routes still open: Game **Import** (off Games), Settings, Profile. Weakness Profile + Progress are **Improve sub-views** (D-004) and are already surfaced at summary level inside Improve.

**The defining fact:** Dashboard, Analysis, Improve, and Review Mistakes all run on **typed sample/derived data** because there is no way to get a real game into the system yet. Games + Import is the missing front door.

---

## Phase comparison (ROI · dependencies · risk · effort)

| Phase | ROI | Depends on | Risk | Effort | Notes |
|---|---|---|---|---|---|
| **7 — Game Library + Import** | **Highest** | none (PGN parser + `games` table exist) | Low–Med | **Med** | Completes 4/5 primary nav; **first real data** in the app; unblocks de-sampling everywhere. Strong reuse: `lib/pgn.ts`, `lib/pgnLimits.ts`, legacy `components/game/GameList.tsx`, Supabase `games`. |
| 8 — Coach | Medium | real games + analysis to coach about; Gemini wiring | Med | Med | Coach is **secondary by design** (§14.7) — a peer/contextual surface, not a destination users live in. Lower value before real data exists to explain. |
| 9 — Progress + Weaknesses | Low–Med | real analysis history; `weaknessProfile` (exists) | Low | Med | These are **Improve sub-views**; Improve already shows their summary (radar, categories, study goals). Standalone depth can wait until there's real history to chart. |
| 10 — Settings + Profile | Low | themeStore (exists) | Low | Low–Med | Polish/account surface; no loop value. Appearance controls already have the store. |
| 11 — Production Hardening (data layer, server analysis, cutover) | High (eventual) | **needs ingestion first** (P7), then screens to wire | High | **High** | The de-sampling/cutover phase. Cannot meaningfully start before games can be imported — P7 is its precondition. |

---

## Recommendation

### 1. Recommended next phase — **Phase 7: Game Library + Import**
Why it is next:
- **Completes the primary IA.** It is the #2 destination and, with it, 4 of 5 primary screens are real (only Coach remains).
- **It is the loop's entry point.** §3: Games → Analysis → Improve. Today the loop has no front door — there is no import and no library. Everything downstream is a demo.
- **It is where real data begins.** Imported PGNs are genuine user games. P7 is the first phase that is *not* inherently sample-based, and it is the lever that starts paying down the pervasive "sample/derived" debt now spanning four merged screens. It is also the hard prerequisite for Phase 11 (you cannot build a data/cutover layer with nothing to ingest).
- **Lowest unblock cost.** Reuses an existing, tested PGN parser (`lib/pgn.ts` + `pgnLimits`), the `games` table, and a legacy list to restyle in Ivory — no new infra.

Highest-ROI **milestone within P7:** ship **Game Import (§4.3)** first (paste/upload/connect → parsed preview → stored game). A single imported, parsed game immediately makes Analysis → Review Mistakes → Improve operate on something real — the biggest single jump in product credibility. The Library/table (§4.2) follows.

### 2. Roadmap order — **no change recommended.**
The existing sequence (7 Games → 8 Coach → 9 Progress/Weakness → 10 Settings → 11 Hardening) already follows the IA loop and the dependency graph. The only clarification (already applied to the roadmap/PROJECT_STATE): the just-merged "Phase 7 workstream" was **Improve · Review Mistakes**, an Improve sub-view — it did **not** consume roadmap Phase 7, which remains Game Library + Import.

### 3. Why the other phases should wait
- **Coach (8)** — secondary by design; far more useful once there are real games/analyses to explain. Build after the data front door.
- **Progress/Weaknesses (9)** — already represented as Improve summaries; standalone depth needs real history, which P7 begins to supply.
- **Settings/Profile (10)** — no loop value; safe to defer to pre-GA polish.
- **Hardening (11)** — highest eventual value but **gated on P7** (ingestion) and on the screens that will consume live data; doing it now would be building a pipeline with no inlet.

### 4. Dependencies between remaining phases
```
P7 Games+Import ──► (real data) ──► P11 Hardening (de-sample Dashboard/Analysis/Improve/Review-Mistakes,
       │                                            server analysis, move_analysis migration, cutover)
       ├──► P8 Coach (real games/analysis to explain)
       └──► P9 Progress/Weakness (real history to chart; weaknessProfile already built)
P10 Settings/Profile — independent, low priority (themeStore exists)
```

### 5. Recommended implementation sequence for the remainder
1. **P7 — Game Library + Import** (Import first, then Library). *Next.*
2. **P9 — Progress + Weaknesses** as Improve sub-views, once P7 yields real history (small, reuses `weaknessProfile`). *Optionally fold the lightweight version into the Improve cluster.*
3. **P8 — Coach**, wired to real games/analysis.
4. **P11 — Production Hardening** — the big de-sampling/cutover: swap every screen's sample adapter for live data (`useMistakeReview`, `weaknessProfile`, rating/plan/milestone tables), server analysis pipeline, `move_analysis` taxonomy migration, legacy removal, flag flip.
5. **P10 — Settings + Profile** — polish, any time after P7 (can slot earlier if a settings need arises).

### Roadmap changes recommended
- **None to ordering.** Keep P7 next.
- **Documentation clarity (done):** PROJECT_STATE + ROADMAP now distinguish the "Phase 7 workstream" (Review Mistakes, merged) from **roadmap Phase 7 (Game Library + Import, unbuilt)**.
- **Cheap follow-up to fold in:** consume the `?ply=` param in Analysis so Review Mistakes' "Open in Analysis" lands on the exact move (small; natural to do alongside P7's Games→Analysis wiring).

---
*Recommendation only — no implementation, branch, or PR. Awaiting approval to begin Phase 7 discovery.*
