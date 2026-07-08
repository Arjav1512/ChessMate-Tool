# ChessMate — AI-Powered Chess Analysis & Mentor

ChessMate is a web-based chess improvement platform. Import your games,
analyze them with Stockfish, get explanations from an AI mentor, and
track your progress over time.

It is a production-leaning React + TypeScript app with Supabase auth /
RLS, an off-main-thread PGN parser, an on-device Stockfish engine
(Web Worker), and a Gemini-backed Edge Function for the AI coach.

---

The app now ships as the **Ivory routed shell** (React Router + a token-driven
design system) as the default authenticated experience; the legacy modal app is
one rollback flag away (`?ff=-ui.newShell`).

## ✨ Core Features

- ♟️ **Interactive analysis board** — click **or drag** pieces to play your own
  legal moves and explore variations from any position (Lichess-style), with
  legal-move hints, a promotion picker, an "Exploring" line (Undo /
  Back-to-game), and full keyboard navigation
- ⚡ **Live Stockfish feedback** — the engine evaluates the shown position (game
  line *or* your explored moves), draws the **best-move arrow**, and gives a
  one-line verdict on whether your idea works; toggle on/off
- 📈 **Move-by-move analysis** with Stockfish evaluation, move classification,
  an eval timeline, and turning-point jumps
- 🧠 **AI chess mentor** (Google Gemini via a hardened Supabase Edge Function)
- 📊 **Insights dashboard** — usage, accuracy gauge + percentile, strength
  breakdown, an activity **streak heatmap**, rating progression, and recent
  opponents; every number derives from the same sources the other screens use
- 🎯 **Dashboard** (momentum + weekly focus) and **Improve** (study plan +
  Review Mistakes) close the improvement loop
- 🗂️ **Game library + PGN import** (paste or upload, off-thread parse, dedupe)
- 🔐 **Auth** — email + password, Google / GitHub OAuth, password reset
- 🌗 **Dark / light Ivory themes**, responsive desktop + mobile (bottom tab bar)
- 🧪 **Tested** — unit tests (Vitest) and end-to-end tests (Playwright + axe-core)

---

## 🧱 Tech Stack

| Layer | Choice |
|---|---|
| UI | React 18 + TypeScript 5.5 |
| Build | Vite 5 (+ vite-plugin-pwa) |
| Styles | Tailwind CSS 3 + a token-driven dark-first design system |
| Backend | Supabase (PostgreSQL + Auth + Edge Functions) |
| Chess engine | Stockfish.js (Web Worker, UCI protocol) |
| Chess logic | chess.js |
| AI | Google Gemini API via Supabase Edge Function |
| Error tracking | Sentry (optional, behind `VITE_SENTRY_DSN`) |
| Unit tests | Vitest (jsdom) |
| E2E tests | Playwright + @axe-core/playwright |

---

## 📁 Project Structure (high level)

```text
src/
  components/
    analysis/        # AnalyzeGamesPage, BulkAnalysis, EnginePanel, DisplaySettings
    auth/            # AuthForm, PasswordResetRequest, PasswordResetComplete
    chess/           # ChessBoard, BoardArrows, EvaluationGauge
    game/            # GameList, GameViewer
    layout/          # ErrorBoundary, ThemeToggle, CompatibilityWarning, ProfileModal
    legal/           # PrivacyPage
    stats/           # StatsDashboard, ProgressBar
    ui/              # Button, Card, Input, Toast, Toggle, LoadingSpinner, MarkdownRenderer
  contexts/          # AuthContext, ToastContext
  hooks/             # useDebounce, useMediaQuery, usePerformance, useResponsive, useRevealAnimations, …
  lib/               # supabase, stockfish, gemini, pgn, pgnLimits, openings, oauth, userColor, sentry
  workers/           # pgnWorker (off-main-thread PGN batch parser)
  utils/             # validation, formatting, error handling, moveClassifier, cache, performance, compatibility
  App.tsx            # App shell — auth gate, password recovery gate, modal routing
  main.tsx           # React entry point
supabase/
  functions/         # Deno Edge Functions (chess-mentor)
  migrations/        # SQL migrations (apply via `npx supabase db push`)
e2e/                 # Playwright specs (auth, game-import, password-reset, board-and-progress, accessibility, empty-state)
```

There is **no** `src/i18n/` directory — the i18n scaffolding was removed
and the UI ships English-only.

---

## 🚀 Run Locally

### 1. Install
```bash
npm install
```

### 2. Configure environment variables

Copy the example:

```bash
cp .env.example .env.local
```

Fill in your Supabase values (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).
`VITE_SENTRY_DSN` is optional. The Gemini API key lives **only** in
Supabase Edge Function secrets, never in `.env*`.

### 3. (Optional) Apply database migrations

If you are wiring up a real Supabase project:

```bash
npx supabase db push
```

If you only want to work on the frontend, the app surfaces a
"configuration required" screen when Supabase env vars are missing;
unit and frontend Playwright tests still pass without a backend.

### 4. Start the dev server

```bash
npm run dev
```

The app runs on http://localhost:5173.

---

## 🧪 Testing

| Command | What it runs |
|---|---|
| `npm run typecheck` | `tsc --noEmit` against the app project |
| `npm run lint` | ESLint |
| `npm run test` | Vitest (unit + worker + migration regression tests) |
| `npm run test:watch` | Vitest in watch mode |
| `npm run test:e2e` | Playwright (chromium, firefox, webkit, mobile chromium/safari) |
| `npm run test:e2e:ui` | Playwright in UI mode |
| `npm run build` | Production build → `dist/` |
| `npm run preview` | Serve the production build locally |

### Authenticated Playwright specs

`e2e/game-import.spec.ts` and `e2e/board-and-progress.spec.ts` exercise
authenticated flows. They auto-skip unless both of these are set:

```bash
PLAYWRIGHT_TEST_USER=test@example.com
PLAYWRIGHT_TEST_PASSWORD=test-password
```

Put them in a `.env.test` (gitignored) or pass inline:

```bash
PLAYWRIGHT_TEST_USER=… PLAYWRIGHT_TEST_PASSWORD=… npx playwright test
```

The user must already exist in your Supabase project (sign them up
once via the UI, then re-use).

---

## 🔐 Password Reset Flow

1. From the sign-in tab, click **Forgot password?**
2. Enter the account email; Supabase emails a recovery link.
3. The link lands back at the app and triggers a `PASSWORD_RECOVERY`
   auth event. The app routes through `PasswordResetComplete`, which
   takes a new password and locks the rest of the UI until the reset
   completes.
4. On success the user is signed in with the new password.

---

## 🩺 Reliability Notes

- **Profile creation** is idempotent and retried with exponential backoff
  in `AuthContext.ensureProfileExists`. A transient Supabase outage will
  no longer strand a brand-new OAuth user with no `profiles` row (which
  used to cascade into FK errors on game import).
- **PGN size cap** is enforced at 5 MiB across both upload and paste
  paths via `checkPgnSize` (`src/lib/pgnLimits.ts`). The boundary is
  inclusive — exactly 5 MiB passes, one byte more rejects.
- **PGN parsing** runs in a dedicated Web Worker (`src/workers/pgnWorker.ts`)
  so the main thread stays responsive during bulk imports.

---

## 📚 Further Documentation

- `CONTEXT.md` — repository-level context for AI agents
- `CONTRIBUTING.md` — local setup, testing workflow, PR conventions
- `SECURITY.md` — how to report a security issue
- `DESIGN.md` — design tokens & UI patterns
- `PRODUCT.md` — product vision & roadmap

---

## ⚖️ License

ChessMate's source code is [MIT-licensed](LICENSE). The deployed application
also distributes third-party components under their own terms — notably the
**Stockfish engine (`public/stockfish.js`, GPL-3.0)**, which ships as a
separate, unmodified Web Worker file, and **GSAP** (proprietary no-charge
license). See [THIRD_PARTY_LICENSES.md](THIRD_PARTY_LICENSES.md) for the full
inventory and obligations before changing how either is packaged.
