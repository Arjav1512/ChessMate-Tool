# KNOWLEDGE_BASE_PLAN.md — Phase 2 Curated Chess Knowledge Base

**Date:** 2026-07-09 · **Corpus:** `src/coach/knowledge/` · **Consumer:** the
existing `StructuredRetriever` (unchanged) · **Not** RAG/embeddings/vectors.

## 1. Goal

Turn the 25 Phase-1 placeholder documents into a production-quality,
beginner-to-advanced coaching library (~63 documents) that the deterministic
retriever serves into coach prompts today, and that any future retrieval
strategy can reuse unchanged.

## 2. Document template (every doc, coach voice)

Each document is written the way a strong human coach talks — direct, second
person, concrete — and carries all nine required elements in a fixed shape:

```markdown
# {Title}                        ← Concept (1–2 sentence definition)
**Why it matters:** …
**Recognize it:** …              ← recognition patterns
**Common mistakes:** …
**How to think:** …              ← the correct thinking process
**Example:** …                   ← concrete, with SAN
**Coach's tip:** …
**Train it:** …                  ← a practical exercise
**Related:** …                   ← linked concepts
```

**Length discipline:** ~1,300–1,800 characters per doc. The prompt budget is
4,000 chars (transport cap); the assembler deterministically sheds the
second doc, then trims context, when things don't fit. One rich doc that
always survives beats two thin ones — this is a deliberate tradeoff.

## 3. Taxonomy (12 requested categories → 10 directories)

| Directory | Category | Docs |
|---|---|---|
| `principles/` | Opening Principles + Calculation | opening_principles, development, center_control, king_safety, calculation (5) |
| `openings/` | Opening-specific coaching | 8 existing + english, scandinavian, slav, nimzo_indian, pirc_modern, catalan, kings_gambit (15) |
| `tactics/` | Tactical Motifs | pins, forks, skewers, discovered_attacks, removing_the_defender, deflection_decoy, zwischenzug, trapped_pieces (8) |
| `motifs/` | Blunder Patterns (maps to `lib/motifs` detector ids) | hanging_pieces, back_rank, mating_patterns, missed_tactics, losing_material, blunder_prevention (6) |
| `strategy/` | Strategic Concepts + Piece Activity | initiative, pawn_structure, piece_activity, weak_squares, open_files, bishop_pair, space_advantage, prophylaxis, trading_pieces (9) |
| `middlegame/` | Middlegame Planning | planning, attacking_the_king, defending, converting_advantages (4) |
| `pawn_structures/` | Pawn Structures | isolated_queens_pawn, carlsbad_minority_attack, hanging_pawns, pawn_chains_breaks (4) |
| `endgames/` | Endgames | rook_endgames, king_and_pawn_endgames, opposition, endgame_principles, minor_piece_endgames, queen_endgames (6) |
| `practical/` | Time Management + Psychology | time_management, chess_psychology, defending_worse_positions (3) |
| `rating/` | Rating-specific advice | improving_under_1200, improving_1200_1800, improving_above_1800 (3) |

Total: **63 documents** (25 rewritten, 38 new). `KnowledgeCategory` in
`knowledge/index.ts` (the corpus registry — not retrieval code) gains
`middlegame | pawn-structures | practical | rating`.

## 4. Tag strategy (what the retriever can actually reach)

`queryFromContext` produces four needle kinds; tags are designed against them,
verified against the real `lib/openings` names and whole-word matching:

1. **Opening names** — new opening docs are tagged with words that whole-word
   match the detector's names ('english' ⊂ "English Opening", 'slav' ⊂
   "Semi-Slav", 'nimzo-indian', 'pirc' + 'modern defense', 'catalan',
   "king's gambit", 'scandinavian'). Names literally containing "Opening"
   additionally pull `opening_principles` (documented fallback — retained).
2. **Theme `endgame`** — all `endgames/` docs keep the `endgame` tag; array
   order keeps `rook_endgames` and `king_and_pawn_endgames` as the first two.
3. **Classifications `mistake`/`blunder`** — these bare tags remain exclusive
   to `principles/calculation` (pinned by tests).
4. **Motif ids** — detector ids (`hung_piece`, `missed_material_gain`,
   `allowed_material_loss`, `missed_mate`, `allowed_mate`,
   `major_tactical_blunder`) spread across `motifs/` docs; existing docs keep
   array priority so pinned expectations hold.

**Corpus-ahead-of-retrieval (deliberate):** middlegame, pawn-structure,
practical, rating, and most strategy docs carry descriptive tags that today's
query derivation never produces. They ship now for content completeness and
become reachable when retrieval grows richer queries (or vector search) —
with zero rework. This is documented per-category in the coverage report.

## 5. Consistency & safety rules

- Titles of docs referenced by tests keep their exact text
  (`Hanging Pieces`); registry array order preserves existing section order
  (openings → strategy → tactics → endgames → motifs → principles), new
  sections appended after.
- No code changes outside `src/coach/knowledge/` except: the one retrieval
  test whose example ("English Opening" had no dedicated doc) is updated
  because the corpus now covers it — the *fallback* behavior is re-pinned
  with "Van't Kruijs Opening".
- Chess content rules: every example uses real SAN; no invented statistics;
  advice matches established coaching consensus; beginner docs avoid jargon,
  advanced docs may assume vocabulary.
- Bundle safety (measured): knowledge ships in a lazy shared chunk, not the
  entry bundle; +~100 KB raw (~30 KB gzip) is acceptable there.

## 6. Verification

Full unit suite + build after authoring; coverage/missing-topic/quality
review in `KNOWLEDGE_BASE_REPORT.md`.
