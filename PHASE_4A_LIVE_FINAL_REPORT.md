# PHASE_4A_LIVE_FINAL_REPORT.md — Final Live Validation

**Date:** 2026-07-10 · **Read-only; no code modified.**

## 1. Requirement 1 — backend verification: **FAILED**

The brief states the secret has been configured. The deployed backend
disagrees. Four authenticated probes (real JWT, real deployed
`chess-mentor`, paced over 3+ minutes to rule out secret propagation lag):

```
00:52  HTTP 500  {"error":"GEMINI_API_KEY not configured"}
00:53  HTTP 500  {"error":"GEMINI_API_KEY not configured"}
00:54  HTTP 500  {"error":"GEMINI_API_KEY not configured"}
00:55  HTTP 500  {"error":"GEMINI_API_KEY not configured"}
```

Additionally, a CORS probe shows the deployed function **echoes arbitrary
origins** (`Origin: https://evil.example.com` → reflected in
`Access-Control-Allow-Origin`) — behavior the repo's hardened function
cannot produce. So: **the function has not been redeployed either**; the
old, pre-hardening version is still live.

Consequently the 17-call live suite was **not executed** — running it
against a known-500 backend would spend rate budget to reproduce a known
fact — and this report contains no purported "final Gemini answers,"
because none exist. Everything measurable below the model was already
validated (PHASE_4A_REAL_WORLD_VALIDATION.md, PHASE_4A_POST_IMPLEMENTATION_REVIEW.md);
the suite is scripted and reusable the moment the backend answers.

## 2. Why the secret isn't taking effect — diagnostic checklist

Project ref (from the app's own config): **`fqlzrkmvhliyuwkpiosp`**

Most likely causes, in order:

1. **Wrong target:** the secret was set for a different project ref, or in a
   local `.env` file (local env does nothing for deployed functions).
   Verify: `npx supabase secrets list --project-ref fqlzrkmvhliyuwkpiosp`
   must show `GEMINI_API_KEY`.
2. **Name mismatch:** the function reads exactly
   `Deno.env.get("GEMINI_API_KEY")` — any other spelling fails silently.
3. **Wrong dashboard section:** it must be *Edge Functions → Secrets* (or
   the CLI command below), not Vault or project settings.
4. **Stale function instance:** rare, but a redeploy forces env pickup —
   and is required anyway (see below).

**One command fixes both problems at once:**

```
npx supabase secrets set GEMINI_API_KEY=<key> --project-ref fqlzrkmvhliyuwkpiosp
npx supabase functions deploy chess-mentor --project-ref fqlzrkmvhliyuwkpiosp
npx supabase secrets set ALLOWED_ORIGINS=https://chess-mateapp.netlify.app --project-ref fqlzrkmvhliyuwkpiosp
```

The redeploy also ships the hardened version (fail-closed CORS, prompt
caps, concurrency-safe rate limiter, non-leaking 500s — all sitting merged
in `main` since PR #55 and never deployed).

## 3. Answers to the four questions

**1. Is the coach production ready?**
**No — it is production *down*.** The software stack is ready: the
architecture carries an 8.5/10 review; retrieval, routing, game-level
context, and conversational memory are validated end-to-end below the model
(grounding scores CQ 8.1 / SP 7.9 / PV 8.0 / LE 8.0); the error path shown
to users during the outage is graceful and vendor-neutral. Readiness is
gated exclusively by the ops step above, plus one live validation run after
it.

**2. Is R5 still required?**
**Yes** — unchanged. The three question-blindness signatures (concept
questions can't reach their docs, "typical plan" retrieves motif docs,
"what did I miss" routes to `coach`) are code gaps no ops action fixes. R5
remains the top code improvement, sequenced after the first successful live
validation.

**3. Top 3 remaining weaknesses**
1. **Ops/deployment discipline:** the secret believed configured isn't;
   the hardened function believed shipped isn't; prod drift keeps
   recurring (also: Netlify serves a stale build; Sentry DSN unset). The
   pattern, not any single item, is the weakness — nothing verifies
   deployed state automatically (a smoke-test seam for the edge function
   and a CI deploy step were already recommended in the audit).
2. **Question-blindness (R5)** — retrieval and routing can't read what the
   user literally asked.
3. **Conversational limits (accepted for v1):** exact-match repeat
   detection, one-exchange history window — fine now, first thing users
   will bump into after R5.

**4. What would prevent launch today?**
In hard-blocker order:
1. `GEMINI_API_KEY` not reaching the deployed function — the advertised
   coach feature errors for every user.
2. Old edge function deployed — permissive CORS and a leaky 500 body;
   the hardening must actually ship.
3. Stale frontend on Netlify (drift audit): the deployed build predates
   Phases 3A–4A entirely — none of the coach improvements are in
   production regardless of the backend.
4. No production error monitoring (`VITE_SENTRY_DSN` unset) — launch-day
   issues would be invisible.
5. Open validation account + no signup email confirmation — tighten before
   public traffic (and delete `arjav.jain1512+cm4avalidation@gmail.com`).

## 4. Standing recommendation

Run the three commands in §2, confirm with any single coach question in the
app (or ask me — the probe takes one minute), and I will execute the full
17-call live suite and deliver the real-transcript version of this report
the same session. Until then, further validation passes cannot add
information.
