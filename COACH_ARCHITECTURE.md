# COACH_ARCHITECTURE.md

**ChessMate AI Coach — Phase 1 (Foundation)**
**Date:** 2026-07-08 · **Code:** `src/coach/`

The AI Coach is not a chess engine — Stockfish already provides perfect
analysis. The coach's job is to **explain, teach, personalize, and coach**
using the analysis ChessMate has already produced. This document describes the
provider-agnostic architecture every future AI backend (Gemini, Claude,
OpenAI, Ollama, …) plugs into.

---

## 1. System overview

```
UI (CoachTab / GameViewer)
  │  askChessMentor(question, context)        ← unchanged call shape
  ▼
Coach Service (api/coachService.ts)
  │ 1. Context Builder    (context/)   — normalize + derive (e.g. opening from PGN)
  │ 2. Structured Retrieval (retrieval/) — deterministic docs from knowledge/
  │ 3. Prompt Assembly    (prompts/)   — template + context + docs → ONE prompt
  │ 4. Memory             (memory/)    — record the exchange (session-only in P1)
  ▼
Provider Interface (providers/types.ts)
  ▼
GeminiProvider ──► chess-mentor edge function ──► Gemini   (today)
ClaudeProvider / OpenAIProvider / OllamaProvider           (future, same seam)
```

Two invariants:

1. **The frontend never knows which model is running.** It calls the coach
   service; provider selection is configuration (`VITE_AI_PROVIDER`).
2. **The LLM never fetches data.** Every piece of chess context (FEN, PGN,
   evaluation, classification, weaknesses, queue, …) is assembled by ChessMate
   *before* inference.

## 2. Module map

| Path | Responsibility |
|---|---|
| `src/coach/index.ts` | Public API barrel — the only import surface for the app. |
| `src/coach/config.ts` | Provider selection from env (`VITE_AI_PROVIDER`), injectable for tests. |
| `src/coach/errors.ts` | `CoachUnavailableError` taxonomy with user-safe messages. |
| `src/coach/api/` | `CoachService` (pipeline orchestration), request/answer types, the legacy-shaped `askChessMentor` adapter, and the composition root (`defaultCoachService.ts` — the only file touching app singletons). |
| `src/coach/context/` | `CoachContext` types + pure `buildCoachContext` / `renderContext`. |
| `src/coach/providers/` | `CoachProvider` interface, `GeminiProvider`, factory. |
| `src/coach/prompts/` | Externalized `.md` templates + `assemblePrompt` pipeline. |
| `src/coach/retrieval/` | Deterministic Phase-1 RAG over the knowledge base. |
| `src/coach/knowledge/` | Curated markdown corpus (openings/strategy/tactics/endgames/motifs/principles). |
| `src/coach/memory/` | Memory interfaces + session-only conversation memory. |

## 3. Provider interface

```ts
interface CoachProvider {
  id: string;
  displayName: string;
  maxPromptChars: number;                    // transport budget the assembler honors
  generate(req: ProviderRequest): Promise<ProviderResponse>;
  stream(req: ProviderRequest): AsyncIterable<string>;
  health(): Promise<ProviderHealth>;         // cheap, local, never spends budget
  supportsVision(): boolean;
  supportsStreaming(): boolean;
  supportsToolCalling(): boolean;
}
```

A provider is a dumb inference transport: it receives **one fully assembled
prompt** and returns text. It never builds prompts, never fetches chess data,
and never leaks vendor details in errors. Providers without native streaming
pseudo-stream (yield the full answer once) so all providers are consumed
through the same loop.

**GeminiProvider** wraps the existing `chess-mentor` Supabase edge function
with an unchanged wire contract: `POST { question }` with the caller's
verified JWT. Rate limiting, prompt fencing, and the `GEMINI_API_KEY` all stay
server-side — the key never reaches the client. `maxPromptChars = 4000`
mirrors the edge function's `MAX_QUESTION_CHARS`.

Adding a provider = implement `CoachProvider`, add one case to
`providers/factory.ts`. No frontend, service, or prompt changes.

## 4. Context builder

`CoachContext` carries: game (players, ratings, result, PGN, opening, user
color), position FEN, current move (SAN, classification, cp-loss, motifs from
`lib/motifs`, phase, best move, engine evaluation), player profile (rating,
accuracy, weakness summary from `lib/weaknessProfile`, recent mistakes/games),
move history, and the Send-to-Improve queue.

`buildCoachContext` is **pure** (no Supabase, no network): callers pass data
the app already loaded; the builder derives what is derivable (opening
detection reuses `lib/openings` + `lib/weaknessProfile.extractOpeningMoves`).
`renderContext` emits compact labeled lines, caps unbounded inputs (history,
mistake lists), and **omits absent data instead of fabricating it** — the
same honesty model as the weakness engine.

## 5. Prompt assembly

Templates live in `prompts/*.md` — never in TypeScript — one per task:
`coach`, `lesson`, `review`, `opening`, `mistake`. Each has `{{context}}`,
`{{knowledge}}`, `{{question}}` slots.

```
context block + retrieved docs + template  →  assemblePrompt  →  final prompt
```

Budgeting is deterministic and ordered: if the render exceeds the provider's
`maxPromptChars`, knowledge docs are shed last-first (retrieval ordered them
by relevance), then context lines are trimmed from the end (core
game/position/move lines render first). **The question is never cut** — an
oversize question fails with a graceful user-facing error.

## 6. Knowledge base & structured retrieval (Phase-1 RAG)

`knowledge/` holds small curated markdown docs, bundled at build time via
`?raw` imports and registered in `knowledge/index.ts` with retrieval `tags`
(opening names, motif ids from `lib/motifs`, phases, classifications).
Contents are Phase-1 placeholders; the registry shape is permanent.

Retrieval (`retrieval/retriever.ts`) is **deterministic tag matching** in a
fixed priority order — `opening → theme/phase → mistake → motif` — deduplicated
and capped (default 2 docs) to respect the prompt budget. No embeddings, no
vector store, no scoring model: the same query always returns the same docs,
so retrieval is unit-testable and prompts are reproducible. `queryFromContext`
derives the query from the assembled context (e.g. a blunder tagged
`hung_piece` in the middlegame retrieves the hanging-pieces motif doc; only
the endgame phase is specific enough to retrieve by phase).

## 7. Memory

Phase 1 ships **interfaces + orchestration only** (no schema changes):
`ConversationMemory`, `UserMemory`, `GameMemory`, `WeaknessMemory`,
`RecentLessons`, bundled as an optional `CoachMemory`. The single
implementation is `SessionConversationMemory` (in-memory, capped at 10 turns,
one per service instance). The service records every exchange; nothing reads
memory into prompts yet — that is a Phase-2 decision once persistence exists.

## 8. Configuration & errors

`VITE_AI_PROVIDER=gemini|claude|openai|ollama` (default `gemini`). Unknown
values fall back to the default with a console warning; recognized-but-
unimplemented providers resolve to a stub that fails gracefully at call time.

Every failure becomes a `CoachUnavailableError` with a `reason`
(`not-configured | offline | rate-limited | auth-required | no-context |
unknown`) and a user-safe message. The UI toasts `error.message`, so no
message may name a vendor, an env var, or transport internals —
"AI Coach is not available yet", never "GEMINI_API_KEY missing". Server error
details stay in server logs / `api_logs`.

## 9. Testing

All pipeline stages are unit-tested without API keys or network
(`src/coach/**/*.test.ts`): config resolution, the Gemini provider against an
injected fetch (wire contract, status→reason mapping, no vendor leakage,
capabilities, pseudo-stream), context building/rendering, template
externalization + rendering, assembly budgeting, retrieval determinism, and
the full service pipeline against a mock provider (including graceful-error
paths and conversation memory).

## 10. Future work (explicitly deferred)

- **Real RAG:** swap `retrieveKnowledge` for embedding search behind the same
  `(query) → KnowledgeDoc[]` seam once the corpus outgrows tag matching.
- **More providers:** Claude/OpenAI (server-side edge functions, like Gemini)
  and Ollama (local HTTP) implement `CoachProvider`; native streaming providers
  return `supportsStreaming() === true` and a real `stream()`.
- **Persistent memory:** Supabase-backed implementations of the memory
  interfaces (+ migrations), then feeding `ConversationMemory.recent()` into
  the context block.
- **Multi-agent:** the service seam allows a planner/critic split later; the
  provider interface already exposes `supportsToolCalling()`.
- **Coach screen:** the `/coach` route is still a placeholder; it should be
  built on `CoachService` directly (tasks `lesson`/`review`/`opening` are
  ready for it).
- **Client-side prompt/persona unification:** today the edge function applies
  the persona/format system prompt server-side and the assembled prompt rides
  in its `<question>` block. When providers with richer transports land, move
  the persona into the templates and slim the edge wrapper.
