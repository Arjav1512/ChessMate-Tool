# PHASE_3B_IMPLEMENTATION_REPORT.md — R4 Material-Aware Endgame Retrieval

**Date:** 2026-07-09 · **Scope:** R4 only. R5/R6/R10, memory, embeddings,
vectors, providers, and knowledge documents untouched. `KnowledgeRetriever`
interface, provider layer, transport, and orchestrator unmodified.

---

## 1. What was built

**Endgame family detection** (`endgameFamilyOf`, `src/coach/retrieval/retriever.ts`):
a pure, deterministic FEN piece-count — the same cheap placement scan
`derivePhase` already uses, no chess engine — classifying combined material
into the eight required families:

`king-pawn · rook · rook-pawn · queen · queen-pawn · minor-piece ·
opposite-colored-bishops · same-colored-bishops` (+ `mixed` fallback).
Bishop square colors are computed from the placement string, so OCB vs SCB is
detected exactly. Families sharing doctrine share a doc (±pawns doesn't change
whose doctrine applies; both bishop families live in the minor-piece doc).

**Query derivation:** when `phase === 'endgame'`, the `theme` needle is now
the family needle (`endgameThemeOf(fen)`); no FEN or mixed material falls
back to the generic `'endgame'` — exactly the pre-R4 behavior.

**Matcher upgrade (required by R4, benefits everything):** matching is now
specificity-aware — within one needle, the doc whose matched tag is *longest*
wins, and a needle admits only its most-specific tier; equal-specificity ties
keep deterministic array order. Without this, the generic `endgame` tag on
every endgame doc whole-word matched inside `'queen endgame'` and array order
handed the rook doc back. All previous behaviors are ties under this rule and
are preserved (pinned by the untouched pre-existing tests).

## 2. Before / after (measured, real pipeline, prompt-level)

The Phase-3A validation's worst scenario (score 4/5/3) — FEN
`8/5Q2/8/4k3/7q/8/5K2/8`, queens only, endgame mistake:

```
BEFORE  theme: 'endgame'        → [rook_endgames, king_and_pawn_endgames]
        prompt taught: "rooks belong BEHIND passed pawns… short side/long side"
AFTER   theme: 'queen endgame'  → [queen_endgames, calculation]
        prompt teaches: perpetual-check discipline, passer-outranks-material,
        king-walk technique — the correct doctrine
```

Full family trace (every case verified in-prompt after budget assembly):

| Ending | Theme needle | Doc in prompt |
|---|---|---|
| Queens only / queen+pawns | `queen endgame` | **queen_endgames** |
| Rook / rook+pawns | `rook endgame` | rook_endgames |
| King+pawns | `pawn endgame` | **king_and_pawn_endgames** |
| Opposite-colored bishops | `bishop endgame` | **minor_piece_endgames** |
| Same-colored bishops | `bishop endgame` | **minor_piece_endgames** |
| Bishop vs knight | `minor piece endgame` | **minor_piece_endgames** |
| Mixed (Q+R) / no FEN | `endgame` | rook_endgames (pre-R4 behavior) |

**Endgame coverage improvement:** before R4, 1 of 6 endgame docs could reach
a prompt (rook, always — kp only as the shed second doc). After R4, **4 of 6
endgame docs are live** (queen, minor-piece, kp, rook), each serving exactly
its own material. Docs reachable via production needles: 28 → **30**
(`queen_endgames`, `minor_piece_endgames` join). The second retrieved slot
now carries `calculation` (via the mistake classification) instead of a
second endgame doc — a better pairing.

## 3. Test evidence (4 new tests; required cases all covered)

- `retriever.test.ts › R4: classifies endgame material into deterministic
  families` — all 9 family cases incl. OCB/SCB square-color detection and
  the no-FEN generic fallback.
- `retriever.test.ts › R4: queen / rook / pawn endings retrieve their own
  doctrine` — required cases 1–3 plus both bishop families and the mixed
  fallback.
- `retriever.test.ts › R4: opening and rating retrieval remain unchanged` —
  required cases 4–5: an endgame FEN does not leak into opening-phase
  queries ([sicilian, opening_principles] unchanged), and the rating band
  still fills only the spare slot ([queen_endgames, improving_1200_1800]).
- `coachService.test.ts › a queen-endgame mistake receives queen-endgame
  doctrine, not rook advice (R4)` — the validation scenario end-to-end;
  asserts `# Queen Endgames` in the prompt and `# Rook Endgames` absent.
- All pre-existing retrieval tests pass unmodified — the tie-preserving
  matcher upgrade changed no pinned behavior.

**Validation runs:** `npm test` **367/367** · `tsc --noEmit` clean ·
`npm run lint` 0 errors (4 pre-existing warnings) · `npm run build` passes,
entry chunk byte-stable (434.52 kB).

## 4. Files changed

| File | Change |
|---|---|
| `src/coach/retrieval/retriever.ts` | `EndgameFamily` type + `endgameFamilyOf` (FEN piece count, bishop square colors) + `endgameThemeOf`; family needle wired into `queryFromContext`; matcher upgraded to specificity-tiered matching. |
| `src/coach/retrieval/retriever.test.ts` | 3 new R4 test blocks (families, retrieval, unchanged-behavior proofs). |
| `src/coach/api/coachService.test.ts` | 1 new end-to-end R4 test (validation scenario 7). |
| `PHASE_3B_IMPLEMENTATION_REPORT.md` | this report. |

## 5. Remaining retrieval gaps (unchanged, for the record)

- **R5** — question-keyword matching: the 28 tactics/strategy/middlegame/
  practical theme docs remain unreachable; "what's the plan against the
  Petrov"-style intent is still unread.
- **R6** — weakness-summary needles: the summary renders in prompts but
  retrieval ignores it.
- **R10 (backlog)** — motif-less positional mistakes still route to generic
  calculation advice (Phase-3A scenario 6).
- `opposition` and `endgame_principles` remain shadowed within the endgame
  family system (the kp/family docs win their needles); they'd surface via
  a second-slot family pairing or question keywords (R5).
- Mixed-material endings still get rook-first generic docs; arguably
  `endgame_principles` would be the better generic — deferred, noted for the
  next corpus/ordering review.
- `pawn_structure`/`king_safety` sample-motif-only reachability (pre-R4
  finding) is unchanged.
