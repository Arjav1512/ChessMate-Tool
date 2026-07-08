# Third-Party Licenses

ChessMate's own source code is MIT-licensed (see [LICENSE](LICENSE)). This
file inventories the third-party components the **deployed application
distributes to browsers**, and the license obligations that come with them.
It exists because the 2026-07-08 production audit flagged an inconsistency:
`package.json` declared MIT while the app ships a GPL-3.0 engine.

## Stockfish (GPL-3.0) — special case

| | |
|---|---|
| Component | `stockfish.js` 10.x (Emscripten build of the Stockfish chess engine) |
| License | **GPL-3.0** — <https://www.gnu.org/licenses/gpl-3.0.html> |
| Upstream source | <https://github.com/nmrugg/stockfish.js> (engine: <https://github.com/official-stockfish/Stockfish>) |
| How we ship it | Copied **verbatim, unmodified** from the npm package into `public/stockfish.js` at build time (`vite.config.ts`, `copy-stockfish` plugin) and served as a standalone file. |
| How we use it | Loaded as an isolated Web Worker (`new Worker('/stockfish.js')`, `src/lib/stockfish.ts`) and driven exclusively over the text-based UCI protocol via `postMessage`. It is **never bundled, linked, or imported into the application's JavaScript**. |

Position: the engine runs as a separate program communicating at arm's length
over a documented text protocol — the application is not a derivative work of
Stockfish, so the MIT license of ChessMate's own code stands. Distribution of
the engine file itself is under GPL-3.0, whose obligations we meet by:

1. shipping the file unmodified (the "complete corresponding source" of the
   asm.js build is the upstream repository linked above);
2. preserving this license notice and the upstream source links;
3. never representing the engine as covered by ChessMate's MIT license.

If a future change bundles engine code into the app's own chunks, imports it
as a module, or modifies the file, that boundary collapses and the combined
work must be relicensed GPL-3.0 — treat any such change as a licensing event.

## GSAP (proprietary, no-charge)

`gsap` (used by the landing-page reveal animations,
`src/hooks/useRevealAnimations.ts`) ships under the **GSAP Standard
"no charge" license** — free for commercial use but **not** an OSI open-source
license: <https://gsap.com/standard-license>. It permits use and distribution
as part of a site/app; it does not permit reselling GSAP itself as a tool.

## Open-source runtime dependencies

All remaining runtime dependencies are permissively licensed; their notices
ship inside `node_modules/<pkg>/LICENSE` and are preserved by the build:

| Package | License |
|---|---|
| `@google/generative-ai` | Apache-2.0 |
| `@sentry/react` | MIT |
| `@supabase/supabase-js` | MIT |
| `@tanstack/react-query` | MIT |
| `chess.js` | BSD-2-Clause |
| `lucide-react` | ISC |
| `react`, `react-dom` | MIT |
| `react-router-dom` | MIT |
| `zustand` | MIT |

## Fonts

Onest and JetBrains Mono are served from Google Fonts under the
[SIL Open Font License 1.1](https://openfontlicense.org/).

## Maintenance

When adding a runtime dependency, check its `license` field (`node -e
"console.log(require('<pkg>/package.json').license)"`) and add it to this
inventory. Anything that is not MIT/BSD/ISC/Apache-2.0 needs the same
explicit treatment Stockfish and GSAP get above.
