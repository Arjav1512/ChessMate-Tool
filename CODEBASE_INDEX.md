# Codebase Index — ChessMate Tool

This file is an automatically generated high-level index of the repository created to help onboard contributors and for quick navigation. It lists the most important source files, top-level exports, and a short description for each.

Core app

- `src/main.tsx` — app entry; renders `App` into the DOM.
- `src/App.tsx` — default export `App` (wraps providers and renders `MainApp`).

Components (src/components)

- `ChessBoard.tsx` — export `ChessBoard` component: interactive board, FEN-driven, click-to-move support.
- `GameList.tsx` — export `GameList` component: lists user games, upload/paste PGN support, uses `supabase` and `parsePGN`.
- `GameViewer.tsx` — export `GameViewer` component: replay moves, show evaluation, uses `stockfish` and `parsePGN`.
- `ChatInterface.tsx` — export `ChatInterface` component: Q&A UI, stores questions via Supabase and calls `askChessMentor`.
- `BulkAnalysis.tsx` — export `BulkAnalysis` component: batch analyzes games with `stockfish`.
- `AuthForm.tsx`, `Toast.tsx`, `ErrorBoundary.tsx`, `ProgressBar.tsx`, `BoardArrows.tsx`, `DisplaySettings.tsx`, `EvaluationGauge.tsx`, `AnalyzeGamesPage.tsx`, `MarkdownRenderer.tsx`, `StatsDashboard.tsx`, `Toggle.tsx` — UI components.

Contexts (src/contexts)

- `AuthContext.tsx` — `AuthProvider`, `useAuth`: Supabase auth helpers (signIn, signUp, OAuth, signOut).
- `ToastContext.tsx` — `ToastProvider`, `useToast`: toast queue and helper.

Library code (src/lib)

- `supabase.ts` — exports `supabase` client and interfaces: `Profile`, `Game`, `Move`, `Question`.
- `pgn.ts` — `parsePGN`, `validatePGN`, `PGNParseError`: robust PGN parsing and validation.
- `stockfish.ts` — `StockfishEngine` class and singleton `stockfish`: web-worker-based Stockfish integration with analyzePosition.
- `sentry.ts` — Sentry helpers (`initSentry`, `logError`, `logMessage`, etc.).
- `gemini.ts` — helpers to call the Chess Mentor backend or ask model (used by `ChatInterface`).

Serverless / Supabase functions

- `supabase/functions/chess-mentor/index.ts` — Deno function that proxies requests to Google Generative AI (Gemini) and logs requests to Supabase. Rate-limited and CORS-aware.

Tests & e2e

- `e2e/*.spec.ts` — Playwright end-to-end tests (accessibility, auth, game-import).
- `src/test/setup.ts` — test setup utilities.

How this index was generated

- The index was created by scanning top-level `src/` files and key `supabase/` function files to extract default exports and exported symbols. It is intentionally concise — it focuses on major modules and components.

How to update

- To update this index manually: run a repository scan or edit this file.
- Machine-readable index is at `code_index.json` (used by tools/scripts).

Quick navigation tips

- Search for a component by name in the workspace (IDE: "Go to Symbol").
- For runtime wiring, inspect `src/App.tsx` and the providers in `src/contexts`.

Refreshing this index

- To refresh the machine-readable index (`code_index.json`) manually, run a workspace scan and update the JSON. A simple script or IDE macro can:
  1.  Find all `export` occurrences under `src/` and `supabase/functions`.
  2.  Produce a JSON map of symbol -> file.
  3.  Overwrite `code_index.json` and update the `generated_at` timestamp.

If you'd like, I can add a small Node script to automate this refresh — tell me if you want that and I will add it.

Next steps

- Add more granular symbol indexing (props, function signatures, tests) to `code_index.json` if desired.

---

Generated: 2025-10-20
