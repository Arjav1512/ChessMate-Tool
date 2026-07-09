# ARCHITECTURE_REVIEW.md — AI Coach Foundation

**Mode:** Ground Truth (full re-read of `src/coach/**` on disk, mechanical
import-graph extraction, runtime probes — no claims from memory or docs).
**Date:** 2026-07-09 · **Reviewed at:** `feat/coach-foundation` @ `87a5fe8`
**Reviewer scope:** production-readiness of the coach architecture as the
permanent AI foundation of ChessMate. No new features, no redesign.

---

## 1. Verification results (measured, not assumed)

| Check | Method | Result |
|---|---|---|
| Dependency directions | extracted every `import` in 22 non-test modules | **Correct.** Strictly downward: `api/` → stages → leaves (`errors`, `config`, `knowledge`, `templates`). Nothing imports `api/` except the barrel. |
| Circular dependencies | manual graph walk over the extracted imports | **None.** |
| Composition root | grep for app-singleton usage (`import.meta.env`, `supabase`) | **Single.** Only `api/defaultCoachService.ts` touches the supabase client; only `config.ts` reads env (as an injectable default). |
| DI boundaries | constructor audit of all 6 stage classes | **Clean.** Every stage is constructor-injected; the whole pipeline runs in tests with no keys/network. |
| Vendor isolation | grep for vendor names above the provider layer | **Confined** to `config.ts` (config value contract) and `providers/factory.ts` (mapping). Two comment-only mentions elsewhere (an anti-example in `errors.ts`, an explanatory list in `providers/types.ts`) — documentation, not coupling. |
| Transport purity | read of `chessMentorTransport.ts` | **Pure networking**: URL, JWT, body shape, status→reason mapping, JSON parse. No prompt, business, retrieval, or orchestration logic. |
| Orchestration order | read of `coachOrchestrator.ts` | validate → context → eval gap-fill → retrieve → prompt → generate → memory. Each stage one call, one responsibility. |
| Prompt budgeting | read of `assemble.ts` + existing tests | Deterministic, ordered shedding (docs last-first, then context tail); question never cut; oversize question fails gracefully; final fallback provably ≤ budget (the empty-context render is pre-checked). |
| Behavior preservation | full suite + build | 352 tests green; entry chunk byte-identical (434.50 kB); no frontend file touched. |

## 2. Critical issues

**None found.** No dependency inversion violations, no hidden global state
beyond the documented `getCoachService()` session instance, no vendor or
transport detail reachable from the UI, no unbounded work, no schema or
deployed-backend risk.

## 3. Minor issues found — fixed in this review (smallest possible diff)

1. **Retrieval matcher over-matched by accident** (`retrieval/retriever.ts`).
   The old test was bidirectional substring
   (`needle.includes(tag) || tag.includes(needle)` + title substring).
   Runtime probe confirmed: *"English Opening" / "Reti Opening" / "Bird's
   Opening"* retrieved `principles/opening_principles` only because the word
   "Opening" happens to appear in the name — an accidental path — and a short
   term could match any longer tag containing it ("material" →
   `missed_material_gain`). **Fix:** whole-word tag matching only (regex-escaped,
   `\b`-bounded). The "… Opening → general principles" fallback was kept and is
   now documented as deliberate on the tag itself. Pinned by two new tests.
2. **Swallowed diagnostics at the façade** (`api/coachService.ts`). An
   unexpected pipeline error was normalized to a safe `unknown` and the
   original vanished — an observability gap in exactly the place designed to
   hide detail from users. **Fix:** the façade now reports non-coach errors via
   the app's standard `logError` (console + Sentry in prod) before
   normalizing. `errors.ts` stays a pure leaf. Pinned by an updated test.
3. **Base-URL trailing slash** (`config.ts`). `VITE_SUPABASE_URL=…/` would
   produce `…//functions/v1/chess-mentor`. **Fix:** normalize in
   `resolveCoachConfig` (the config boundary, so every transport benefits).
   Pinned by an extended test.

## 4. Recommended improvements (deferred — do when the trigger arrives)

- **Feed conversation memory into prompts** once persistence exists (Phase 2);
  the recording half already works, the reading half is a deliberate gap.
- **Unify the server persona with client templates** when a richer transport
  lands; today's duplication is the price of not breaking the deployed edge
  function and is confined to `ChessMentorTransport` + the templates.
- **Missing-but-cheap tests** (add opportunistically, none block shipping):
  `SessionConversationMemory` 10-turn cap; `UnimplementedProvider.stream()`
  error path; malformed-JSON transport body; the `askCoach` legacy mapping
  (currently only covered transitively — direct testing is awkward because the
  module imports the composition root at load time).
- **`askCoach.ts` file name** exports `askChessMentor` — rename the file (not
  the function) at the next natural churn; not worth a standalone diff.

## 5. Improvements considered and rejected as unnecessary

- **Moving `CoachTask` out of `prompts/templates.ts`** (retrieval/memory/api
  import it from there). The imports are type-only — erased at compile, zero
  runtime coupling, no cycle. A shared `types.ts` would be movement without
  measurable benefit.
- **Removing the `ContextBuilder` / `EvaluationProvider` seams as
  overengineering.** Both are one-class-deep, documented (ADR §5/§6), and
  test-exercised; `EvaluationProvider` is optional and unwired by default.
  They encode known Phase-2 needs (server-side context gathering, live/cloud
  eval) whose interfaces would otherwise break. Kept.
- **Replacing `getCoachService()` with React-context injection.** Would touch
  UI for zero behavioral gain; the instance exists to keep one conversation
  memory per session and everything beneath it is injected. Kept, documented.
- **A middleware/plugin pipeline** instead of the fixed orchestrator: the
  pipeline has exactly one meaningful order; a generic stage array would hide
  it without adding a real degree of freedom.
- **Retry/backoff in the transport**: the edge function rate-limits per user;
  client retries would fight the budget and complicate the 429 path the UI
  already handles well.
- **Health-check network ping**: every call spends the user's rate budget and
  there is no free health route; the local readiness check is correct.

## 6. Interface scaling checks (asked-for futures, verified against signatures)

- **Vector / hybrid / reranking retrieval** — `retrieve(context, task):
  Promise<KnowledgeDoc[]>` carries the full context (a vector strategy embeds
  the rendered context; a reranker reorders internally before the cap). No
  interface change needed; pinned by the fake-vector-retriever test.
- **Redis / Supabase / localStorage / long-term memory** — `MemoryProvider`
  facets are storage-agnostic and optional; orchestration reads only
  `conversation.record(...)`. No orchestration change needed.
- **Cloud/live/cached engines** — `EvaluationProvider.evaluate(fen)` is
  strategy-shaped and optional; the orchestrator only gap-fills and never
  duplicates Stockfish work (verified: no engine import anywhere in
  `src/coach`; the only evaluation source is request context or the optional
  provider).
- **New model providers** — `CoachProvider` + `CoachTransport` split means a
  server-fronted provider is a factory case, and a local provider is one new
  transport. Nothing above the factory changes.

## 7. Documentation accuracy

`COACH_ARCHITECTURE.md` and ADR-001 were checked claim-by-claim against the
code: component diagram, stage order, dependency rules, doc count (25),
retrieval priority and cap (2), provider lifecycle, and the known-coupling
section all match. One drift was created by this review's matcher fix and has
been corrected (§6 now specifies whole-word matching and the "… Opening"
fallback). The testing section's counts remain accurate (now 47 coach tests).

## 8. Score and recommendation

**Architecture score: 8.5 / 10**

Deductions: the conversation-memory read-path gap (recorded but unread), the
server/client prompt duplication forced by deployment compatibility, the
session-singleton entry point, and small test gaps (§4) — all known, bounded,
and documented rather than accidental.

**Recommendation: Ship as-is** (the minor hardening this review identified is
already applied within it). The architecture is fit to be ChessMate's
permanent AI foundation: dependency directions are verified correct, every
Phase-2 extension lands at the composition root without touching
`CoachService`, and the failure surface reaching users is a closed, vendor-
neutral taxonomy. No major redesign is warranted — and none should be
accepted, since the current seams already absorb the known future.
