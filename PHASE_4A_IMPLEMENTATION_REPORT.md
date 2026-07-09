# PHASE_4A_IMPLEMENTATION_REPORT.md — Conversational Coach Foundation

**Date:** 2026-07-09 · **Scope:** Deliverables D1–D4 (conversation context,
game-level context, task routing, repetition awareness).
**Not touched:** RAG/embeddings/vectors, providers, transport,
`KnowledgeRetriever` interface, knowledge corpus, prompt template files
(reused, not created), long-term memory. R5/R6 not started.

---

## 1. Architecture decisions

- **History lives in assembly, not in templates.** The existing `{{context}}`
  slot carries an "Earlier in this session:" block (last exchange, answer
  excerpted at a deterministic 320 chars), so all five templates gained
  conversation support without a single template edit.
- **Deterministic budget degradation extended, order preserved:** shed
  knowledge docs → drop the history block → trim context tail. If budget
  kills history, behavior degrades exactly to pre-4A single-shot — never a
  dangling "as shown above".
- **Repeat detection is exact-match after normalization**
  (case/punctuation/whitespace-insensitive), not semantic similarity — no
  NLP, no false "you already asked that". On repeat: the previous turn's
  *lead* doc (the one that made the prompt) is filtered out so the
  next-best material surfaces, and a variation directive is appended to the
  history block (they shed together).
- **Memory turns now record `docIds`** — the minimal extension that makes
  rotation possible; still session-only, still 10-turn capped, nothing
  persisted.
- **Task routing is ordered keyword rules** (`inferTask`) at the adapter:
  most-specific intent wins (mistake > opening > review > lesson > coach);
  callers can override explicitly. All five real `COACH_STARTER_PROMPTS`
  route to distinct correct templates — the lesson/review/opening/mistake
  templates shipped in Phase 1 are finally exercised in production.
- **Game-level context is caller-formatted strings** (`CoachGameAnalysis`),
  computed from existing VM data only: `AnalysisVM.accuracyUser/-Opponent/
  turningPoints` + the moves list, capped (3 turning points, 3 mistakes) by
  the renderer. No new analysis anywhere.

## 2. Before / after prompt examples (real pipeline output)

**Follow-up "Why?" after a blunder question:**

```
BEFORE  …context lines…                       ← "Why?" unresolvable; the model
        Player's question: Why?                  guesses or asks back

AFTER   …context lines…
        Earlier in this session:
        The player asked: "Find my biggest mistake and how I should have played instead."
        You answered: The knight capture failed because 9.exd5 wins material; castling first (8...O-O)…
        …knowledge…
        Player's question: Why?                ← fully resolvable
```

**"Walk me through the critical moment of this game." (the #1 starter prompt):**

```
BEFORE  coach template · move-scoped context only · rating doc as filler
        → the question was literally unanswerable from the data (UX audit, CQ 4)

AFTER   review template: "Review this game for the player… name the critical
        moments (cite moves in SAN)…"
        Game accuracy: the player 71% vs opponent 84%
        Turning points of the game: 8...Nxe4 (blunder, lost 290cp); 15.Qh5 (mistake, lost 160cp)
        The player's worst moves this game: 8...Nxe4 (blunder, lost 290cp)
```

**Repeated question:** previously byte-identical prompts (measured 2 374 =
2 374 in the UX audit). Now the second prompt differs: previous answer
visible, lead doc rotated (`hanging_pieces` → `blunder_prevention`), and an
explicit directive to expand / vary the example / set an exercise.

## 3. Files changed (9 source + 2 test)

| File | Change |
|---|---|
| `src/coach/memory/types.ts` | `ConversationTurn.docIds` (rotation support). |
| `src/coach/context/types.ts` | `CoachGameAnalysis` + `CoachContext.gameAnalysis`. |
| `src/coach/context/contextBuilder.ts` | Renders accuracy / turning-point / worst-move lines (capped). |
| `src/coach/prompts/assemble.ts` | History block + repeat directive; extended shed order (docs → history → context tail). |
| `src/coach/api/coachOrchestrator.ts` | Reads last turns, repeat detection, lead-doc rotation, `docIds` recording. |
| `src/coach/api/askCoach.ts` | `inferTask` keyword router; `gameAnalysis` mapping; optional explicit task param. |
| `src/coach/index.ts` | Barrel exports (`inferTask`, `CoachGameAnalysis`). |
| `src/features/analysis/CoachTab.tsx` | New optional `analysis`/`moves` props; formats the game summary from VM data. |
| `src/features/analysis/AnalysisPage.tsx` | Passes `analysis` + `moves` (both already in scope). |
| `src/coach/api/coachService.test.ts` | 5 new pipeline tests (D1×2, D2, D3, D4). |
| `src/coach/api/askCoach.test.ts` | 2 new routing tests (all 5 starter prompts + precedence). |

## 4. Regression tests (7 new; required areas all covered)

- **Follow-ups:** the second ask's prompt contains the prior Q + A
  ("Earlier in this session…"); long answers excerpted at exactly 320 chars.
- **Repeated questions:** normalized-repeat detection; prompts differ; lead
  doc rotated; variation directive present; `docIds` recorded.
- **Game-level questions:** accuracy/turning-points/worst-moves lines reach
  the prompt.
- **Template routing:** `mistake`/`review` templates selected end-to-end;
  all five real starter prompts route correctly; specificity precedence
  ("opening mistake" → mistake) and default-to-coach pinned.

**Validation runs:** `npm test` **374/374** · `tsc --noEmit` clean ·
`npm run lint` 0 errors (4 pre-existing warnings) · `npm run build` passes,
entry chunk byte-stable (434.52 kB).

## 5. Measured UX improvements (vs COACH_UX_AUDIT.md)

| UX-audit finding | Before | After |
|---|---|---|
| Follow-ups structurally broken (scenario 10: 3/3/2/3) | zero conversation trace | previous exchange in prompt, deterministic excerpt |
| Repeats byte-identical (scenario 9: 2374=2374) | same prompt, same doc | different prompt, rotated doc, variation directive |
| #1 starter prompt unanswerable (scenario 1: CQ 4) | move-scoped data, coach template, rating filler | review template + accuracy + turning points + worst moves |
| Templates never used | task always `'coach'` | 5 starter prompts → 4 distinct templates |

## 6. Remaining conversational gaps (roadmap)

1. **Near-duplicate repeats** ("what did I miss" vs "what am I missing")
   don't trigger repeat handling — exact-normalized only, by design; a
   token-overlap heuristic is the next deterministic step if wanted.
2. **One-exchange window:** only the last exchange is included; a "third
   follow-up" referencing the first answer can still lose the thread
   (deliberate budget choice — revisit with usage data).
3. **GameViewer (legacy)** threads no `gameAnalysis` (its analysis lives in
   a different shape); Ivory `CoachTab` is the served path.
4. **Answers aren't structured for continuity** — the model isn't told a
   session narrative ("lesson 2 of this session"); would pair with lessons
   memory (`RecentLessons`) when persistence lands.
5. **R5/R6** (question-keyword retrieval, weakness needles) remain the top
   retrieval items, unchanged.
