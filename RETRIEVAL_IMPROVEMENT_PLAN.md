# RETRIEVAL_IMPROVEMENT_PLAN.md — Phase 3 Plan

**Basis:** RETRIEVAL_AUDIT.md (measured, 2026-07-09).
**Hard constraints honored:** no RAG, no embeddings, no vector search, no
memory implementation, no agents, no frameworks, no provider changes. All
improvements below are deterministic logic inside the existing
`StructuredRetriever`/`queryFromContext` seam, plus context threading at the
call sites. The `KnowledgeRetriever` interface does not change.

---

## R1 — Thread available context through the call sites

**What:** Pass what the components already hold: `CoachTab` sends
`GameVM.pgn/eco/opening/ratings/userColor` and
`AnalysisMoveVM.san/moveNumber/phase/motifs/quality→classification/cpLoss/bestSan`;
`GameViewer` sends `game.pgn`, the current ply's classification, and derived
player rating. Extend the `MentorContext` adapter shape (or have `CoachTab`
call `getCoachService().ask` with a full `CoachContext` — decide at
implementation; the adapter extension is smaller).

- **Impact: CRITICAL.** Retrieval currently returns `[]` in production; this
  single change activates the corpus, the tag system, the motif/opening/
  phase paths, and richer prompts (opening line, cp-loss, best move) in one
  move. Nothing else in this plan has any user-visible effect until R1 lands.
- **Complexity: MEDIUM-LOW.** Additive fields on the adapter + two call-site
  edits; `quality→MoveClassification` needs the one-word mapping
  (`brilliant→best`, rest identical). No schema, no wire changes (assembled
  prompt already rides in `question`).
- **Risk: LOW.** Prompt grows within the existing 4 000-char budget (the
  assembler already sheds/trims deterministically); UI behavior otherwise
  identical. Test impact: none existing; add call-site mapping tests.

## R2 — Generic opening-phase fallback (Defense-name gap)

**What:** In `queryFromContext`, when the position is in the opening phase
(or `task === 'opening'`) emit a low-priority `'opening'` theme needle after
the opening-name needle, so uncovered openings — whatever their name —
retrieve `opening_principles`.

- **Impact: HIGH.** Closes the measured 48-opening gap; every opening
  question gets at least sound principles.
- **Complexity: TRIVIAL.** One expression + one test.
- **Risk: MINIMAL.** Occupies the second slot only when nothing more
  specific matched earlier; the deliberate "…Opening"-name fallback becomes
  name-independent (its test updates from asymmetry-pin to fallback-pin).

## R3 — Rating-aware retrieval

**What:** Populate `player.rating` at the call sites (R1 carries it); in
`queryFromContext`, map rating → band needle (`under 1200` / `intermediate`
/ `advanced` — exact existing tags), taken LAST so it fills a spare slot
rather than displacing position-specific docs. Optionally only for
`lesson`-type tasks or when fewer than 2 docs matched.

- **Impact: HIGH.** Personalizes coaching tone/advice per band; makes the 3
  rating docs (currently unreachable) serve their purpose; costs nothing
  when specific docs already fill the budget.
- **Complexity: LOW.** A threshold map + priority placement + tests.
- **Risk: LOW.** Wrong-band edge cases (unrated games) default to no needle;
  deterministic and easily pinned.

## R4 — Material-aware endgame needles

**What:** When `phase === 'endgame'`, derive the endgame family from the FEN
with a simple piece-count scan (the codebase already does exactly this in
`derivePhase` — no chess.js needed): queens on → `queen endgame`; rooks and
no minors → `rook endgame`; minors only → `minor piece endgame`; bare kings
and pawns → `pawn endgame`; else generic `endgame`. Emit the family needle
first, generic `endgame` second.

- **Impact: MEDIUM-HIGH.** Un-shadows `queen_endgames`,
  `minor_piece_endgames`, `opposition` (via the pawn-endgame doc's family),
  and `endgame_principles`; endgame advice stops being rook-flavored for
  every ending.
- **Complexity: MEDIUM.** ~15 lines of FEN counting + family map + tests.
- **Risk: LOW.** Pure function over a string; falls back to today's behavior
  when the FEN is absent.

## R5 — Question-keyword theme matching

**What:** Deterministically match the user's question text against the
existing tag vocabulary (the same whole-word matcher, run needle-direction:
multi-word tags first, longest match wins), contributing at most ONE doc,
taken after opening/theme/motif but before the rating fill. "How do I use
the bishop pair?" → `strategy/bishop_pair`. No NLP, no scoring — a
vocabulary lookup.

- **Impact: HIGH.** The only route into the 28 tactics/strategy/middlegame/
  practical docs, and it keys on the strongest intent signal we have (what
  the user literally asked). Turns "explain zwischenzug" from zero docs into
  the zwischenzug doc.
- **Complexity: MEDIUM.** Tokenless whole-word scan of the question against
  ~140 tags; single-word common tags (`pin`, `fork`) need a short stoplist
  review to avoid false fires ("pin" is safe — verified no opening name
  contains it; audit the rest the same way).
- **Risk: MEDIUM (the highest in this plan).** False-positive retrieval
  pollutes a prompt with an irrelevant doc. Mitigations: cap at 1 doc,
  prefer multi-word tags, require tag length ≥ 4, pin a false-positive test
  corpus ("my opponent castled" must not retrieve anything for "castled").

## R6 — Weakness-summary needles

**What:** `weaknessSummary` (already sent by GameViewer; add in CoachTab via
R1) is generated from a fixed set of weakness titles — map those known
phrases back to needles ("hangs pieces" → `hung_piece`, "weakest in the
endgame" → `endgame`, opening-name weaknesses → opening needle), taken in
the R5 slot when the question yielded nothing.

- **Impact: MEDIUM.** Makes coaching proactive about the player's measured
  weaknesses even when the current move is fine — the personalization loop
  the weakness engine was built for.
- **Complexity: LOW-MEDIUM.** The summary format is produced by
  `buildWeaknessProfile` (known, enumerable titles); a reverse map + tests.
- **Risk: LOW.** Bounded phrase set; deterministic.

## Backlog (assessed, deliberately deferred)

- **R7 — `allowed_mate` diversification / `king_safety` reachability:** tag
  or ordering tweak; fold into R5's vocabulary review. Low impact alone.
- **R8 — Improve-queue needles:** `improveQueue` context is typed but never
  passed; queue motifs are usually redundant with the current move's. Revisit
  after R1 ships real usage data (`api_logs`).
- **R9 — Slot diversity rules** (e.g., max one doc per category): only
  worth it if R2–R6 produce crowding in practice; measure first.

## Recommended implementation sequence

```
R1  (activate the system — everything else is invisible without it)
 └─ R2  (one-line fallback; ships with R1's tests)
 └─ R3  (rating band — data arrives with R1)
R4  (endgame families)
R5  (question keywords — highest care: false-positive test corpus first)
R6  (weakness needles — reuses R5's slot and mapping pattern)
```

R1+R2+R3 are one small PR (call sites + query derivation + tests): highest
value, lowest risk, immediately observable in prompts. R4 is a second
self-contained PR. R5+R6 form the third, behind the false-positive corpus.

**Verification plan for every step:** unit tests pin each new needle path;
the audit's simulation probe (opening-name sweep + production-context query)
becomes a permanent regression test — production context must never again
retrieve zero docs while the corpus has a relevant match.
