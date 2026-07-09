# COACH_ARCHITECTURE.md

**ChessMate AI Coach — provider-agnostic coaching architecture**
**Updated:** 2026-07-09 (foundation refinement) · **Code:** `src/coach/`
**ADR:** `docs/adr/001-coach-foundation-refinement.md`

The AI Coach is not a chess engine — Stockfish already provides perfect
analysis. The coach's job is to **explain, teach, personalize, and coach**
using the analysis ChessMate has already produced. This document describes the
architecture every AI backend (Gemini today; Claude, OpenAI, Ollama later)
plugs into.

Two invariants:

1. **The frontend never knows which model is running.** It calls the coach
   service; provider selection is configuration (`VITE_AI_PROVIDER`).
2. **The LLM never fetches data.** Every piece of chess context (FEN, PGN,
   evaluation, classification, weaknesses, queue, …) is assembled by ChessMate
   *before* inference.

---

## 1. Component diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Frontend (CoachTab / GameViewer)                                        │
│   askChessMentor(question, context)          api/askCoach.ts (adapter)  │
└──────────────────────────────┬──────────────────────────────────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ CoachService                              api/coachService.ts (façade)  │
│   delegates to the orchestrator; guarantees every failure leaves as a   │
│   CoachUnavailableError with a user-safe message                        │
└──────────────────────────────┬──────────────────────────────────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ CoachOrchestrator                    api/coachOrchestrator.ts (pipeline)│
│                                                                         │
│   ContextBuilder ──► EvaluationProvider? ──► KnowledgeRetriever         │
│        │                (gap-fill only)           │                     │
│        └──────────────────┬───────────────────────┘                     │
│                           ▼                                             │
│                     PromptBuilder ──► CoachProvider ──► MemoryProvider  │
└──────────────────────────────┬──────────────────────────────────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ CoachProvider (interface)                          providers/types.ts   │
│   GeminiProvider ─► CoachTransport ─► ChessMentorTransport (adapter)    │
│                                            │                            │
│                              chess-mentor edge function ─► model + key  │
│                              (server-side, deployed, unchanged)         │
└─────────────────────────────────────────────────────────────────────────┘
```

Every box the orchestrator touches is an **interface**; concrete classes are
chosen in exactly one place, the composition root
(`api/defaultCoachService.ts`).

## 2. Request lifecycle

1. **Entry** — UI calls `askChessMentor(question, context)`; the adapter maps
   the legacy context shape to `CoachContext` and calls
   `getCoachService().ask({ task: 'coach', question, context })`.
2. **Façade** — `CoachService.ask` delegates to `CoachOrchestrator.run` inside
   a try/catch that normalizes *any* failure to `CoachUnavailableError`.
3. **Validate** — empty question → `no-context`, before any work.
4. **Context** — `ContextBuilder.build` normalizes the caller's context and
   derives what is derivable (opening from PGN via `lib/openings`). Pure, no
   I/O in the default builder.
5. **Evaluation gap-fill** — *only if* an `EvaluationProvider` is composed,
   the context has a FEN, and no evaluation arrived with the request, the
   orchestrator asks the strategy for engine truth. (Not composed by default —
   evaluations arrive precomputed with the request today.)
6. **Retrieval** — `KnowledgeRetriever.retrieve(context, task)` returns
   relevant `KnowledgeDoc`s (see §6).
7. **Prompt build** — `PromptBuilder.build({task, question, context, docs,
   maxChars})` renders the externalized template into **one** prompt within
   the provider's budget (see §5).
8. **Inference** — `CoachProvider.generate({prompt, signal})` → text.
9. **Memory** — the exchange is recorded via
   `MemoryProvider.conversation.record(...)` (session-scoped today).
10. **Answer** — `{ text, task, providerId }` returns to the UI; `providerId`
    is telemetry-only and never rendered.

## 3. Dependency graph

```
askCoach ──► defaultCoachService (composition root)
                 │  constructs: ChessContextBuilder, StructuredRetriever,
                 │              TemplatePromptBuilder, SessionMemoryProvider,
                 │              createProvider(config) ─► GeminiProvider
                 │                                          └► ChessMentorTransport
                 ▼
             CoachService ──► CoachOrchestrator ──► interfaces only:
                                  ContextBuilder      (context/)
                                  KnowledgeRetriever  (retrieval/types)
                                  PromptBuilder       (prompts/promptBuilder)
                                  CoachProvider       (providers/types)
                                  MemoryProvider      (memory/types)
                                  EvaluationProvider  (evaluation/types)
```

Rules the graph enforces:

- **Composition happens in exactly one place.** Only
  `defaultCoachService.ts` touches app singletons (`import.meta.env` via
  `resolveCoachConfig`, the `supabase` client for JWTs). Everything below is
  constructor-injected and testable with no keys or network.
- **Vendors are named in exactly two places**: `config.ts` (the configuration
  value contract) and `providers/factory.ts` (the config → implementation
  mapping). No layer above a provider knows which model runs.
- **The deployed backend is known in exactly one place**:
  `providers/chessMentorTransport.ts` owns the wire contract (POST
  `{question}` + JWT, the 4000-char cap, the HTTP-status → error-reason map).

## 4. Why each abstraction exists

| Abstraction | Why it exists |
|---|---|
| `CoachService` (façade) | The app needs one stable entry point whose only promises are "returns an answer" and "never throws anything unsafe". Keeping it logic-free means pipeline changes never ripple to callers. |
| `CoachOrchestrator` | The pipeline's *order* is a real design decision (context before retrieval before prompt) and deserves one owner. Splitting it from the façade lets tests drive the pipeline directly and keeps the façade honest. |
| `ContextBuilder` | Today context assembly is pure; tomorrow a builder may gather recent games/weaknesses server-side. The async interface makes that swap invisible to the pipeline. |
| `EvaluationProvider` | Engine truth is a strategy (precomputed today; live/cloud/cached later). The orchestrator only ever *gap-fills* — it never re-runs analysis, so the existing Stockfish pipeline stays untouched. |
| `KnowledgeRetriever` | Retrieval strategy is the piece most likely to change (structured → vector → hybrid). The interface takes `(context, task)` — not a pre-derived tag query — because each strategy derives relevance differently (a vector retriever embeds the rendered context; tags would be meaningless to it). |
| `PromptBuilder` | Prompt rendering is pure and must stay free of orchestration/retrieval/provider logic so prompts remain reproducible and testable. Sync on purpose. |
| `CoachProvider` | The model boundary. A provider is a dumb inference transport: one assembled prompt in, text out, vendor-neutral errors, capability flags (`supportsVision/Streaming/ToolCalling`). |
| `CoachTransport` | Splits *deployment* coupling (the chess-mentor edge function's wire contract) from *vendor* identity. A future Claude edge function reuses `ChessMentorTransport`-style adapters; a local Ollama provider implements its own transport. |
| `MemoryProvider` | Memory facets (conversation/user/game/weaknesses/lessons) are one concern; where they live (session/Supabase/Redis/local) is another. The provider abstraction keeps the second concern out of the pipeline. |
| `CoachUnavailableError` | A closed reason taxonomy (`not-configured / offline / rate-limited / auth-required / no-context / unknown`) with user-safe messages is what lets the UI toast `error.message` blindly. |

## 5. Prompt assembly

Templates live in `prompts/*.md` — never in TypeScript — one per task
(`coach`, `lesson`, `review`, `opening`, `mistake`), each with `{{context}}`,
`{{knowledge}}`, `{{question}}` slots. Budgeting inside `assemblePrompt` is
deterministic and ordered: knowledge docs shed last-first, then context lines
trimmed from the end; **the question is never cut** (an oversize question
fails with a graceful user-facing error).

## 6. Retrieval lifecycle (Phase-1 RAG)

`StructuredRetriever` (the only strategy today) derives a tag query from the
context — priority `opening → endgame-phase → motifs → mistake classification`
(motifs outrank the bare classification because they are more specific, and
the prompt budget often fits only the first doc) — and matches it
deterministically against `knowledge/index.ts` (63 curated coach-voice
markdown docs bundled via `?raw`, see KNOWLEDGE_BASE_PLAN.md), deduplicated,
capped at 2 docs. Matching is
**whole-word tag matching only** (a tag equals the term or appears in it as a
whole word) — never raw substring in either direction, so fragments ("pins" in
"Pinsk") and short terms inside long tags can't fire accidentally. Openings
literally named "… Opening" (English, Reti, …) have no dedicated doc and fall
back to `principles/opening_principles` via its `opening` tag — deliberate.
Same query, same docs, every time: retrieval is unit-testable and prompts
reproducible.

Future strategies implement the same `KnowledgeRetriever` interface:
`VectorRetriever` (embeddings over the corpus), `HybridRetriever` (structured
∩ vector). They swap in at the composition root; nothing else changes — a
test pins this by running the pipeline against a fake vector retriever.

## 7. Provider lifecycle

1. `resolveCoachConfig()` reads `VITE_AI_PROVIDER` (default `gemini`; unknown
   values warn + fall back; recognized-but-unimplemented values resolve to a
   graceful `not-configured` stub).
2. `createProvider(config, deps)` builds the implementation; for
   backend-fronted providers it wires a `ChessMentorTransport` with the
   Supabase URL and a JWT getter.
3. `generate()` sends the one assembled prompt; transport failures map to
   vendor-neutral reasons (429 → `rate-limited`, 401/403 → `auth-required`,
   500 → `not-configured`, network → `offline`).
4. `health()` is a cheap local readiness check (config + session present);
   it never spends the user's rate budget.
5. `stream()` pseudo-streams (yields the full answer once) for providers
   without native streaming, so every provider is consumed through one loop.

## 8. Memory lifecycle

`SessionMemoryProvider` (id `session`) is composed per `CoachService`
instance; the orchestrator records every successful exchange into its
`conversation` facet (capped at 10 turns, in-memory, gone on reload). Nothing
reads memory into prompts yet — that is a Phase-2 decision once persistence
exists. Persistent backends (Supabase/Redis/local) implement `MemoryProvider`
and swap in at the composition root; facets a backend cannot serve are absent
and the pipeline degrades silently.

## 9. Extension points (what Phase 2+ plugs into)

| Future work | Where it plugs in | What does NOT change |
|---|---|---|
| Vector / hybrid RAG | new `KnowledgeRetriever` impl + composition root | orchestrator, service, prompts, frontend |
| Claude / OpenAI providers | new edge function + factory case (reuse transport pattern) | everything above the factory |
| Ollama (local) | new `CoachProvider` with its own transport | same |
| Persistent memory | `MemoryProvider` impl + migrations + composition root | pipeline order, façade |
| Live/cloud/cached eval | `EvaluationProvider` impl + composition root | analysis pipeline, context builder |
| Server-side context gathering | new `ContextBuilder` impl | retrieval, prompts, provider |
| Coach screen (`/coach`) | call `CoachService` with `lesson`/`review` tasks | the pipeline |
| Native streaming UI | consume `provider.stream()`; flip `supportsStreaming()` | non-streaming providers |

## 10. Known, deliberate coupling

- **The edge function applies its own persona/format system prompt** and the
  assembled client prompt rides inside its `question` field (≤4000 chars).
  Kept so the already-deployed backend keeps working with old and new clients
  alike. All knowledge of this contract is confined to
  `ChessMentorTransport`; unifying the persona into the client templates is
  deferred until a richer transport exists.
- **`getCoachService()` is a lazy module-level instance** — the pragmatic
  composition entry for the frontend adapter (one conversation memory per
  session). Everything beneath it is constructor-injected; tests never use it.

## 11. Testing

All pipeline stages are unit-tested without API keys or network
(`src/coach/**/*.test.ts`): config resolution, provider + transport against an
injected fetch (wire contract, status→reason mapping, no vendor leakage,
capabilities, pseudo-stream), context building/rendering, template
externalization + rendering, assembly budgeting, retrieval determinism, the
full orchestrated pipeline against a mock provider, and the seam tests that
pin the future-proofing claims (custom retriever, evaluation gap-fill).
