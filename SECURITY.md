# Security Policy

ChessMate is a web app with persistence (Supabase Postgres + Auth) and
an LLM-backed Edge Function (Gemini via `chess-mentor`). We take
vulnerabilities — especially anything that touches auth, RLS, or the
Edge Function — seriously.

## Reporting a Vulnerability

**Please do not open a public GitHub issue for security reports.**

Report privately through GitHub's coordinated-disclosure channel:

> **[Open a private security advisory](https://github.com/Arjav1512/ChessMate-Tool/security/advisories/new)**
> (GitHub → repository **Security** tab → **Report a vulnerability**)

This keeps the report confidential and visible only to the maintainers until
a fix is published. If you cannot use GitHub advisories, reach the maintainer
via the contact on their GitHub profile.

Include:

1. A description of the vulnerability and the impact you believe it has.
2. Steps to reproduce, ideally as a minimal proof of concept.
3. The affected commit / version (e.g. `package.json` `version` field,
   or git SHA).
4. Whether you have already disclosed this to anyone else, and any
   timelines you are working to.

You should expect:

- An acknowledgement within **3 business days**.
- A more substantive triage update within **7 business days**.
- Where appropriate, coordinated disclosure: we will work with you on
  a patch and a disclosure timeline before any public announcement.

We don't currently run a paid bug bounty, but credit in the release
notes is available on request.

## Scope

In-scope:

- `src/` application code (auth, RLS-sensitive queries, password reset
  flow, worker, PGN size cap, Stockfish wiring, Gemini wiring).
- `supabase/migrations/` (RLS policies, triggers, schema).
- `supabase/functions/` (Edge Function code that proxies the Gemini API
  and enforces rate limits).
- Build configuration that affects deployed artifacts
  (`vite.config.ts`, `tsconfig*.json`, `package.json` deps).

Out of scope:

- Vulnerabilities in third-party services we depend on (Supabase, the
  Gemini API, Sentry). Please report those to the upstream vendor.
- Social engineering, phishing, or physical attacks against contributors.
- Issues that require an attacker with full physical access to a victim's
  unlocked machine.
- Findings against the `ChessMentor-Ai-tool-main` prototype (the
  hackathon demo) — that codebase is unmaintained and not deployed.

## Known security-relevant invariants

These are the assumptions we rely on. Breaking any of them likely
constitutes a security bug:

1. **RLS is the security boundary.** Every user-owned table (`profiles`,
   `games`, `moves`, `questions`, `game_analysis_results`,
   `user_statistics`, `user_progress_snapshots`) has Row Level Security
   enabled. Policies use `auth.uid() = user_id`. The frontend uses the
   Supabase anon key only; no service-role key ships to the browser.
2. **No hardcoded secrets.** API keys live in `.env.local`
   (`VITE_SUPABASE_*`, optional `VITE_SENTRY_DSN`) or, for Gemini, in
   Supabase Edge Function secrets only. `.env*` files are gitignored.
   The Gemini key must never be exposed to the frontend.
3. **Password reset cannot bypass authentication.** During a
   `PASSWORD_RECOVERY` event Supabase implicitly signs the user in, but
   `App.tsx` renders `PasswordResetComplete` until the password is updated
   or the user explicitly cancels (which signs them out).
4. **OAuth callbacks are stripped after handling.** See `src/lib/oauth.ts`
   for why we don't validate `state` ourselves (Supabase's flow already
   does it).
5. **The `chess-mentor` Edge Function rate-limits Gemini requests**
   (currently 10 req/min). Bypassing this from the client should be
   considered a vulnerability.
6. **PGN ingestion has a hard 5 MiB cap.** Both the file-upload and
   paste paths must call `checkPgnSize` from `src/lib/pgnLimits.ts`.
   Removing or weakening either check is a regression.
7. **The PGN parser runs in a Web Worker** so a pathological input can't
   block the main thread; even so, the parser itself relies on chess.js
   and our own splitter for safety.

## Vulnerability classes we are especially interested in

- Anything that lets one authenticated user read or modify another
  user's rows (RLS bypass).
- XSS through PGN headers, AI mentor responses, or user-provided text
  rendered by `MarkdownRenderer`.
- Auth-flow flaws: OAuth callback handling, password reset, session
  fixation, replay attacks.
- Information disclosure via Edge Function error responses.
- Dependency-chain issues — supply-chain vulnerabilities in any of our
  runtime dependencies (`@supabase/supabase-js`, `@google/generative-ai`,
  `chess.js`, `stockfish.js`, `react*`).

Thank you for helping keep ChessMate safe.
