# ADR 001 — Coach Foundation Refinement (Pre-Phase 2)

**Date:** 2026-07-09 · **Status:** Accepted · **Scope:** `src/coach/` only
**Supersedes:** the Phase-1 shape of `CoachService` (commit `d2db0ad`)
**Companion doc:** `COACH_ARCHITECTURE.md`

## Context

Phase 1 delivered a working provider-agnostic coach, but `CoachService` owned
the whole pipeline (validation, context, retrieval, assembly, inference,
memory) as concrete calls to free functions. Before Phase 2 builds on top
(vector RAG, more providers, persistent memory), each pipeline stage must be
swappable without touching the service. This refactor is behavior-preserving:
zero user-visible changes, the deployed `chess-mentor` edge function
untouched.

## Decisions

### 1. Split `CoachService` into façade + `CoachOrchestrator`

- **Was:** one class doing validation + pipeline + error normalization.
- **Now:** `CoachService` only delegates and guarantees `CoachUnavailableError`
  out; `CoachOrchestrator` owns the stage order
  (context → eval gap-fill → retrieval → prompt → provider → memory).
- **Why:** the façade's contract ("safe errors, stable API") and the
  pipeline's contract ("this order, these stages") change for different
  reasons. Callers and tests can now target each independently.
- **Consequence:** the façade wraps the *entire* pipeline in error
  normalization (previously only the provider call was wrapped), so an
  unexpected bug in any stage also surfaces as a safe `unknown` error —
  a strictly stronger guarantee.

### 2. `KnowledgeRetriever` interface; `StructuredRetriever` implements it

- **Was:** orchestration called the free functions `queryFromContext` +
  `retrieveKnowledge` directly.
- **Now:** the pipeline depends on
  `retrieve(context, task): Promise<KnowledgeDoc[]>`; the deterministic
  strategy is one implementation. The pure functions remain (they are the
  strategy's tested internals).
- **Why (interface shape):** the interface takes the *context*, not a
  pre-derived tag query — a vector retriever would embed the rendered context
  and has no use for tags. Async because embedding lookups will not be sync.
- **Consequence:** future `VectorRetriever`/`HybridRetriever` are composition-
  root swaps. A test pins this with a fake vector retriever.

### 3. `MemoryProvider` abstraction; `SessionMemoryProvider` implements it

- **Was:** an ad-hoc `CoachMemory` bag of optional facets.
- **Now:** `MemoryProvider { id, conversation, user?, game?, weaknesses?,
  lessons? }` — a storage backend serving memory facets; `conversation` is
  required because every backend can hold at least a session dialogue.
- **Why:** "what the coach remembers" (facet interfaces, unchanged) and
  "where memories live" (session/Supabase/Redis/local) are separate concerns;
  Phase 2 persistence must not reshape the pipeline.

### 4. `PromptBuilder` interface; `TemplatePromptBuilder` implements it

- **Was:** orchestration called `assemblePrompt` directly.
- **Now:** `build(input): string` — context + knowledge + template + question
  in, exactly one prompt out. Deliberately sync: rendering is pure; I/O
  belongs upstream.
- **Why:** prompt construction must stay free of orchestration/retrieval/
  provider knowledge so prompts remain reproducible; the interface also opens
  A/B prompt strategies without touching assembly internals.

### 5. `ContextBuilder` interface; `ChessContextBuilder` implements it

- **Was:** orchestration called the pure `buildCoachContext` directly.
- **Now:** `build(input): Promise<CoachContext>`; the default implementation
  is the same pure function.
- **Why:** a future builder will gather parts server-side (recent games,
  weakness profile) and must be async; making the seam now costs one tiny
  class and saves an interface break later.

### 6. `EvaluationProvider` interface (+ `PrecomputedEvaluationProvider`)

- **New:** `evaluate(fen): Promise<CoachEvaluation | null>`. The orchestrator
  uses it only to *fill a gap* — a context with a FEN but no evaluation — and
  never overwrites request-supplied engine data.
- **Why:** engine truth is a strategy (precomputed today, live/cloud/cached
  later); the analysis pipeline itself is explicitly out of scope and
  untouched.
- **Consequence:** **not wired in the default composition** (evaluations
  arrive precomputed with every request today), so runtime behavior is
  identical; a seam test exercises it.

### 7. `ChessMentorTransport` — deployment coupling isolated in one adapter

- **Was:** `GeminiProvider` owned the edge-function wire contract (URL shape,
  `{question}` body, 4000-char cap, HTTP-status → reason mapping).
- **Now:** `CoachTransport` interface + `ChessMentorTransport` adapter own
  all of it; `GeminiProvider` is capability declaration + delegation.
- **Why:** the coupling is to the *deployed backend*, not to the vendor. A
  Claude edge function would reuse this adapter pattern; a local Ollama
  provider would implement its own transport. The deployed backend must keep
  working with old and new clients, so the contract itself is unchanged.
- **Consequence:** factory deps renamed `gemini:` → `backend:` — vendor names
  now appear only in `config.ts` (the config value contract) and
  `providers/factory.ts` (config → implementation mapping).

### 8. Composition in exactly one place

`api/defaultCoachService.ts` is the only file that touches app singletons
(`import.meta.env`, the `supabase` client) and the only place concrete stage
classes are chosen. The lazy `getCoachService()` instance is retained
knowingly (one conversation memory per session; the frontend adapter needs a
stable instance) — everything beneath it is constructor-injected.

### 9. Folder structure: one addition, no moves

Only `evaluation/` was added (new concern). Existing files stayed put;
new seams went into new files beside their implementations
(`retrieval/types.ts`, `prompts/promptBuilder.ts`,
`providers/chessMentorTransport.ts`). Stability over cosmetics.

## Alternatives considered

- **Middleware/plugin pipeline** (array of stages): rejected — the coach has
  exactly one meaningful stage order; a generic pipeline abstraction would
  hide it without adding a real degree of freedom.
- **Making `PromptBuilder` async** for symmetry: rejected — rendering is pure;
  an async signature would invite I/O into the one stage that must stay
  reproducible.
- **Removing `getCoachService()`** entirely: rejected for now — per-call
  construction would discard conversation memory; React-context injection is
  UI work out of scope for a behavior-preserving refactor.
- **Renaming `defaultCoachService.ts` → `composition.ts`**: rejected —
  cosmetic move, breaks blame history for no maintainability gain.

## Verification

Typecheck, lint (0 errors), full unit suite (350 passing, incl. new seam
tests for custom retriever + evaluation gap-fill), production build — entry
chunk byte-identical (434.50 kB). No frontend file changed in this refactor.
