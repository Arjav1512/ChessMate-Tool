# ChessMate — Product Vision

_Last updated: 2026-06-20 · Owner: Autonomous Engineering System (PM hat)_

## Mission
Help serious, improvement-minded chess players turn their own games into
measurable skill gains — by pairing engine-grade analysis with an AI coach that
explains _why_, not just _what_.

## Direction (2026-06-21)
Shifting from *chess analyzer* to **Personal Chess Improvement System**. Phase 1 (shipped, PR #16):
a read-only **Weakness Profile** built from existing data — the foundation for later drills/training.

## Positioning
A dedicated, dark-first **analysis-and-coaching workspace** for games you already
played on chess.com / Lichess. Not a place to play; a place to understand.

- **Engine truth** (Stockfish, on-device) +
- **Human-style explanation** (Gemini-backed coach) +
- **Longitudinal progress** (stats, accuracy, mistakes, color split).

The chess board is the hero; everything else serves it. The product should feel
like a serious instrument, not a gamified EdTech toy. (See `PRODUCT.md` for brand
tone and anti-references — these are binding constraints, not suggestions.)

## Target Users
- Intermediate→advanced players (ELO ~800–2000) who want depth, not platitudes.
- Players frustrated by surface-level post-game review.
- Technically comfortable, 16–45, already analyzing elsewhere and wanting a focused tool.

## Core Value Loop
1. **Import** PGN (upload or paste, ≤5 MiB, parsed off-main-thread).
2. **Analyze** move-by-move — Stockfish eval, best-move arrows, blunder/mistake flags.
3. **Ask** the AI coach about any position in plain English.
4. **Track** accuracy, W/L/D, mistakes, and per-color performance over time.

## Differentiators
1. **Coach, not chatbot** — contextual, position-aware, structured guidance.
2. **On-device engine** — privacy + no per-analysis server cost.
3. **Honest data** — stats never guess (NULL `user_color` is excluded, not faked).
4. **Craft** — premium dark-first UI that respects long focus sessions.

## Success Metrics (proposed — to ratify)
| Dimension | Target signal |
|---|---|
| Activation | % of new users who import ≥1 game and view analysis in session 1 |
| Aha-moment | % who ask the coach ≥1 question in week 1 |
| Retention | % returning to analyze a 2nd batch within 14 days |
| Improvement | Trend in per-user average accuracy across snapshots |
| Trust | Zero RLS/auth incidents; AI coach error rate < 2% |

## Non-Goals (current)
- Playing chess / matchmaking / clocks.
- Real-time multiplayer or social feed.
- Internationalization (English-only; i18n scaffolding was deliberately removed).
- Native mobile apps (responsive web only).

## Strategic Open Questions (see DECISION_LOG → Escalations)
- **E-1 Priority direction:** harden current app to production vs. finish the
  in-flight v2 redesign (phase 2) first.
- **E-2 Learning-system depth:** is v1 "stats + coach," or does it grow into
  drills / spaced-repetition / training plans? This defines the product's ceiling.
