# Branch Consolidation Plan

> Goal: promote PRs #28 (cutover) · #29 (remediation) · #30 (simplification) · #31 (refinement) — currently stranded in a stacked feature-branch chain — into `prod/mistake-review-b4`. Read-only audit complete; consolidation is **safe** (no conflicts, no duplication, no work lost).

## Audit findings

| Check | Result |
|---|---|
| Shared base (merge-base of prod & 8a1) | `7dd4919` "fix(games): … Phase 7" |
| prod content vs base | **identical** (`git diff prod 7dd4919` empty — prod's #27 merge added nothing beyond Phase 7) |
| `prod..feature/phase-8a1-refinement` | exactly **4 non-merge commits** (one per PR) |
| Fast-forward possible? | **No** — prod tip `ea88808` is a merge commit off-line from 8a1's history (diverged at the base) → a real (but trivial) merge is needed |
| Merge conflicts (`git merge-tree`) | **None** |
| Duplicate commits | **None** — all 4 commits are unique to 8a1 |
| Work lost | **None** — 8a1 linearly contains all 4 PRs' content (verified: `DEFAULT_ON`, `reducedMotion`, `PlanStripCard`, `dash-hero-row`) |

**The 4 commits (prod → 8a1):**
- `71c29d7` cutover (#28) · `46638c0` remediation (#29) · `1325977` Phase 8A (#30) · `543245b` Phase 8A.1 (#31)

## Branch graph
```
            7dd4919  (Phase 7 — shared base; PR #27 content)
           /        \
  ea88808 (prod      71c29d7  cutover            (#28)
  merge #27)  ▲         └ 46638c0  remediation    (#29)
  prod/mistake-          └ 1325977  Phase 8A       (#30)
  review-b4 TIP            └ 543245b  Phase 8A.1   (#31)  ◀ feature/phase-8a1-refinement TIP
                            (sibling branches phase-7-games / phase-11-cutover /
                             phase-8a-simplification also carry PR-merge wrappers
                             3c1733a / 97740f8 / 0f6d659 — redundant; their content
                             already lives in the 4 commits above)
```
`feature/phase-8a1-refinement` (543245b) is the single tip that **linearly contains all four PRs**. Consolidating it forward brings the whole chain in 4 clean commits.

## Merge sequence (single, not four)
Because 8a1 already contains #28→#31 in order, **one merge** suffices — no need to merge each feature branch separately:
1. `git checkout -b chore/consolidate-8a1 origin/prod/mistake-review-b4`
2. `git merge --no-ff origin/feature/phase-8a1-refinement` → applies `71c29d7 → 46638c0 → 1325977 → 543245b` (conflict-free).
3. Validate (below).
4. Push `chore/consolidate-8a1`; open PR → `prod/mistake-review-b4`. **Do not merge.**

## Conflict risks
- **None expected** (merge-tree clean; prod content == base). The only theoretical risk is the doc files added on these branches — all additive, no overlap with prod. Verify the merge reports "0 conflicts."

## Rollback strategy
- The consolidation happens on a **throwaway branch** (`chore/consolidate-8a1`); `prod/mistake-review-b4` is **untouched** until the PR is explicitly merged (and we will not merge).
- If anything looks wrong: `git checkout prod/mistake-review-b4 && git branch -D chore/consolidate-8a1` (and close the PR). Nothing lost.
- After the PR eventually merges, rollback = `git revert -m 1 <merge-commit>` or redeploy the previous build. The Ivory cutover is independently reversible via flags (`?ff=-ui.newShell`).

## Validation checklist (post-merge, pre-PR)
- [ ] Merge reports 0 conflicts; all 4 commits present.
- [ ] `npm run typecheck` ✅
- [ ] `npm run lint` ✅ (0 errors)
- [ ] `npm run test` ✅ (238)
- [ ] `npm run build` ✅
- [ ] a11y e2e ✅ (30/30)
- [ ] Manual (?shell): Dashboard (8A.1 hero+rail) · Games (table-led) · Analysis (insight-led, accuracy collapses) · Improve (focus hero) · Review Mistakes (feed+detail).
- [ ] Cutover present (`DEFAULT_ON` in flags.ts) on the consolidation branch.

## Out of scope
Promoting `prod/mistake-review-b4 → main` is a **separate** follow-up (this PR targets the integration branch only). The stacked feature branches + their PR-merge wrappers can be deleted after consolidation lands.
