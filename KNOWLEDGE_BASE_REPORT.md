# KNOWLEDGE_BASE_REPORT.md — Phase 2 Corpus: Coverage, Gaps, Quality

**Date:** 2026-07-09 · **Corpus:** `src/coach/knowledge/` (63 documents)
**Plan:** `KNOWLEDGE_BASE_PLAN.md` · **Consumer:** `StructuredRetriever` (interface unchanged)

---

## 1. Coverage report

### 1.1 By category (all 12 requested areas covered)

| Requested area | Directory | Docs | Notes |
|---|---|---|---|
| Opening Principles | `principles/` | 5 | opening_principles, development, center_control, king_safety, calculation |
| Tactical Motifs | `tactics/` | 8 | pins, forks, skewers, discovered attacks, removing the defender, deflection/decoy, zwischenzug, trapped pieces |
| Strategic Concepts | `strategy/` | 9 | initiative, pawn structure, piece activity, weak squares, open files, bishop pair, space, prophylaxis, trading |
| Middlegame Planning | `middlegame/` | 4 | planning, attacking the king, defending, converting advantages |
| Endgames | `endgames/` | 6 | principles, rook, king+pawn, opposition, minor piece, queen |
| Pawn Structures | `pawn_structures/` | 4 | IQP, Carlsbad/minority attack, hanging pawns, chains & breaks |
| Piece Activity | `strategy/piece_activity` +related | — | covered inside Strategic Concepts |
| Calculation | `principles/calculation` +`tactics/zwischenzug` | — | covered |
| Time Management | `practical/time_management` | 1 | |
| Psychology | `practical/chess_psychology` (+defending worse) | 2 | |
| Blunder Patterns | `motifs/` | 6 | mapped 1:1 to `lib/motifs` detector ids |
| Rating-specific advice | `rating/` | 3 | <1200, 1200–1800, >1800 |
| Openings (specific) | `openings/` | 15 | 8 upgraded + English, Scandinavian, Slav, Nimzo-Indian, Pirc/Modern, Catalan, King's Gambit |

**Format compliance (mechanically verified):** 63/63 documents carry all nine
required elements (concept, why it matters, recognition, common mistakes,
thinking process, concrete example with SAN, coaching tip, training exercise,
related concepts). Lengths: 1.7–2.6 K chars, mean 2.1 K; corpus total 128 KB.

### 1.2 Reachability under today's retrieval (measured by simulation)

`queryFromContext` produces only four needle kinds (opening name, `endgame`
theme, `mistake`/`blunder`, motif ids), so:

- **27 docs reachable today:** all 15 openings, `opening_principles`
  (fallback for "… Opening" names), the first two `endgame`-tagged docs
  (rook, king+pawn), `calculation`, `pawn_structure` + `king_safety` (via
  sample-motif tags), and all 6 blunder-pattern docs via detector ids.
- **36 docs are corpus-ahead-of-retrieval** (deliberate, per plan §4):
  tactics themes (no detector emits "pin"/"fork" today), strategy,
  middlegame, pawn-structure, practical, and rating docs await richer query
  derivation (task-based themes, rating-band needles, position-derived
  structure tags) or Phase-3 retrieval. Zero rework needed when that lands —
  tags are already in place.
- **Shadowed within a reachable category:** `endgame` queries always return
  rook + king+pawn (deterministic array order); opposition/minor/queen/
  principles endgame docs need position-aware needles (e.g. "rook endgame"
  derived from material) to surface. Documented future work, not a defect.

### 1.3 Budget behavior (measured)

With rich docs (~2.1 K chars) and the 4 000-char transport cap, prompts now
carry **one full doc** (the highest-priority match) rather than two thin
ones; the assembler's deterministic shedding guarantees the top doc always
fits, and worst-case (largest doc + maximal context) trims only trailing
context lines. One retrieval consequence was found and fixed during testing:
motifs now outrank the bare mistake classification (`opening → theme → motif
→ mistake`), because with one-doc prompts, priority is selection — a
hung-piece blunder must surface *Hanging Pieces*, not generic *Calculation*.
This is a heuristic tuning inside the existing retriever; the
`KnowledgeRetriever` interface, orchestrator, service, providers, memory,
transport, and UI are untouched.

## 2. Missing-topic report (known gaps, priority-ordered)

**Openings** (detector recognizes them; no dedicated doc — they fall to the
principles fallback or nothing): Dutch, Scotch, Vienna, Petrov, Philidor,
Benoni, Grünfeld, Alekhine's, Benko, Budapest, Réti/Bird as White systems.
**Endgames:** fortress & theoretical draws, bishop-of-wrong-colour rook-pawn,
R+B vs R, practical two-results technique, breakthrough motifs.
**Tactics:** clearance, interference, x-ray, windmill, perpetual-check as a
tactic, stalemate tricks.
**Structures:** Maroczy bind, Hedgehog, Stonewall, French chain vs KID chain
as separate deep dives, doubled/backward-pawn clinics.
**Practical:** opening repertoire construction, tournament preparation,
online vs OTB differences, analysis method (how to review your own games).
**Rating:** sub-bands above 2000; titled-level content is out of scope for
the product's audience today.

None of these blocks Phase 2: the retriever degrades to fewer (or zero) docs
gracefully, and the coach's prompt remains grounded in the engine data.

## 3. Knowledge quality review

**Voice:** every doc rewritten in second-person coach voice — direct
address, prescriptive routines, "Coach's tip" framing — no encyclopedia
tone. Spot-read pass done on all 63; three drafting artifacts found and
corrected (rook_endgames Lucena narration, opposition example line,
planning knight route).

**Chess accuracy:** examples use real SAN and standard theory (Légal's mate
conditions, Lucena bridge, Philidor setup, opposition zugzwang with the
e2/e3 tempo pair, Najdorf/Carlsbad/IQP plans). Two claims were rewritten
during self-review for precision (the opposition example now states the
pawn-on-e2-wins / pawn-on-e3-draws pair exactly; the Lucena narration now
describes the bridge correctly).

**Consistency:** fixed 9-section template across all docs (mechanically
verified); `Related:` links use document titles so cross-references survive
retrieval-order changes; difficulty ramps from plain-language beginner docs
(`rating/improving_under_1200`) to vocabulary-assuming advanced ones.

**Safety for prompts:** no doc exceeds 2.6 K chars (fits the budget with
room for context); no markdown constructs beyond headers/bold/lists (clean
for LLM consumption); no invented statistics or engine numbers.

## 4. Verification

- Unit suite: **352/352 pass** (retrieval pins updated for the covered
  "English Opening" case; fallback re-pinned with Van't Kruijs).
- Typecheck clean; lint 0 errors; production build passes.
- Bundle: corpus ships in the **lazy shared chunk** (26 KB → 156 KB raw,
  55.8 KB gzip); the entry chunk is byte-stable at 434.52 kB — no impact on
  initial page load.
- Constraint audit: no changes to CoachOrchestrator, CoachService,
  providers, retrieval/memory interfaces, transport, or UI. Changed files:
  `knowledge/**` (corpus + registry), `retrieval/retriever.ts` (priority
  heuristic + doc comment only), the retrieval test, and the two report docs.
