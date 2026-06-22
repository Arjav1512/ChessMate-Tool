# ChessMate — Loop Log

> Chronological record of the build loop (one entry per phase / working session). What was done, gates run, outcome. Newest last.

---

## 2026-06-22 · Phase 0 — Discovery
- Read both spec docs in full; audited the codebase.
- Produced gap analysis + `IMPLEMENTATION_ROADMAP.md` (11 phases). No code.
- Decisions approved: strangler behind flags · client-side analysis v1 · typed sample data · stay on Vercel.

## 2026-06-22 · Phase 1 — Design Token Foundation
- Added `src/styles/tokens.css` (Ivory §5: dark/light + Accent/Board/Density), `globals.css`, Tailwind token bindings, Onest font, `?styleguide` verification page.
- Strangler: legacy `--cm-*` untouched.
- Gates: typecheck ✅ · lint ✅ · build ✅ · tests ✅ (145, +11 token tests).

## 2026-06-22 · Phase 2 — Core UI System
- Built 18 Ivory primitives in `src/components/ui/iv/` + `iv.css` + `?components` gallery.
- Installed Testing Library; enabled jsdom cleanup + jest-dom.
- Gates: typecheck ✅ · lint ✅ (0 err) · build ✅ · tests ✅ (161, +16 component tests).
- Visual checkpoint: dark/ivory + light/periwinkle screenshots.

## 2026-06-22 · Phase 3 — App Shell
- React Router SPA + Sidebar + BottomTabBar + CommandMenu; TanStack Query + Zustand; `ui.newShell` flag; placeholder routes (no screens, no migration).
- Gates: typecheck ✅ · lint ✅ · build ✅ · tests ✅ (170, +9 flag/nav).
- Visual checkpoint: desktop shell, ⌘K, mobile.

## 2026-06-22 · Phase 3 — Design Compliance Audit
- Produced `DESIGN_COMPLIANCE_AUDIT.md` (10 items). Verdict: tokens/color/theme ✅; 7 areas partial. No code.

## 2026-06-22 · Phase 3.5 — Shell Compliance Remediation
- Branch `feature/phase-3-5-shell-compliance` off `prod/mistake-review-b4`.
- Fixed the high-priority audit findings:
  1. Command menu focus trap + Tab loop + Esc + focus restoration.
  2. Accessibility automation — jsdom component axe (`src/test/axe.ts`), Playwright a11y e2e w/ real-browser contrast (`e2e/shell-a11y.spec.ts`), explicit `accessibility` CI job, skip link, `Avatar role="img"`.
  3. Sidebar IA — primary nav only; `UserMenu` (Profile/Settings/Sign out); Weakness/Progress as Improve sub-views; Import off Games.
  4. Typography primitives (`.iv-display…/.iv-data`); removed inline `font:` in shell.
  5. Four-tier responsive breakpoints (§10) incl. tablet icon-rail.
- Docs: updated audit (Phase 3.5 report + scorecard) + roadmap; created `PROJECT_STATE.md`, `DECISION_LOG.md`, this log.
- Gates (local): typecheck ✅ · lint ✅ (0 err) · unit/component 177 ✅ · a11y e2e 4/4 ✅ · build ✅.
- Strangler intact: legacy app untouched, `ui.newShell` OFF by default.
- Outcome: PR opened (base `prod/mistake-review-b4`); awaiting CI + CodeRabbit + approval. **Not merged.**
