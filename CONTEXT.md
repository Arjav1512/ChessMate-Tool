# CONTEXT.md — Repository Context for AI Agents (and humans)

This is the detailed map of ChessMate: what it is, how it's wired, the invariants
you must not break, and where the bodies are buried. Read this before changing code.
For product framing see `PRODUCT.md`; for setup/testing see `README.md` and
`CONTRIBUTING.md`; for the security boundary see `SECURITY.md`.

---

## 1. What ChessMate is

A web app where a player imports their own chess games (PGN), analyzes them
move-by-move with on-device Stockfish, asks a Gemini-backed AI coach about
positions, and tracks improvement over time (accuracy, W/L/D, mistakes, per-color
split). Dark-first, single-page, English-only, responsive web (no native apps).

The chess board is the hero; everything else serves it. The product should read as
a serious analysis instrument, not a gamified app (see `PRODUCT.md` anti-references).

---

## 2. Tech stack

| Layer | Choice |
|---|---|
| UI | React 18 + TypeScript 5.5 (strict) |
| Build | Vite 5 + `vite-plugin-pwa` (terser, `drop_console: true` in prod) |
| Styles | Tailwind 3 + a CSS-variable token system in `src/style.css` |
| Backend | Supabase — Postgres (RLS), Auth, Edge Functions (Deno) |
| Engine | `stockfish.js@10` (asm.js) in a Web Worker, UCI protocol |
| Chess logic | `chess.js` |
| AI | Google Gemini (`gemini-2.0-flash`) via the `chess-mentor` Edge Function |
| Monitoring | Sentry (optional, behind `VITE_SENTRY_DSN`) |
| Tests | Vitest (jsdom) unit; Playwright + `@axe-core/playwright` e2e |
| Hosting | Vercel (SPA rewrites + security headers in `vercel.json`) |

---

## 3. Directory map (the parts that matter)

```text
src/
  App.tsx                 App shell: auth gate → password-recovery gate → main UI + modal routing
  main.tsx                React entry; initializes Sentry
  components/
    analysis/             AnalyzeGamesPage, BulkAnalysis, DisplaySettings, engine/ (EvalGraph, InsightCards, EngineSections)
    auth/                 AuthForm, PasswordResetRequest, PasswordResetComplete
    chess/                ChessBoard, BoardArrows, EvaluationGauge
    game/                 GameList (sidebar + import), GameViewer (board + nav + insights + chat)
    layout/               ErrorBoundary, ThemeToggle, CompatibilityWarning, ProfileModal
    marketing/            LandingPage (pre-auth)
    legal/                PrivacyPage
    stats/                StatsDashboard, ProgressBar
    ui/                   Design-system primitives: Button, Card, Input, Modal, Toast, Toggle,
                          Badge, Chip, Drawer, SegmentedControl, LoadingSpinner, MarkdownRenderer
  contexts/               AuthContext (session/OAuth/recovery/profile), ToastContext
  hooks/                  useAsync, useDebounce, useLocalStorage, useModalA11y, usePerformance,
                          useResponsive, useStockfishAnalysis
  lib/                    supabase, gemini, stockfish, oauth, oauthProviders, openings, userColor,
                          pgn, pgnLimits, dbErrors, sentry, sampleData
  workers/                pgnWorker (off-main-thread PGN batch parser)
  utils/                  validation, format, errorHandling, moveClassifier, gameInsights, cache,
                          performance, compatibility
supabase/
  config.toml             Pins verify_jwt=true for chess-mentor (project ref is public)
  functions/chess-mentor/ Deno Edge Function: verifies JWT, rate-limits, proxies Gemini
  migrations/             7 SQL migrations (schema, RLS, stats trigger, user_color)
e2e/                      Playwright specs (auth, game-import, password-reset, board-and-progress,
                          accessibility, empty-state)
ChessMate-Autonomous-OS/  Engineering operating-system docs (vision, state, backlog, scorecard, protocols)
```

There is **no** `src/i18n/` — i18n scaffolding was removed; the UI is English-only.

---

## 4. Data model (Supabase Postgres)

User-owned tables, all with RLS (`auth.uid() = user_id`, or via a `games` join):

- `profiles(id→auth.users, email, display_name, …)`
- `games(id, user_id→profiles, pgn, white_player, black_player, result, date, event, user_color, …)`
- `moves(id, game_id→games, move_number, white_move, black_move, position_fen, stockfish_evaluation jsonb, …)`
- `questions(id, user_id, game_id?, move_id?, question, answer, context jsonb, …)`
- `game_analysis_results(...)` and `user_statistics(...)` and `user_progress_snapshots(...)` — analysis aggregates
- `api_logs(id, user_id?, endpoint, question, success, error_message, created_at)` — Edge Function audit + rate-limit source

**Stats are trigger-maintained.** `update_user_statistics()` (SECURITY DEFINER) recomputes
`user_statistics` from `game_analysis_results` and `games`. It reads `games.user_color`
directly; games with `user_color = NULL` are **excluded** from W/L/D and the color split —
the trigger never guesses. See migration `20260615030000_rewrite_stats_trigger_on_user_color.sql`.

---

## 5. Key flows

1. **Import** (`GameList`): upload `.pgn` or paste → `checkPgnSize` (≤5 MiB, inclusive) →
   `pgnWorker` parses off-main-thread → rows inserted into `games`. `user_color` resolved at
   import when PGN headers match the user's display_name/email prefix (`lib/userColor.ts`).
2. **Analyze** (`GameViewer` + `useStockfishAnalysis`): `new Worker('/stockfish.js')`, UCI handshake,
   `go depth`/`go infinite`, scores normalized to White's POV, eval gauge + best-move arrows.
3. **Coach** (`lib/gemini.ts` → `chess-mentor`): sends the session JWT; the function verifies it,
   rate-limits per user, calls Gemini, returns markdown rendered by the XSS-safe `MarkdownRenderer`.
4. **Bulk analysis** (`BulkAnalysis`): runs Stockfish across the library, writes `game_analysis_results`,
   the trigger updates `user_statistics`.
5. **Progress/Stats** (`StatsDashboard`, `ProgressBar`): read aggregates.

---

## 6. Security invariants (do not break — see SECURITY.md)

1. **RLS is the boundary.** Every user table has RLS; the browser only ever holds the anon key.
   No service-role key ships to the client.
2. **No client-side secrets.** Gemini key lives only in Supabase secrets. `.env*` is gitignored.
3. **The Edge Function verifies the JWT** (`auth.getUser(token)`) and uses the authenticated user id
   as the rate-limit key; `config.toml` also pins `verify_jwt=true`. Do not reintroduce an
   unverified base64 decode of the token.
4. **CORS fails closed.** With no `ALLOWED_ORIGINS`, only localhost is allowed; production must set it.
5. **Rate limit** is DB-backed (10 req/min/user via `api_logs`). Bypassing it is a vuln.
6. **PGN cap** is a hard 5 MiB on both upload and paste paths (`checkPgnSize`).
7. **MarkdownRenderer is XSS-safe** — React elements only, never `dangerouslySetInnerHTML`.
8. **Password recovery** locks the UI until the new password is set (see `App.tsx` + `AuthContext`).
9. **CSP/HSTS** are set in `public/_headers` (Netlify — the live deploy target) **and** `vercel.json`
   (Vercel). CSP is `script-src 'self'` (no eval — Stockfish is asm.js). Adding an inline script or an
   `eval`-dependent dependency requires updating **both** header configs.

---

## 7. Conventions

- TypeScript strict; no `any` (prefer `unknown` + narrow). No dead code (TS6133 is an error to fix by deletion).
- Prefer editing existing files to adding new ones; follow the feature-folder layout.
- No emojis in source (fine in docs/PRs). Comments explain the *why*, not the *what*.
- **No partial features** — don't merge a half-wired flag or a dead button.
- Conventional-ish commit prefixes (`fix(auth):`, `feat(import):`).

---

## 8. Testing & gates

Run before any PR: `npm run typecheck && npm run lint && npm test && npm run build`.

- Unit/worker/static-regression tests live next to their source (`*.test.ts`). Several are
  *structural* checks over files (migrations, edge-function security) because we can't spin up a
  real Postgres/Deno in unit-test land — see `lib/migrations.test.ts`, `lib/edgeFunctionSecurity.test.ts`.
- Coverage: `npm run test:coverage` (v8 provider; no failing threshold yet — Sprint-2 follow-up).
- E2E: `npm run test:e2e`. Auth-gated specs (`game-import`, `board-and-progress`) auto-skip unless
  `PLAYWRIGHT_TEST_USER` / `PLAYWRIGHT_TEST_PASSWORD` are set for a real Supabase user.
- CI (`.github/workflows/ci.yml`): lint → typecheck+build → unit(+coverage) → e2e(chromium).

---

## 9. Gotchas / sharp edges

- **The live deploy target is Netlify** (`chess-mateapp`), so security headers must live in
  `public/_headers` (copied into `dist/` by Vite). `vercel.json` is kept in sync for Vercel but is
  ignored by Netlify. Neither applies to the local `vite` dev server, so local e2e won't catch a CSP
  regression — verify on the Netlify deploy preview (`curl -I`) and reason about CSP changes
  statically (allowed origins, `script-src`; Stockfish is asm.js, no eval needed).
- **`drop_console: true`** strips all `console.*` from the production bundle — never rely on console
  for prod behavior, and never log auth payloads even in dev.
- **`user_color = NULL`** silently removes a game from W/L/D and the color split. If stats "don't add
  up," check color resolution first.
- **Stockfish worker** is `/stockfish.js`, copied from `node_modules` into `public/` by the
  `copy-stockfish` Vite plugin at build start. It IS the worker script (no `STOCKFISH()` wrapper).
- **`supabase/.temp/`** holds credentials and is gitignored — never commit it. `config.toml` (project
  ref only) is safe to commit.
- **OAuth providers** are gated behind `VITE_OAUTH_GOOGLE_ENABLED` / `_GITHUB_ENABLED` (default false)
  so un-configured providers are hidden rather than shown as guaranteed-to-fail buttons.

---

## 10. The operating system

`ChessMate-Autonomous-OS/` holds the engineering OS: `PRODUCT_VISION`, `PROJECT_STATE`,
`SPRINT_BACKLOG`, `PRODUCTION_SCORECARD`, `DECISION_LOG`, and the workflow protocols
(`PR_PROTOCOL`, `MERGE_CHECKLIST`, `RELEASE_PROTOCOL`, `ESCALATION_PROTOCOL`,
`CODERABBIT_PROTOCOL`). Check `PROJECT_STATE.md` for the current sprint and open risks before
starting work.
