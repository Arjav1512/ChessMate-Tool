# PHASE_3A_VALIDATION_REPORT.md — Ground-Truth UX Validation (R1+R2+R3)

**Date:** 2026-07-09 · **Method:** all 10 scenarios executed end-to-end
through the real production pipeline — the exact `MentorContext` a call site
sends → adapter → context builder → query derivation → retrieval → prompt
assembly (4 000-char budget) — capturing the query, the retrieved documents,
and the final assembled prompt. No code, retrieval, prompts, or documents
were modified.

**Evaluation boundary (stated honestly):** the model call itself is
unchanged by Phase 3A, so "the advice" is evaluated as *the material the
model is grounded in* — the context block + retrieved knowledge that now
reaches every prompt. Before Phase 3A that material was zero documents in
all ten scenarios.

---

## 1. Scenario results

Legend: **R** Retrieval Quality · **C** Coaching Quality · **V** Relevance (1–10).
"In prompt" = what survived budget assembly (retrieval returns up to 2; the
budget fits one full doc — known tradeoff).

| # | Scenario | Query (non-empty fields) | Retrieved → in prompt | R | C | V |
|---|---|---|---|---|---|---|
| 1 | Sicilian game | opening: "Sicilian, **Najdorf**" (PGN-derived!), theme: opening, band: intermediate | sicilian, opening_principles → **sicilian** | 9 | 8 | 9 |
| 2 | Philidor game | opening: "Philidor Defense", theme: opening, band: under 1200 | opening_principles, rating_u1200 → **opening_principles** | 8 | 7 | 6 |
| 3 | Petrov game | opening: "Petrov Defense", theme: opening, band: intermediate | opening_principles, rating_1200_1800 → **opening_principles** | 8 | 7 | 6 |
| 4 | Opening mistake (2.Qh5?) | opening: "King's Pawn Game", theme: opening, mistake, band: under 1200 | opening_principles, calculation → **opening_principles** | 10 | 9 | 10 |
| 5 | Tactical blunder (hung piece) | mistake: blunder, motifs: hung_piece+major_tactical_blunder, band | hanging_pieces, blunder_prevention → **hanging_pieces** | 10 | 9 | 10 |
| 6 | Middlegame positional mistake | mistake: mistake, band: intermediate | calculation, rating_1200_1800 → **calculation** | 5 | 5 | 4 |
| 7 | Endgame mistake (queen ending) | theme: endgame, mistake, band | rook_endgames, kp_endgames → **rook_endgames** | 4 | 5 | 3 |
| 8 | Beginner (~900) | band: under 1200 | → **improving_under_1200** (full doc) | 10 | 9 | 9 |
| 9 | Intermediate (~1500) | band: intermediate | → **improving_1200_1800** (full doc) | 9 | 8 | 8 |
| 10 | Advanced (~2000) | band: advanced | → **improving_above_1800** (full doc) | 10 | 9 | 9 |

**Averages: Retrieval 8.3 · Coaching 7.6 · Relevance 7.4.**
(Pre-3A, every scenario retrieved nothing: retrieval would score ≤1 across
the board. The improvement is material, not marginal.)

### Evidence highlights

**Best case (scenario 5)** — the assembled context block:

```
Game: Opp (1450) vs You (1430), result 1-0 — the player is Black
Opening: B54 Sicilian, Open
Move under discussion: 6...d5 (blunder, lost 320cp); engine preferred a6;
  phase: middlegame; motifs: hung_piece, major_tactical_blunder
Engine evaluation: +3.20
Player rating: 1430
+ full "Hanging Pieces" doc
```
Everything a human coach would want on the table, and the exactly-right
lesson attached. This is the system working as designed.

**Worst case (scenario 7)** — FEN `8/5Q2/8/4k3/7q/8/5K2/8` (queens only) and
the prompt teaches *"rooks belong BEHIND passed pawns… the defending king
wants the short side"*. The generic `endgame` needle retrieves the
array-first rook doc for every ending regardless of material. Technically
correct retrieval, actively off-topic coaching.

**Scenario 4 pleasant surprise** — 2.Qh5? retrieved `opening_principles`,
whose Common mistakes literally cover "bring the queen out early without a
concrete reason". Query-blind luck? No — the fallback fired because the
phase was opening; the doc's coverage did the rest. Generic doc, perfect fit.

**Scenario 1 detector depth** — the PGN yielded "Sicilian, **Najdorf**", not
just "Sicilian Defense": derivation via `lib/openings` reaches variation
granularity, which the context block now shows the model.

## 2. Where advice still feels generic

- **Scenario 6 is the weakest true coaching moment:** a positional mistake
  (f3?! weakening the king) retrieves generic calculation/blunder-check
  advice. The player asked "I don't see why this was a mistake" — the right
  material is weak-squares/pawn-structure, which nothing in the query can
  reach (no motif, no theme). This is beyond even R5 (the question has no
  theme keyword); it needs positional-mistake classification — future work.
- **Scenarios 2/3:** `opening_principles` is *appropriate* but cannot answer
  "what is the plan against the Petrov" — a corpus gap (no Petrov doc), not
  a retrieval defect. The fallback correctly prevents zero-results; it
  cannot manufacture specificity.

## 3. Where advice repeats itself

- `opening_principles` reaches the prompt in scenarios 2, 3, and 4 (and is
  retrieved in 1). A player asking several opening questions in one session
  reads the same document each time. With session conversation memory not
  yet feeding prompts, the coach has no way to know it's repeating. Low
  harm today (answers are model-paraphrased), worth watching after R5.
- The rating docs share their "analyze your own games" prescription across
  bands — by design, but it will feel samey to a player who crosses a band
  boundary.

## 4. Where retrieval is technically correct but not helpful

1. **Endgame family blindness (scenario 7)** — the flagship case: `endgame`
   theme → rook doc for a queen ending. Wrong doctrine delivered
   confidently.
2. **Second-slot futility** — in 6 of 7 multi-doc scenarios the second
   retrieved doc was shed by the budget (blunder_prevention, calculation,
   rating docs). Retrieval slot 2 currently does almost no user-visible
   work. Not harmful, but it means priority order *is* the whole game — and
   any future "pair" reasoning (opening + mistake doc) needs either slimmer
   docs or a bigger budget.
3. **Weakness summary rendered but retrieval-invisible (scenario 9)** — the
   context block correctly shows "Known weaknesses: frequently hangs pieces;
   weakest in the endgame", yet retrieval served only the rating doc. The
   model sees the weakness text; the knowledge system does nothing with it
   (R6, as planned).

## 5. Where additional retrieval work creates the biggest improvement

Ranked by measured pain × frequency:

1. **R4 — material-aware endgame needles.** Scenario 7 is the lowest-scoring
   scenario and endgame mistakes are a routine flow; the fix is a planned,
   ~15-line FEN piece count. Biggest single win available.
2. **R5 — question-keyword matching.** Scenarios 2/3-style questions
   ("what's the plan…", "how do I use…") carry intent the query ignores;
   also the only route into the 28 theme docs.
3. **R6 — weakness-summary needles.** Scenario 9 shows the data already in
   the prompt; retrieval just doesn't read it.
4. **Positional-mistake routing (new, beyond the plan).** Scenario 6's
   motif-less positional mistakes are the largest remaining "generic advice"
   class; needs either a positional sub-classifier on cp-loss patterns or
   phase+structure heuristics. Recommend adding to the Phase 3 backlog as R10.

## 6. Verdict

**Phase 3A materially improved the coach experience.** Ten of ten scenarios
now ground the model in real game context (opening at variation granularity,
ratings, cp-loss, motifs, engine preference), and seven of ten also attach
genuinely on-target knowledge. The remaining weak spots are precisely the
ones the improvement plan predicted (R4/R5/R6) plus one newly identified
class (positional-mistake routing). No regressions observed: zero-result
prevention holds in every scenario, and the rating fallback never displaces
position-specific docs.

Per instructions: no fixes implemented; R4/R5/R6 not started.
