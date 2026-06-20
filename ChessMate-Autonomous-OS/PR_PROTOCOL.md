# PR Protocol

How a change becomes a reviewable, evidence-backed pull request.

## Branching
- Never commit feature work to `main`.
- Branch name: `sprint-N/<slug>` for sprint work, `fix/<slug>` / `feat/<slug>` otherwise.
- One branch per sprint or cohesive change set. Keep unrelated refactors out.

## Before opening
Run the full gate suite and capture output:
```bash
npm run typecheck
npm run lint
npm test            # or test:coverage
npm run build
npm run test:e2e    # at least chromium; auth-gated specs may skip
```
All must pass (e2e auth-gated specs may auto-skip without a seeded user — note it).

## Commits
- Focused and conventional: `fix(security): verify chess-mentor JWT before trusting caller`.
- Don't mix a refactor into a fix — split them.
- Co-author trailer on commits:
  `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`

## PR description (required sections)
1. **What changed and why** — link the backlog IDs (e.g. AUD-01..05).
2. **How it was tested** — paste gate results; name any new tests; note manual click-through.
3. **Security/Data/Cost notes** — call out anything touching auth, RLS, schema, or spend.
4. **Not done / follow-ups** — known limits, intentional non-goals, deferred items.
5. **Screenshots/clips** for UI changes.
End the PR body with:
`🤖 Generated with [Claude Code](https://claude.com/claude-code)`

## Conventions
- Squash-merge by default. PR title < 70 chars; detail lives in the body.
- Keep PRs focused enough to review in one sitting.
- Update `CONTEXT.md` / `README.md` if the change shifts architecture or invariants.
