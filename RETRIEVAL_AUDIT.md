# RETRIEVAL_AUDIT.md — Phase 3 Retrieval Ground-Truth Audit

**Date:** 2026-07-09 · **Mode:** Ground Truth — every claim below is measured
by executing the real `retrieveKnowledge`/`queryFromContext` against the real
corpus and the real 186-name opening detector, plus source reads of both call
sites. No code was modified.

---

## 0. The headline finding: production retrieval returns ZERO documents

Simulating the exact context the live app sends (verified against
`CoachTab.tsx` and `GameViewer.tsx` through the `askChessMentor` adapter):

```
prodQuery  = { motifs: [] }        // opening: –, theme: –, mistake: –
prodDocIds = []                    // no knowledge reaches any prompt
```

**Why:** retrieval needs `game.pgn`/`game.opening`, `move.phase`,
`move.classification`, `move.motifs` — and neither call site sends any of
them, even though **both already have the data on hand**:

| Call site | Has (unused) | Sends |
|---|---|---|
| `CoachTab` | `GameVM.pgn/eco/opening/whiteRating/blackRating/userColor`, `AnalysisMoveVM.phase/motifs/quality/cpLoss/san/moveNumber/bestSan` | players, result, FEN, eval only |
| `GameViewer` (legacy) | `game.pgn`, per-ply `classifications` map, `detectOpening` already imported, weakness profile | players, FEN, move history, eval, weakness summary |

The legacy-shaped `MentorContext` adapter cannot even carry these fields.
Every finding below describes what retrieval *would* do once context flows —
but this gap dominates everything: **the 63-doc corpus, the tag system, and
the priority ordering are all dormant in production today.**

## 1. Which documents are currently unreachable?

Measured across every possible needle (186 opening names, `endgame` theme,
2 classifications, 6 production motif ids, 4 sample-data motif ids):

- **36/63 docs match no needle at all**: all 8 `tactics/`, 8 of 9
  `strategy/`, all 4 `middlegame/`, all 4 `pawn_structures/`, all 3
  `practical/`, all 3 `rating/`, `principles/development`,
  `principles/center_control`, and 4 of 6 `endgames/` (see shadowing, §2).
- **2 more are sample-data-only**: `strategy/pawn_structure` and
  `principles/king_safety` are reachable exclusively via motif ids
  (`premature-pawn-push`, `loosened-kingside`) that only the DEV sample data
  emits — `lib/motifs.detectMotifs` never produces them. **Production-
  unreachable.**
- Net: **25/63 docs are production-reachable via needles** — and 0/63 are
  reached in practice (§0).

## 2. Which documents are rarely retrieved (shadowed)?

Deterministic order + limit 2 means "matches" ≠ "retrieved":

- `theme:'endgame'` always returns `[rook_endgames, king_and_pawn_endgames]`
  — `opposition`, `endgame_principles`, `minor_piece_endgames`,
  `queen_endgames` match the tag but can **never** appear (4 of the corpus's
  strongest docs, per KNOWLEDGE_REVIEW §3).
- `motif:'allowed_mate'` always returns `[back_rank, mating_patterns]` —
  `king_safety` holds the tag but is permanently third.
- `motif:'allowed_material_loss'` returns `[hanging_pieces,
  losing_material]` — healthy pairing, no shadow.

## 3. Which retrieval paths are too generic?

- **`opening_principles` fallback** fires for any name containing the word
  "Opening" (7 needle families hit it) — deliberate and documented, but it
  is the *only* generic fallback in the system, and it's keyed to a naming
  accident (see §4).
- **`mistake/blunder` → `calculation`**: every error without a detected
  motif retrieves the same generic calculation doc, regardless of whether
  the mistake was positional, endgame, or opening-phase.

## 4. Which retrieval paths are too narrow?

- **The Defense-name gap (measured): 48 of 186 detector opening names
  retrieve nothing at all** — Petrov, Philidor, Dutch, Benoni, Vienna,
  Grünfeld, Alekhine's, Scotch, Evans Gambit, Queen's Indian, Colle, … .
  Uncovered "…Opening"-named lines get the principles fallback; uncovered
  "…Defense/Gambit/Game"-named lines get zero. Same user need, opposite
  outcomes, keyed to a word in the name.
- **Endgame theme is one hard-coded needle** (`'endgame'` when
  `phase === 'endgame'`) with no material awareness — a queen endgame and a
  pawn endgame retrieve identical docs (§2).
- **Motif ids are the only route into `motifs/` docs** — a user *asking*
  about back-rank mates with no detected motif in context gets nothing.

## 5. Which user contexts are already available but unused?

Ranked by value density:

1. **`AnalysisMoveVM.motifs/phase/quality/cpLoss`** (CoachTab prop) — the
   entire motif/classification/phase needle system, currently dropped.
2. **`GameVM.opening/eco/pgn`** (CoachTab prop) — the opening needle system,
   dropped; GameViewer equally has `game.pgn` + a live `classifications` map.
3. **Player rating** — `GameVM.whiteRating/blackRating` + `userColor`
   derivable at the call site; `CoachContext.player.rating` exists and is
   never populated. The 3 rating docs carry ready tags. Zero retrieval path
   uses rating today.
4. **The question text itself** — the richest signal for the 36 unreachable
   theme docs ("how do I use the bishop pair?") is never consulted;
   retrieval reads only structured context.
5. **`weaknessSummary`** (GameViewer already sends it!) — reaches the prompt
   but is invisible to retrieval; its titles map cleanly onto motif/theme
   tags ("frequently hangs pieces" → `hung_piece`).
6. **FEN** — in context, used for display only; a 10-line piece count would
   yield material-aware endgame needles.
7. **`improveQueue`** — typed in `CoachContext`, never passed by any caller.

## 6. Special-attention areas — verdicts

| Area | Verdict |
|---|---|
| Rating-aware retrieval | Fully absent; cheapest personalization win — data derivable at call sites, tags already shipped (`under 1200`, `intermediate`, `advanced`…). |
| Defense-name coverage | Broken asymmetry; 48 recognized openings retrieve nothing (§4). |
| Middlegame concepts | 4/4 docs unreachable; only plausible deterministic route is question-keyword matching (§5.4). |
| Strategic themes | 8/9 unreachable; same route. |
| Practical play | 3/3 unreachable; question keywords + rating band are the natural triggers. |
| Endgame theme matching | Works but is blind to material; 4 of 6 endgame docs permanently shadowed (§2). |

## 7. Which improvements provide the highest user value?

In order (full ranking with impact/complexity/risk in
`RETRIEVAL_IMPROVEMENT_PLAN.md`):

1. **Thread the already-available context through the two call sites** —
   activates the entire dormant system; nothing else matters until this
   lands.
2. **Generic opening-phase fallback** — closes the 48-opening Defense-name
   gap with one needle.
3. **Rating-band needle** — personalizes every answer for the cost of one
   derived field.
4. **Material-aware endgame needles** — un-shadows four of the best docs.
5. **Question-keyword theme matching** — the only deterministic route into
   the 36 theme docs, and the one that matches what users actually type.
6. **Weakness-summary needles** — closes the loop with the profile system.
