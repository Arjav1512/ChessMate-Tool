# Contributing to ChessMate

Thanks for wanting to help! This document covers everything you need to
get a working dev environment, run the tests, and land a change.

If you find anything here that's out of date, fix it in the same PR
that surfaced the problem.

---

## 1. Quick start

```bash
git clone <repo>
cd ChessMate-Tool-main
npm install
cp .env.example .env.local
# Fill in VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY in .env.local
npm run dev
```

That's enough to launch the app on http://localhost:5173 and work on
frontend code. If you only edit frontend files you do not need a real
Supabase backend — the app shows a "configuration required" screen if
the env vars are missing, but builds and unit tests still pass.

You will need a real Supabase project to:

- Sign in and exercise authenticated UI manually.
- Run the auth-gated Playwright specs
  (`e2e/game-import.spec.ts`, `e2e/board-and-progress.spec.ts`).
- Apply or test new SQL migrations end-to-end.
- Exercise the AI mentor chat (requires the `chess-mentor` Edge Function
  and a `GEMINI_API_KEY` Supabase secret).

---

## 2. Project layout

See `README.md` for the top-level directory map, and `CONTEXT.md` for a
much more detailed walkthrough aimed at AI agents (it's also useful for
humans).

Hot spots:

- `src/contexts/AuthContext.tsx` — session + password reset + retrying
  `ensureProfileExists`. Read this before touching anything auth-shaped.
- `src/lib/pgn.ts` + `src/lib/pgnLimits.ts` + `src/workers/pgnWorker.ts`
  — the import pipeline. Tests live next to each file.
- `src/components/analysis/EnginePanel.tsx` — Stockfish-driven analysis
  panel. The worker glue is in `src/lib/stockfish.ts`.
- `supabase/migrations/` — schema + the statistics trigger. The trigger
  reads `games.user_color`; see `20260615030000_rewrite_stats_trigger_on_user_color.sql`
  for why we don't fall back to `display_name`-against-PGN matching.

---

## 3. Conventions

We optimise for "easy to read in six months" over "clever":

- **TypeScript strict** is on. Don't add `any`. Prefer `unknown` at the
  edges and narrow.
- **No dead code.** Unused imports / vars / state slices show up as
  TS6133 errors — fix them by deleting, not by underscore-prefixing.
- **Prefer editing existing files** to introducing new ones. If you do
  add a file, follow the existing folder structure (feature folders under
  `src/components/`, libs in `src/lib/`, workers in `src/workers/`).
- **No emojis in source.** They're fine in docs and PR descriptions.
- **Comments are for the *why*.** If a reviewer can read the code and
  guess what it does, the comment is noise. If they would be surprised,
  write the why down.
- **No partial features.** Don't merge a half-wired flag or a UI button
  that doesn't do anything yet.
- **No client-side secrets.** The Gemini API key must live only in
  Supabase Edge Function secrets — never in `.env*` files committed or
  shipped to the browser.
- **Respect RLS.** Anything that lets the browser bypass row-level
  security is a bug. See `SECURITY.md`.

### Commit messages

We use short, conventional-style prefixes when they fit, but it's not
strict:

```
fix(auth): retry ensureProfileExists with exponential backoff
feat(import): extract PGN size cap into pgnLimits and add boundary tests
docs(readme): document password reset flow and auth-gated e2e env vars
```

Keep PRs focused. If a refactor sneaks in alongside a bug fix, split it.

---

## 4. Testing

We run two test stacks:

| Stack | What it covers | Command |
|---|---|---|
| Vitest (jsdom) | Pure functions, worker pipeline, migration regression checks | `npm run test` |
| Playwright + axe-core | End-to-end browser flows, including accessibility audits | `npm run test:e2e` |

Targets:

| Command | Purpose |
|---|---|
| `npm run typecheck` | `tsc --noEmit` for the app project |
| `npm run lint` | ESLint |
| `npm run test` | All unit tests (run this in watch mode while developing: `npm run test:watch`) |
| `npm run test:ui` | Vitest's web UI |
| `npm run test:e2e` | Playwright across chromium/firefox/webkit/mobile chromium/mobile safari |
| `npm run test:e2e:ui` | Playwright UI mode |
| `npm run test:e2e:headed` | Playwright in a headed browser (useful for debugging selectors) |
| `npm run build` | Production build |

### Auth-gated Playwright specs

`e2e/game-import.spec.ts` and `e2e/board-and-progress.spec.ts` exercise
authenticated flows. They auto-skip unless **both** of these env vars
are present:

```bash
PLAYWRIGHT_TEST_USER=test@example.com
PLAYWRIGHT_TEST_PASSWORD=test-password
```

Put them in a `.env.test` file (gitignored), source it, then run
Playwright — or pass them inline:

```bash
PLAYWRIGHT_TEST_USER=… PLAYWRIGHT_TEST_PASSWORD=… npx playwright test
```

The user must already exist in your Supabase project (sign them up once
via the UI), and the password must satisfy `isValidPassword`
(8+ chars, at least one letter, at least one digit).

### Writing new tests

- Frontend logic without DOM dependencies → Vitest, alongside the source.
- Worker logic → extract the pure part (see `runPgnBatch` in
  `pgnWorker.ts`) and test that; keep the `self.onmessage` wiring thin.
- UI flows → Playwright specs in `e2e/`.
- Anything that reads or writes the database in CI → don't, until we
  wire up a sandbox Supabase instance. Today, integration coverage is
  manual + the static regression checks in `src/lib/migrations.test.ts`.

---

## 5. Pull request expectations

Before you open a PR, locally:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

(`npm run test:e2e` is encouraged but not required for every PR — it
needs a Supabase test user.)

In the PR description, include:

- **What changed and why.** Link the bug/issue if one exists.
- **How you tested it.** Which suites ran? Did you click through the
  affected flow manually? If a Playwright spec was added, name it.
- **Anything that wasn't done.** Known follow-ups, documented limits,
  intentional non-goals.
- **Screenshots / clips** for UI changes.

We use squash-merge by default. Keep the PR title short (under 70
characters) — long-form lives in the description.

Reviewers will look for:

- Type safety (no `any`, no broken contracts at module boundaries).
- New tests for new behaviour, or a justification for the gap.
- No new ESLint warnings.
- No regressions in `CONTEXT.md` / `README.md` accuracy if the change
  shifts the architecture.

---

## 6. Filing bugs

Open a GitHub issue with:

- Steps to reproduce (curl-able state changes preferred).
- Expected vs actual behaviour.
- Browser / OS / commit SHA.
- Console + network traces if they're relevant.

For **security** issues, see `SECURITY.md` — please do not open a public
issue.

---

Thanks again — your help keeps this project honest.
