# KNOWLEDGE_REVIEW.md — Phase 2 Validation (Coach-Reviews-Coach Audit)

**Date:** 2026-07-09 · **Reviewed:** all 63 documents in `src/coach/knowledge/`, read in full against the on-disk state · **Mode:** quality audit; no code changes except objective factual corrections (sanctioned below).

---

## 1. Factual errors found — and corrected

The audit's most important product. Every `Example` line was replayed move by
move; **six documents contained objective chess errors**, all fixed in this
pass with verified replacements:

| Doc | Error | Severity |
|---|---|---|
| `tactics/discovered_attacks` | Presented the Blackburne Shilling Gambit refutation **backwards**: recommended 4.Nxe5? and 5.Nxf7!, which actually *lose* for White (4...Qg5! and 5...Qxg2 with mate threats). A student following this would walk into a famous trap. | **Critical** |
| `tactics/pins` | Légal's mate given without 4.Nc3 — the mating move Nd5# was **illegal** (no knight can reach d5), and without the mate the queen "sacrifice" simply loses. | **Critical** |
| `endgames/king_and_pawn_endgames` | Ke6+Pe5 vs Ke8 claimed "White to move only draws" — false; a king on the 6th in front of its pawn **wins regardless of the move**. Replaced with the correct Ke5+Pe4 archetype (verified to stalemate/win). | **High** |
| `openings/french` | The Bb5+ queen-winning trap attributed to the 6.Be2 line; it belongs to 6.Bd3 (Milner-Barry), where the bishop blocks the d-file and then **clears it with check** — the entire mechanism. Also now teaches the correct 6...Bd7! insertion. | **High** |
| `tactics/forks` | The Petrov line labeled a "royal family fork" — it is a discovered check, in a document teaching forks. Replaced with a true fork pattern (Nc7+ vs Ke8/Ra8); the Petrov line moved to `discovered_attacks`, where it is correctly labeled. | Medium |
| `tactics/deflection_decoy` | A drafting artifact ("— wait, that's just a trade…") shipped inside the example, plus a muddled piece setup. Rewritten cleanly. | Medium |

One annotation was also corrected (`zwischenzug`: 4.dxc5 is "?!", not "??").
Post-fix: all 47 coach tests pass; 63/63 docs remain structure-complete.

**Lesson recorded for future authoring:** every SAN line must be replayed on a
board before shipping; the two critical errors were in exactly the docs whose
examples were written from memory of a named trap.

## 2. Coaching quality assessment

**Voice & pedagogy (strong):** consistent second-person coach register;
every doc pairs a principle with a recognition trigger, a failure mode, and a
routine ("blunder-check gate", "worst-piece algorithm", "CCT sweep"). The
mistake-first framing (Common mistakes before How to think) matches how
humans actually learn chess.

**Explanation quality (good, uneven):** the best docs teach a *mechanism*
(French: attack the chain's base; Nimzo: structure-vs-bishops currency;
Carlsbad: a 15-move plan). The weakest teach a *sentiment* (see §4) — true
advice without a board-level handle.

**Consistency (verified, no contradictions):** cross-checked the advice
network: trading rules (`trading_pieces` ↔ `defending_worse` ↔
`converting_advantages`) agree — trade pieces when ahead, pawns when behind,
attackers when defending; initiative/space/attack docs agree on
center-before-flank; endgame docs share the activity-over-material doctrine.
The four defaults in `trading_pieces` are restated in three docs with the
same polarity each time.

**Duplication (acceptable, flagged):** three deliberate overlaps carry real
redundancy: (a) the pre-move blunder scan appears in `hanging_pieces`,
`blunder_prevention`, and `calculation` (three phrasings of one ritual);
(b) `opening_principles` ↔ `development` share tempo-counting; (c)
`pawn_structure` ↔ `pawn_chains_breaks` share break-first planning. Since
retrieval serves ~1 doc per prompt, this redundancy is *useful* (whichever
doc arrives carries the core habit) — but if docs are ever concatenated, it
will read repetitively. No action needed now.

## 3. Top 20 strongest documents

Ranked by mechanism-teaching, example concreteness, and actionability:

1. `pawn_structures/carlsbad_minority_attack` — a complete 15-move plan with its endgame payoff
2. `openings/nimzo_indian` — the structure-vs-bishops bargain, both compasses
3. `pawn_structures/isolated_queens_pawn` — piece-count evaluation rule is genuinely masterclass
4. `openings/french` (post-fix) — chain-base logic + a precise, verified trap
5. `endgames/rook_endgames` — Lucena/Philidor with correct method narration
6. `endgames/opposition` — the e2-vs-e3 spare-tempo pair, verified to stalemate
7. `endgames/king_and_pawn_endgames` (post-fix) — archetype + the 6th-rank rule
8. `openings/kings_indian` — race arithmetic; tempo-counting made concrete
9. `motifs/blunder_prevention` — the three-question gate; the single highest-value habit in the corpus
10. `tactics/zwischenzug` — "instead of retaking" reframing; verified Trompowsky line
11. `strategy/trading_pieces` — the four defaults; jobs-not-points framing
12. `endgames/queen_endgames` — inverted hierarchy (passer > king safety > material) is expert-level and rare in club material
13. `endgames/minor_piece_endgames` — the four-family taxonomy in one page
14. `openings/sicilian` — counterplay-or-bust logic; honest about its danger
15. `pawn_structures/hanging_pawns` — same-structure-opposite-evaluation example
16. `openings/slav` — pure-vs-Semi distinction done crisply
17. `strategy/weak_squares` — color-complex thinking, eviction economics
18. `openings/ruy_lopez` — maneuvering pedagogy, Spanish tour
19. `practical/defending_worse_positions` — diagnosis-first defense; save-rate framing
20. `principles/calculation` — CCT ladder + the specific Bxf2+ zwischenzug failure case

## 4. Top 20 weakest documents

"Weak" = relatively; all are structure-complete and post-fix factually sound.
The dominant failure mode is a **generic or board-free Example** section.

1. `motifs/missed_tactics` — example is a hand-wave ("Rd8-d5… your Nf7+ family of forks"); needs one concrete position
2. `strategy/space_advantage` — no SAN anywhere; the Maroczy narrative never shows a move
3. `principles/center_control` — example describes the KID in one sentence; thinnest example of the principles set
4. `middlegame/planning` — the plan-sentence idea is excellent but the example names no actual moves beyond a knight route
5. `strategy/piece_activity` — rook-lift example is generic (no position, no opponent)
6. `strategy/initiative` — "a typical gambit line" with no line
7. `middlegame/converting_advantages` — schematic Rc2/h3 example; would benefit from a real position
8. `strategy/open_files` — the c-file grind is narrated, not shown
9. `middlegame/attacking_the_king` — phases are strong; example is a recipe without moves
10. `strategy/prophylaxis` — examples are name-drops (Karpov a4, Kh1) rather than positions
11. `openings/english` — plans described well but no punishing concrete line; weakest of the opening docs
12. `rating/improving_1200_1800` — inherently generic; the "typical 1500 loss" example partially rescues it
13. `rating/improving_above_1800` — advice is sound but least chess-specific in the corpus
14. `rating/improving_under_1200` — good prescription; example is a composite anecdote
15. `practical/chess_psychology` — necessarily board-free; the move-22 vignette helps
16. `practical/time_management` — same constraint; budget table would beat prose
17. `tactics/forks` (post-fix) — the schematic Nc7+ example is correct but no longer a full game line
18. `tactics/skewers` — the a7/Rh8 endgame narration compresses several positions into one paragraph
19. `motifs/missed_tactics`-adjacent `motifs/losing_material` — counting drill is excellent; example is a hypothetical without coordinates for the rook lift it references
20. `openings/catalan` — accurate but its example tabiya is quiet; a Catalan-squeeze victim line would teach more

## 5. Missing concepts (beyond KNOWLEDGE_BASE_REPORT §2)

New gaps this audit surfaced, priority-ordered:

1. **How to analyze your own games** — referenced by all three rating docs as the core method, yet no doc teaches it. Highest-value addition.
2. **Stalemate & swindling** — `defending_worse` gestures at swindles; no doc covers stalemate tricks, fortress recognition, or perpetual-check engineering as defensive weapons.
3. **Exchange sacrifice** — the legacy UI motif `exchange-sacrifice` exists in `CoachTab`'s vocabulary but no doc carries the tag or the concept (positional exchange sacs, Rxc3-style).
4. **Opposite-colored-bishop *middlegame* attacks** — the drawing tendency is covered; the attacking paradox (effectively a piece up on one color) is one clause in one doc.
5. **Rook activity vs material in practice** ("the 7th-rank pig") has a doc, but **rook lifts** as an attacking mechanism appear only in passing.
6. **Weak color complexes around the king** — mentioned inside `weak_squares`; deserves its own recognition patterns (fianchetto-bishop trades).
7. Named tactical gaps: clearance, interference/x-ray, windmill.
8. Structure gaps: Maroczy (referenced twice as an example but has no doc), Hedgehog, Stonewall.

## 6. Retrieval weaknesses (assessed, not changed)

1. **The "Defense-name gap" (worst asymmetry):** uncovered openings whose name contains "Opening" fall back to `opening_principles`; uncovered ones named "…Defense" (Philidor, Petrov, Alekhine's, Benoni…) retrieve **nothing at all**. The fallback tag only matches the literal word "opening". A future `theme: 'opening'` needle for opening-phase questions would fix this without corpus changes.
2. **Endgame shadowing:** `theme:'endgame'` deterministically returns rook + king-and-pawn every time; `opposition`, `queen_endgames`, `minor_piece_endgames`, `endgame_principles` are effectively unreachable despite being among the corpus's best docs (§3). Needs material-aware needles ("queen endgame" from FEN) — a Phase-3 query-derivation item.
3. **36 of 63 docs corpus-ahead-of-retrieval** (measured in KNOWLEDGE_BASE_REPORT): all tactics themes, strategy, middlegame, practical, and rating docs await richer needles. Notably the **rating docs are unreachable even though player rating is already in `CoachContext`** — the single cheapest future win.
4. **One-doc budget reality:** with ~2.1 K-char docs, prompts effectively carry one doc; the motif-before-classification fix made the right doc win, but pairings (opening + mistake doc together) rarely survive. Acceptable; worth revisiting if docs are ever slimmed.
5. **`exchange-sacrifice` motif has no matching doc** (see §5.3) — the only UI-emitted motif with zero retrieval result.

## 7. Scores and verdict

**Coaching quality score: 8 / 10.**
Voice, structure, consistency, and mechanism-teaching are genuinely strong;
the six factual errors (now fixed) and the ~15 board-free Example sections
are what separate this from a 9+. The corpus teaches like a good coach; the
best fifth of it teaches like a very good one.

**Readiness score: 8.5 / 10 — ready to ship.**
Post-correction, no known factual errors remain; structure is 63/63
complete; retrieval serves the right doc for every reachable query type; the
weaknesses that remain (generic examples, unreachable categories) degrade
toward *less help*, never toward *wrong help* — the correct failure
direction for a coach.

**Recommended follow-ups (in order):** (1) concrete examples for the §4 top-10;
(2) a "how to analyze your games" doc; (3) the `theme:'opening'` needle to
close the Defense-name gap; (4) rating-band needles (context already carries
the rating). None blocks shipping.
