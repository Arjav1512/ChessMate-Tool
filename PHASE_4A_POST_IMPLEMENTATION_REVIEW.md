# PHASE_4A_POST_IMPLEMENTATION_REVIEW.md — Manual UX Validation

**Date:** 2026-07-10 · **Read-only; no code modified; R5 untouched.**

## 0. Live status — still blocked, re-verified today

A fresh probe this morning (signed-in validation account, real deployed
edge function):

```
HTTP 500  {"error":"GEMINI_API_KEY not configured"}
```

The secret has not been set since yesterday's finding
(PHASE_4A_REAL_WORLD_VALIDATION.md). **A live Gemini-backed answer is still
impossible**, so this review does not fabricate one. What it adds instead is
the piece yesterday's outage made untestable: the conversational layer *in
practice*. Because live calls all failed, memory never recorded and
D1/D4 never ran. Today's method: the full production pipeline —
orchestrator, session memory, retrieval, assembly, real `inferTask`, real
contexts — with **only the model stubbed** (canned realistic answers), so
multi-turn behavior is genuinely exercised and measured at the prompt level.
Final answers below are marked *(stub)* or *(sim)* accordingly; scores are
prompt-grounding scores, unchanged in meaning from the prior audits.

## 1. The new evidence: a 6-message conversation chain (test 7)

One session, blunder context (8...Nxe4??, motifs, game analysis), measured
per turn:

| Turn | Question | Task | History in prompt | Prior answer visible | Repeat directive |
|---|---|---|---|---|---|
| 1 | "Find my biggest mistake…" | mistake | – | – | – |
| 2 | "Why?" | coach | ✅ | ✅ | – |
| 3 | "What if I had castled instead?" | coach | ✅ | ✅ | – |
| 4 | "Can you explain that in simpler terms?" | coach | ✅ | ✅ | – |
| 5 | *repeat of turn 1* | mistake | ✅ | ✅ | ✅ |
| 6 | "What should I practice to avoid this?" | coach | ✅ | ✅ | – |

Memory depth after the chain: 6 turns recorded. Prompt sizes 2.9–3.4 K —
history + knowledge + context all fit the 4 K budget on every turn.

**Rotation verified separately** (the chain probe measured docs
pre-rotation; a focused check read the actual turn-5 prompt): the repeat's
prompt contains `# Blunder Prevention` and *not* the previously served
`# Hanging Pieces`, alongside the variation directive — rotation works even
with three intervening turns (the 5-turn repeat window held).

**Conclusion: conversation memory works in practice.** Follow-ups always see
the prior exchange; "Why?" / "What if I played…?" / "explain that" are all
resolvable; repeats get rotated material plus an explicit instruction to
vary.

## 2. Test-by-test results

Tasks and retrieval below are real pipeline output (tests 1–6, 8 reuse
yesterday's live-captured runs where the same contexts hit the deployed
backend; test 7 is today's chain). CQ/SP/PV/LE = Coaching Quality /
Specificity / Practical Value / Learning Effectiveness.

| # | Test | Question (example) | Task | Docs retrieved | Answer | CQ | SP | PV | LE |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Follow-ups | "Why?" after the blunder question | coach | hanging_pieces (+prevention) | *(stub)* resolves against visible prior answer | 8 | 8 | 8 | 8 |
| 2 | Repeated question | same Q twice | mistake | rotated → blunder_prevention | *(stub)* varied, directive obeyed | 8 | 7 | 8 | 8 |
| 3 | Opening advice | "Was my opening choice solid?" (Caro-Kann) | opening | caro_kann + opening_principles | *(sim)* Advance-structure assessment | 9 | 9 | 8 | 8 |
| 4 | Mistake explanation | "Find my biggest mistake…" | mistake | hanging_pieces + blunder_prevention | *(sim)* names 8...Nxe4, recommends O-O, attaches ritual | 9 | 9 | 9 | 9 |
| 5 | Review-style | "Walk me through the critical moment." | review | motif docs + game-analysis context (71% vs 84%, turning points) | *(sim)* structured game review | 9 | 9 | 9 | 9 |
| 6 | Lesson-style | "Show me the typical plan for both sides." | lesson | hanging_pieces (weak match — see below) | *(sim)* stretches motif doc toward plans | 6 | 5 | 6 | 6 |
| 7 | Long chain (6 msgs) | table in §1 | mixed | see §1 | *(stub)* coherent thread end-to-end | 8 | 8 | 8 | 8 |
| 8 | Starter prompts | all five real chips | mistake/opening/review/lesson/coach | correct per prompt | — routing verified live yesterday | 8 | 8 | 8 | 8 |

**Overall: CQ 8.1 · SP 7.9 · PV 8.0 · LE 8.0** at the grounding layer —
up from the pre-4A UX audit's 6.6/5.9/6.6/6.4, driven by conversational
continuity (was 3s) and the review-template + game-analysis flow (was 4).
The as-experienced-today score for a real user remains: an error toast.

## 3. Answers to the review's questions

**Biggest remaining weakness:** unchanged and unbeaten — the production
outage (`GEMINI_API_KEY` unset, old edge function deployed). Every UX
number in this review is potential energy until that one-hour ops task
happens. *Post-fix*, the biggest product weakness is test 6's pattern:
concept/plan questions retrieve move-motif docs because retrieval cannot
read the question (R5).

**Is R5 still needed?** **Yes.** Today's runs re-confirmed the same three
signatures: "typical plan" questions get motif docs (test 6), "I just lost
material — what did I miss" routes to `coach` not `mistake`, and concept
questions can't reach their existing docs. R5 (question-keyword retrieval,
plus a small routing-vocabulary expansion) remains the top code improvement
— to be built after the ops fix and one true live validation.

**Does conversation memory work in practice?** **Yes — now demonstrated,
not just unit-tested** (§1): history on every turn of a 6-message chain,
prior answers visible and resolvable, repeat detection across intervening
turns, lead-doc rotation, all within budget. Known accepted limits stand:
exact-match repeat detection and a one-exchange visible window.

**Does the coach now feel like a real chess coach?** At every layer this
environment can measure — yes, for the first time including *continuity*:
the transcript of the 6-message chain reads like a coaching session (mistake
→ why → alternative → simplification → deeper repeat → practice
prescription), each turn grounded in the actual game and the right lesson
page. The only thing between this and a real user feeling it is the missing
API key.

## 4. Recommendation

Hold further validation passes until `GEMINI_API_KEY` is set and
`chess-mentor` is redeployed — re-running suites against a known-500 backend
spends rate budget to reprove a known fact. The moment the secret lands,
one live re-run of this exact suite (the probes are reusable) upgrades every
*(stub)/(sim)* above to a real transcript.
