# GSTACK_BRANCH_AUDIT.md

**Mode:** Ground Truth. **Date:** 2026-06-26.
**Method:** `git merge-base`, `git rev-list`, `git branch --merged/--no-merged`.

---

## 1. The critical finding: `main` is abandoned

```
git merge-base --is-ancestor main feature/stabilization-pr1-landing → TRUE
git rev-list --count feature/stabilization-pr1-landing..main         → 0
git rev-list --count main..feature/stabilization-pr1-landing         → 123
```

- `main` is a **pure ancestor** of the current branch — it has diverged in no way.
- `main`'s HEAD is `a6182d5` "Merge PR #5 … sprint-2-stabilization" — the
  **pre-Ivory legacy app**. Only two branches are merged into `main`:
  `feat/sprint-2-stabilization-and-experience` and
  `fix/user-color-consistency-and-cleanup`.
- **None** of the Ivory rebuild is on `main`: not the design system (Phase 1–2),
  the shell (Phase 3), Dashboard (4), Analysis (5), Improve (6), Games (7),
  simplification (8A), real-data (8B), cutover, or stabilization (S1).

**`feature/stabilization-pr1-landing` is the de-facto trunk.** It is 123 commits
ahead of `main` and contains the entire real product. `main` is stale by ~3 weeks
of work.

## 2. Stack / lineage (reconstructed from merge commits on the current branch)

The real integration history is linear on this branch (PRs merged into the line,
not into `main`):

```
main (PR #5, legacy)
  └─ … security/a11y/qa hardening (AUD-*) …
     └─ v2 design-system experiments (PR #6, #7)  [superseded]
        └─ Phase 1 tokens (85cdea9) → Phase 2 iv primitives (1a88f19)
           → Phase 3/3.5 shell (PR #21) → Phase 4 dashboard (PR #22)
           → Phase 5 analysis (PR #23) → Phase 6 improve (PR #24, #25)
           → Phase 7 games + review-mistakes (PR #26, #27)
           → cutover: defaults ON (71c29d7)
           → Phase 8A simplification + 8A.1 (PR #28–#32 consolidated)
           → Phase 8B real-data analysis (PR #33)
           → Phase S1 PR2 coming-soon + nav hide (PR #34)
           → Phase S1 PR1 landing re-theme (eb8caf2)  ← HEAD
```

## 3. Branch inventory

**Merged into `main` (2):** `feat/sprint-2-stabilization-and-experience`,
`fix/user-color-consistency-and-cleanup`.

**NOT merged into `main` (30 local), including the entire product line:**
`feature/stabilization-pr1-landing` (current, the trunk),
`feature/stabilization-pr2`, `feature/phase-8b-real-data`,
`feature/phase-8a-simplification`, `feature/phase-8a1-refinement`,
`chore/consolidate-8a1`, `feature/phase-7-games`,
`feature/phase-7-review-mistakes`, `feature/phase-6-improve`,
`feature/phase-6-1-hotfix`, `feature/phase-5-analysis`,
`feature/phase-4-dashboard`, `feature/phase-3-5-shell-compliance`,
`feature/phase-11-cutover`, `feature/ui-ux-remediation`,
plus 11 `prod/*` branches, 2 `v2/*`, `qa/production-readiness-audit`,
`sprint-1/production-safety-and-trust`.

Every one of these also has an `origin/*` counterpart (pushed).

## 4. Stale vs live

- **Live trunk:** `feature/stabilization-pr1-landing` (= `origin/...`, in sync).
- **Consumed-and-stale:** all `feature/phase-*`, `chore/consolidate-8a1`,
  `feature/stabilization-pr2` — their work is squashed/merged into the trunk
  line, so git reports them "not merged" by commit identity even though their
  content shipped. Safe to delete after confirming each merge commit.
- **Likely-dead experiments:** `v2/phase-1-design-system`,
  `v2/phase-2-analysis-workspace` (superseded by the Ivory Phase 1–5 line),
  the `prod/*` family (an alternate naming that predates the `feature/phase-*`
  line), `qa/production-readiness-audit`, `sprint-1/…`.
- **Unclear / verify before action:** `feature/phase-11-cutover` and
  `feature/ui-ux-remediation` — names imply work that may or may not be folded in
  (cutover landed as `71c29d7`; remediation landed as `46638c0`/`1325977`).
  Diff each against the trunk before deleting.

~30 branches for a single-developer project is excessive and obscures the real
line of development.

## 5. Is the current branch the right base for future work?

**Yes — but it is misnamed and `main` must be reconciled first.**

- `feature/stabilization-pr1-landing` contains everything and is the only sane
  base. New work branched off `main` would be missing the entire product.
- Its name describes a single PR ("stabilization PR1 landing"), not a trunk. It is
  doing double duty as both a PR branch and the integration line.

**Recommended (no action taken — audit only):**
1. Open a PR from `feature/stabilization-pr1-landing` → `main` (or fast-forward
   `main`, since it's a pure ancestor) to make `main` the real trunk again.
2. After that, branch all new work from the updated `main`.
3. Prune the ~25 consumed/dead branches (local + origin) once their content is
   confirmed in `main`.
4. Stop using a PR-named branch as the integration line.

## 6. gstack / stacking note

This repo is not using a gstack-style stacked-PR tool for branch management; it
uses plain GitHub PRs merged sequentially into a long-lived feature branch. The
"stack" is the linear phase history in §2. There is no multi-branch stack to
restack — the cleanup is reconciliation with `main` + pruning, not restacking.
