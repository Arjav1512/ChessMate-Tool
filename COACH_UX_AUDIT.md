# COACH_UX_AUDIT.md — Real-User Experience Audit

**Date:** 2026-07-09 · **Method:** 10 scenarios executed through the real
production pipeline — real call-site contexts (including the actual
`COACH_STARTER_PROMPTS` users click), real retrieval, real assembled prompts,
wrapped in the deployed server system prompt.

**Honest boundary:** this environment has no authenticated session, so the
final Gemini call cannot be made live. *Generated answers below are
simulated*: written strictly from what each exact prompt contains, following
the server wrapper's mandated format (📋 Summary / 🎯 Key Points /
💡 Recommendations). Everything upstream of the model — the dominant quality
variable — is measured, not simulated. No code/retrieval/prompts/documents
were modified.

Scores per scenario: **CQ** Coaching Quality · **PV** Practical Value ·
**SP** Specificity · **LE** Learning Effectiveness (1–10).

---

## Scenario 1 — Analysis → Ask Coach (starter prompt) · CQ 4 · PV 4 · SP 3 · LE 4

**Question (real starter):** "Walk me through the critical moment of this game."
**Context:** analyzed Sicilian, currently on 7...Be7 (a *good* move, middlegame), rating 1500.
**Retrieval:** `{ratingBand: intermediate}` → `improving_1200_1800` (only doc).
**Prompt carries:** players/result/opening line "B54 Sicilian, Open"/FEN/7...Be7 (good, 15cp)/rating — and a rating-band study plan.
**Simulated answer:** a summary admitting the shown move is fine, generic remarks that the game "was decided later", then study-plan advice lifted from the rating doc.
**Strengths:** honest grounding; opening named at variation level; no hallucinated "critical moment" if the model behaves.
**Weaknesses:** **the #1 starter prompt is game-scoped but the context is move-scoped** — the prompt contains no accuracy, no turning points, no blunder list, so the question is literally unanswerable from the data. The rating doc is off-topic filler. `AnalysisVM.turningPoints` exists in the view model and is not threaded.

## Scenario 2 — Blunder → Ask Coach (starter prompt) · CQ 9 · PV 9 · SP 9 · LE 9

**Question:** "Find my biggest mistake and how I should have played instead."
**Context:** on the blunder ply 8...Nxe4?? (290cp, `hung_piece`), engine preferred O-O.
**Retrieval:** blunder + motifs → `hanging_pieces` (in prompt), `blunder_prevention` (shed).
**Simulated answer:** names 8...Nxe4?? as the mistake, explains the hang, recommends O-O, attaches the end-of-move ritual from the doc, connects to the 1500 level.
**Strengths:** the system at its best — everything a human coach needs is on the table, and the attached lesson is exactly on-target.
**Weaknesses:** none material. (This flow is why Phase 3A mattered.)

## Scenario 3 — Inaccuracy → Ask Coach · CQ 5 · PV 5 · SP 4 · LE 5

**Question:** "Why was this only an inaccuracy and not a good move?"
**Context:** 8.h3?! (60cp), engine preferred O-O.
**Retrieval:** `{ratingBand}` only — **inaccuracies produce no mistake needle** (`isError` = mistake|blunder), and there's no motif.
**Simulated answer:** workable-but-thin: the model can lean on cpLoss/bestMove from the context ("h3 spends a tempo; O-O was more urgent") but the attached knowledge is a study plan, irrelevant to the question.
**Strengths:** context data alone supports a decent reply.
**Weaknesses:** no routing for inaccuracies; the ideal docs (tempo/development, prophylaxis) are unreachable without R5. Rating doc as filler again.

## Scenario 4 — Opening Question (starter prompt) · CQ 9 · PV 8 · SP 9 · LE 8

**Question:** "Was my opening choice solid? Where could I improve it?"
**Context:** Caro-Kann Advance as White, opening phase, rating 1300.
**Retrieval:** `caro_kann` (in prompt) + `opening_principles` (shed).
**Simulated answer:** grounded assessment of the Advance structure, Black's ...Bf5 plan, White's space plans — directly from the doc's coaching content.
**Strengths:** opening docs + fallback working exactly as designed; variation-aware.
**Weaknesses:** minor — the doc teaches both sides; a White-specific angle depends on the model noticing `the player is White`.

## Scenario 5 — Tactical Question (typed) · CQ 6 · PV 7 · SP 5 · LE 6

**Question:** "How can I spot forks like the one I missed?"
**Context:** mistake with `missed_material_gain` motif.
**Retrieval:** `hanging_pieces` (in prompt), `missed_tactics` (shed).
**Simulated answer:** solid scanning-habit advice — but about hanging pieces, not forks; the model must stretch the doc to the question.
**Weaknesses (two distinct):** (a) **question-blindness** — the user named the concept ("forks") and a forks doc exists, unreachable without R5; (b) **motif shadowing** — `missed_material_gain` is tagged on both `hanging_pieces` and `missed_tactics` at equal specificity, and array order serves the former; the dedicated missed-tactics doc loses its own motif.

## Scenario 6 — Endgame Question · CQ 8 · PV 8 · SP 8 · LE 8

**Question:** "How should I have played this endgame?"
**Context:** R+P ending, 41...Rf5?! vs Ra7 (rook-activity moment).
**Retrieval (post-R4):** `theme: rook endgame` → `rook_endgames` in prompt, `calculation` second.
**Simulated answer:** activity-first doctrine, rooks-behind-passers, directly applicable to Ra7-vs-Rf5.
**Strengths:** R4 visibly working; doctrine matches material; the concrete engine preference anchors it.
**Weaknesses:** slight — no cut-off/Philidor specificity for this exact structure, but the doc covers the principle the mistake violated.

## Scenario 7 — Beginner (~900) · CQ 9 · PV 9 · SP 8 · LE 9
## Scenario 8 — Intermediate (~1500) · CQ 8 · PV 8 · SP 7 · LE 8

**Questions:** "What should I focus on to get better?" / "What should I study to reach 1800?"
**Retrieval:** exactly the right band doc, full text in prompt.
**Simulated answers:** faithful band-appropriate programs (safety ritual + slow games for the beginner; plans/endgames/self-analysis for the intermediate).
**Strengths:** R3 delivering personalization; the beginner doc's "resist adding more until 1200" is genuinely good coaching.
**Weaknesses (scenario 8):** the prompt *shows* "struggles in the sicilian" in the weakness summary, but retrieval ignores it (R6) — the one personalization datum that could have made the answer individual, and the sicilian doc sits unretrieved.

## Scenario 9 — Repeated Questions · CQ 5 · PV 5 · SP 4 · LE 4

Same Philidor opening question asked twice. **Measured: the two assembled
prompts are byte-identical (2 374 = 2 374 chars).** Same doc
(`opening_principles`), same context, no memory of having answered.
**Simulated answers:** paraphrases of the same content — the user reads the
same lesson twice and learns that asking again is useless.
**Weakness:** conversation memory records every exchange
(`SessionConversationMemory`) and nothing reads it — no "as I said, but let's
go deeper", no doc rotation.

## Scenario 10 — Follow-up Questions · CQ 3 · PV 3 · SP 2 · LE 3

**Question:** "Why is that better than what I actually played?" (immediately after scenario 9's answer)
**Measured:** the prompt contains **zero trace of the previous exchange** —
"that" is unresolvable from anything the model sees.
**Simulated answer:** the model either asks what "that" refers to or guesses
(likely re-explaining 3...exd4 generically). Either way the conversational
thread the user believes they're having does not exist.
**Weakness:** **follow-ups are structurally broken today** — the biggest raw
UX gap in the audit. All the data to fix it is already recorded in session
memory.

---

## Overall scores

| Axis | Score | Driven by |
|---|---|---|
| Coaching Quality | **6.6 / 10** | excellent on blunders/openings/ratings; weak on game-scoped, repeated, and follow-up asks |
| Practical Value | **6.6 / 10** | concrete engine-anchored advice where retrieval hits; filler where it doesn't |
| Specificity | **5.9 / 10** | move-scoped flows are specific; game-scoped and concept questions aren't |
| Learning Effectiveness | **6.4 / 10** | strong single-shot lessons; no continuity between exchanges |

## Identified weaknesses by category

**Repetitive answers:** scenarios 9a/9b (byte-identical grounding); `opening_principles` recurrence across opening asks (also seen in Phase-3A validation); rating docs recur as filler in 4 of 10 scenarios (1, 3, 7, 8 — appropriate in 7/8, filler in 1/3).
**Generic answers:** scenario 1 (game-scoped question, move-scoped data), scenario 3 (inaccuracy routing gap), scenario 5 (concept question answered by adjacent doc).
**Missing coaching concepts:** "how to analyze your own games" (still absent, still referenced); fork/tactic docs unreachable by the questions that name them; no game-summary/critical-moment concept at all.
**Prompt weaknesses:** no conversation history despite session memory recording it; task is always `'coach'` — the `lesson`/`review`/`opening`/`mistake` templates shipped in Phase 1 are never selected by the UI; no game-level stats line (accuracy, blunder count, turning points) for whole-game questions.
**Retrieval weaknesses:** question text unread (R5); weakness summary unread (R6); inaccuracies produce no needle; rating doc serves as only-doc for position questions.
**Corpus weaknesses:** `missed_material_gain` tag shadowing (`hanging_pieces` beats `missed_tactics` for its own motif); no Petrov/Philidor/Dutch docs (fallback covers but can't be specific); analyze-your-games doc missing.

## Top 10 improvements (prioritized by UX pain × frequency)

1. **Feed conversation memory into prompts** — fixes broken follow-ups (worst scenario, 3/3/2/3) and repetition awareness; memory already records, assembly just doesn't read it. Highest value per line of code in the system.
2. **Thread game-level analysis into game-scoped questions** — accuracy, blunder count, `AnalysisVM.turningPoints` (already computed!) so "walk me through the critical moment" — the most prominent starter prompt — becomes answerable.
3. **R5 question-keyword matching** — "forks", "plan against the Petrov", inaccuracy explanations; the only route to 28 docs and to what users literally type.
4. **Route starter prompts to their task templates** — "Find my biggest mistake" → `mistake` task, "Was my opening solid" → `opening` task; the templates exist and are tested, the UI never selects them.
5. **Fix motif tag shadowing** — make `missed_tactics` win `missed_material_gain`/`missed_mate` (its own ids); one-line corpus tag or order change.
6. **R6 weakness-summary needles** — scenario 8's "struggles in the sicilian" should retrieve the sicilian doc; the data already renders in the prompt.
7. **Inaccuracy routing** — include inaccuracies in the mistake needle (or a milder development/tempo mapping) so the third-most-common ask stops getting study-plan filler.
8. **Repetition guard** — memory-aware retrieval: skip a doc served in the last N turns (depends on #1's memory read).
9. **Author the "analyze your own games" doc** + Petrov/Philidor/Dutch opening docs — the three most-exposed corpus gaps.
10. **Gate the rating doc** to improvement-shaped questions (needs #3's keyword signal) so it stops appearing as filler on position-specific asks.

**Verdict:** the coach is genuinely good at its core loop — *mistake on the
board, player asks, targeted lesson attached* (scenarios 2/4/6/7: 8–9s
across the board). The experience degrades exactly where the interaction
stops being single-shot and move-scoped: whole-game questions, repeats, and
follow-ups. The next unit of work should be conversational continuity
(#1/#2/#4) before more retrieval breadth (#3/#6).

*Per instructions: nothing implemented; R5/R6 untouched. Audit stops here.*
