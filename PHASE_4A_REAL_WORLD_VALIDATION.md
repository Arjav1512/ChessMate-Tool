# PHASE_4A_REAL_WORLD_VALIDATION.md — Live UX Validation

**Date:** 2026-07-09 · **Method:** a genuine live session against production —
a throwaway validation account (`arjav.jain1512+cm4avalidation@gmail.com`)
was created via the real anon key, signed in for a verified JWT, and all 8
test scenarios (14 calls, paced under the 10/min rate limit) were executed
through the **real production stack**: `askChessMentor` adapter →
orchestrator → retrieval → prompt assembly → `ChessMentorTransport` → the
**deployed** `chess-mentor` edge function. Nothing was mocked below the
model. No code was modified.

---

## 0. THE finding: the production coach is down — and always has been

Every one of the 14 live calls failed identically. Raw verification:

```
POST /functions/v1/chess-mentor  (verified JWT, valid question)
HTTP 500  {"error":"GEMINI_API_KEY not configured"}
```

**`GEMINI_API_KEY` has never been set in the Supabase project secrets.** No
real user has ever received a coach answer; every coach question in
production today ends in an error toast. This outranks every UX nuance this
audit set out to measure.

Three sub-findings ride along:

1. **The graceful-error taxonomy passed its first production test.** Users
   see *"AI Coach is not available yet — it has not been set up for this
   environment."* — the raw server detail never reached the UI layer.
   Deliverable 10 of Phase 1, validated for real.
2. **The deployed (old) edge function still leaks internals** in its
   response body (`"GEMINI_API_KEY not configured"`) — the F4 hardening
   (generic 500 messages) exists in the repo but is not deployed. One more
   confirmed prod-drift item.
3. **Wire-contract compatibility confirmed live:** the old deployed function
   accepted the new client's `{question}` payload, verified the JWT, rate-
   limited, and reached its key check — old backend + new client interoperate
   exactly as designed.

**Remediation (owner-only, dashboard/CLI):**
`npx supabase secrets set GEMINI_API_KEY=…` · redeploy `chess-mentor`
(picks up rate-limit/injection/disclosure hardening) · set
`ALLOWED_ORIGINS`. Then re-run this validation for live answers.

**Cleanup:** delete the validation user from Supabase Auth when done;
~15 failed-call rows were written to `api_logs`.

## 1. What WAS validated live (everything below the model)

| Layer | Live result |
|---|---|
| Auth (signup → JWT) | ✅ worked first try (no email-confirmation gate — worth revisiting for launch) |
| Transport + deployed backend | ✅ compatible; 500 correctly mapped to `not-configured` |
| Task routing (D3) | ✅ real questions routed live: mistake / opening / review / lesson / coach as designed |
| Retrieval | ✅ every scenario retrieved the expected docs (see table) |
| Prompt assembly incl. D2 game analysis | ✅ S6's live prompt: review template + "B92 Sicilian, Najdorf" + accuracy 71%/84% + turning points |
| Conversation memory (D1/D4) | ⚠️ **not exercisable live**: turns record only after a successful answer, and no call succeeded — so follow-up prompts stayed history-free. Correct behavior (never "remember" an answer that didn't happen), but it means D1/D4 live proof awaits the secret fix; they remain covered by the 7 Phase-4A regression tests. |

## 2. Scenario results

Scores are **prompt-grounding quality** (what the model will be given once
the key is set) — the as-experienced-today score is the same for all eight:
the user gets an error toast. Answers marked *(sim)* are written from the
exact captured prompts, since live answers are impossible until remediation.
CQ/SP/PV/LE = Coaching Quality / Specificity / Practical Value / Learning
Effectiveness.

| # | Scenario | Task routed | Docs retrieved (live) | CQ | SP | PV | LE |
|---|---|---|---|---|---|---|---|
| 1 | Follow-ups ("Find my biggest mistake" → "Why?" → "What if I had castled?") | mistake → coach → coach | hanging_pieces + blunder_prevention | 8 | 8 | 8 | 8 |
| 2 | Repeated question ×2 | coach | same docs (rotation untestable live — see §1) | 7 | 7 | 7 | 7 |
| 3 | Opening advice (Caro-Kann starter) | opening | caro_kann + opening_principles | 9 | 9 | 8 | 8 |
| 4 | Tactical mistake ("I just lost material…") | **coach** (see weakness #4) | hanging_pieces + blunder_prevention | 8 | 8 | 8 | 8 |
| 5 | Endgame (R+P, R4) | coach | rook_endgames + calculation | 8 | 8 | 8 | 8 |
| 6 | Critical-moment walkthrough | review | motif docs + full game-analysis context | 9 | 9 | 9 | 9 |
| 7 | Starter "typical plan" | lesson | hanging_pieces (see weakness #5) | 6 | 5 | 6 | 6 |
| 8 | Long chain (4 turns) | opening/coach/lesson/opening | caro_kann + principles each turn | 7 | 7 | 7 | 7 |

*(sim) examples:* S6 would produce a structured game review naming 8...Nxe4
as the decisive moment with the 71%-vs-84% accuracy frame — the exact answer
the UX audit found impossible before 4A. S1's "Why?" would resolve against
the visible previous answer once memory can record.

## 3. Top 10 strengths (evidence-backed)

1. Graceful degradation under a real outage — no vendor leakage, clear user message.
2. Old-backend/new-client wire compatibility proven in production.
3. Task routing works on real question phrasings, live.
4. S6: game-scoped questions now carry review template + accuracy + turning points (the former CQ-4 scenario is structurally a 9).
5. Opening detection at variation granularity live ("B92 Sicilian, Najdorf").
6. Retrieval correct in all 8 scenarios, including R4 endgame families.
7. Prompt sizes 2.4–3.1K — comfortably inside the 4K budget with knowledge attached.
8. Memory refuses to record failed exchanges — no phantom history.
9. Auth + rate-limit path handled a scripted 14-call session without a hiccup.
10. The whole live run required zero code changes — the architecture's seams (transport DI, capturing wrappers) made production probing trivial.

## 4. Top 10 weaknesses

1. **Production outage** (missing `GEMINI_API_KEY`) — supersedes everything.
2. Deployed edge function is the old, un-hardened version (leaks internals; missing prompt caps/fencing).
3. D1/D4 (history, repeat rotation) unproven live — blocked by #1.
4. Routing gap: "I just lost material — what did I miss" → `coach`, not `mistake` ("miss/lost material" aren't keywords).
5. S7 "typical plan for both sides" retrieved motif docs (from the selected blunder move) rather than plan/strategy material — R5 territory.
6. Repeat detection is exact-match only; "What did I miss here?" vs "What am I missing?" won't trigger variation.
7. History window is one exchange; a 3rd follow-up referencing answer #1 loses the thread.
8. Signup on production has no email confirmation — anyone can mint accounts (flag for launch security review).
9. Rating docs still can't be gated off position-specific questions (needs R5's intent signal).
10. `api_logs` accumulates reservation rows from failed calls with no cleanup story.

## 5. Direct answers to the audit's questions

**Biggest remaining UX issue:** the production outage — until
`GEMINI_API_KEY` is set and the edge function redeployed, the coach's UX is
an error toast. *Post-remediation*, the biggest issue becomes near-duplicate
repeat/follow-up phrasing (weaknesses #6/#7) plus S7-style concept questions
(R5).

**Should R5 proceed?** **Yes — but second.** First set the secret + redeploy
+ re-run this validation live (an hour of ops, unblocks everything).
R5 is the top remaining *code* improvement: three of this run's weaknesses
(#4, #5, #9) trace to question-blindness.

**Is conversation memory sufficient?** For v1, yes — the design (last
exchange + rotation + variation directive, session-only, deterministic) is
right-sized, and its regression tests are solid. It is *unproven live* until
the backend answers, and the one-exchange window + exact-match repeats are
known, accepted limits. No architectural change needed before persistence
lands in a later phase.

**Does the coach now feel like a real chess coach?** At the prompt layer —
the part this audit could measure end-to-end — yes for the core loop: a real
coach who is handed your blunder, your opening variation, your accuracy, and
your turning points, with the right lesson page open. Whether the delivered
words land that way awaits the first live answer, which is now purely an
ops action away.
