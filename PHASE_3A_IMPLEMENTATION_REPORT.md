# PHASE_3A_IMPLEMENTATION_REPORT.md — Retrieval Activation (R1+R2+R3)

**Date:** 2026-07-09 · **Scope:** exactly R1–R3 from RETRIEVAL_IMPROVEMENT_PLAN.md.
**Not touched:** `KnowledgeRetriever` interface, orchestrator, service,
providers, transport, memory, knowledge documents, backend. No RAG, no
embeddings, no vectors.

---

## 1. Files changed (7 source + 3 test)

| File | Change |
|---|---|
| `src/coach/api/askCoach.ts` | **R1.** `MentorContext` extended (pgn, opening, ratings, userColor, `move` info block, playerRating); classification alias map normalizes both UI taxonomies (`brilliant→best`, unknowns dropped); `toCoachContext` exported for tests. |
| `src/features/analysis/CoachTab.tsx` | **R1.** Threads what `GameVM`/`AnalysisMoveVM` already held: pgn, eco/opening, both ratings, user color, and the move's san/number/color/phase/motifs/quality/cpLoss/bestSan. |
| `src/components/game/GameViewer.tsx` | **R1.** Threads pgn + user_color + the current move (san, move number, color, classification from the live per-ply map). `useCallback` deps updated (`classifications`). |
| `src/coach/context/contextBuilder.ts` | **R3.** Derives `player.rating` from game ratings + user color when not set explicitly. |
| `src/coach/retrieval/retriever.ts` | **R2+R3.** `queryFromContext` emits the `'opening'` fallback theme for opening-phase/known-opening questions; new `ratingBand` needle (`ratingBandOf`: <1200 / 1200–1800 / >1800) taken LAST so it fills only a spare slot. |
| `src/coach/retrieval/retriever.test.ts` | R2/R3 regression tests (below). |
| `src/coach/api/askCoach.test.ts` | New — R1 adapter mapping tests. |
| `src/coach/api/coachService.test.ts` | New — end-to-end zero-result-prevention tests. |

## 2. Before/after retrieval traces (measured with the real retriever)

**The production CoachTab context** (what actually reaches `queryFromContext`):

```
BEFORE (pre-R1 adapter dropped everything):
  query = { motifs: [] }                          → docs: []            ← every real question

AFTER (same UI state, context threaded):
  query = { opening: 'Sicilian, Open', theme: 'opening',
            motifs: [], ratingBand: 'intermediate' }
                                                  → docs: [openings/sicilian,
                                                           principles/opening_principles]
```

**Defense-name gap (R2)** — openings the detector recognizes but the corpus
doesn't cover:

```
BEFORE  Philidor/Petrov/Dutch/Benoni/Grünfeld/Vienna/Scotch  → []
AFTER   each of them                                         → [principles/opening_principles]
```

**Rating band (R3)** — middlegame question, no other match:

```
BEFORE  { player: { rating: 1500 } }   → []
AFTER   rating 900 → [rating/improving_under_1200]
        rating 1500 → [rating/improving_1200_1800]
        rating 2000 → [rating/improving_above_1800]
        (with two position-specific matches, the band doc is displaced — by design)
```

## 3. Measured results

| Metric | Before | After |
|---|---|---|
| Docs retrieved for a normal production analysis question | **0** | **1–2** (opening/motif/phase-specific + fallback) |
| Detector opening names (187) retrieving zero docs | **48** | **0** |
| Docs reachable via production needles | 25 | **28** (+3 rating docs) |
| Full unit suite | 352 | **363** (all passing) |
| Entry chunk | 434.52 kB | **434.52 kB** (byte-stable) |

## 4. Test evidence (11 new tests, all green)

- **Real production context:** `coachService.test.ts › a normal analysis-flow
  question retrieves knowledge into the prompt` — builds the exact
  post-R1 CoachTab context, asserts the prompt contains the knowledge block
  and the PGN-derived Sicilian doc.
- **Opening fallback:** `retriever.test.ts › R2: closes the Defense-name gap`
  — the seven named gap openings each retrieve `opening_principles`, never
  `[]`; covered openings keep their dedicated doc first. Plus query-derivation
  cases (opening-phase-without-name fires; middlegame does not; contextless
  does not).
- **Rating retrieval:** `ratingBandOf` boundary tests (0/null/1199/1200/1800/
  1801); band-doc retrieval per band; spare-slot-only displacement test;
  end-to-end derivation from game ratings + user color through the pipeline.
- **Zero-result prevention:** the pipeline test above is the permanent
  regression the audit demanded; the adapter tests
  (`askCoach.test.ts`) pin that every threaded field survives the mapping
  (and that unknown quality labels are dropped, not guessed).

Validation runs: `npm test` 363/363 · `tsc --noEmit` clean ·
`npm run lint` 0 errors (4 pre-existing warnings) · `npm run build` passes.

## 5. Remaining gaps (out of Phase 3A scope, unchanged from the plan)

- `strategy/pawn_structure` + `principles/king_safety` remain reachable only
  via sample-data motif ids (production detector never emits them).
- 28 theme docs (tactics/strategy/middlegame/practical) await R5
  question-keyword matching; 4 endgame docs stay shadowed until R4
  material-aware needles; weakness-summary needles are R6.
- The budget still fits ~1 doc per prompt — the top-priority doc; pairings
  rarely survive assembly (accepted tradeoff, documented in
  KNOWLEDGE_BASE_REPORT §1.3).
- GameViewer (legacy) threads no ratings — the `games` row has no rating
  columns; rating-aware retrieval there needs profile data (future).
