# Design System Consolidation Audit

_2026-06-20 · Autonomous Engineering System. Scope: consolidation only — no visual
redesign, no brand refresh, no IA changes, no new features._

## 1. Findings

| Signal | Measure |
|---|---|
| Inline `style={{…}}` literals | **~639** across `src/**/*.tsx` |
| Ad-hoc `<button>` elements | **~70** (GameViewer 15, App 8, GameList 8, AuthForm 7, LandingPage 7, EnginePanel 5, …) |
| `Button` primitive adoption | was **3** files → now **5** |
| Ad-hoc `<input>` vs `Input` primitive | ~6 ad-hoc (GameList search, ProfileModal, EnginePanel) vs Input used only in auth |
| Primitives available | Button, Card, Input, Badge, Chip, Drawer, SegmentedControl, Toggle, Modal, Toast, LoadingSpinner, MarkdownRenderer |

**Root cause — two parallel systems.** A complete design system already exists *twice*:
(a) `ui/` React primitives, and (b) CSS classes in `style.css` (`.btn`, `.btn--{variant}`,
`.card`, `.form-control`). Most components ignore both and hand-roll inline styles that
**duplicate** these tokens — including re-implementing hover via per-button `onMouseEnter/Leave`.

**Key gap (now fixed):** the `Button` primitive had **no hover/active states** (inline styles can't
use `:hover`), so adopting it used to *lose* interaction feedback — a blocker to consolidation.

## 2. Prioritized refactor plan (risk-ranked)

Consolidation normalizes minor visual deltas (padding/gap), which the directive permits. The
**rest-state** of each primitive matches the tokens; the only judgement calls are on **high-traffic
visual surfaces**, which are sequenced last for human/visual QA.

| Phase | Work | Risk | Verifiability |
|---|---|---|---|
| **P0 (this PR)** | Enhance `Button` with hover (all variants); adopt in low-traffic clean surfaces (WelcomeScreen, ErrorBoundary) | Low | build/e2e/axe ✅ |
| **P1** | Adopt `Input` for ad-hoc text inputs (GameList search, ProfileModal, EnginePanel) — also gains the a11y wiring (`aria-invalid`/`describedby`/`role=alert`) | Low–med | e2e/axe |
| **P2** | Adopt `Button` in modals/dialogs (ProfileModal, AnalyzeGamesPage, BulkAnalysis, CompatibilityWarning) | Med | e2e + visual spot-check |
| **P3** | Extract repeated container/card inline styles → `Card` primitive (StatsDashboard, ProgressBar, LandingPage feature cards) | Med | visual QA |
| **P4 (visual QA)** | High-traffic surfaces: **App header nav**, **LandingPage hero/nav/pricing**, **GameViewer** (15 ad-hoc buttons) | Higher | **needs screenshots / human eye** |
| **P5** | Token sweep: replace remaining hard-coded spacing/radius/shadow literals with `--space-*`/`--radius-*`/`--shadow-*`/`--elevation-*` vars | Low | build |

**Escalation note:** P4 surfaces are where "no major visual redesign" is hardest to self-verify
without rendering — they are flagged for a visually-QA'd pass (per the confidence-<80% gate), not
done blind.

## 3. Delivered in this PR (P0)

- **`Button` primitive** now has hover for every variant (`primary/secondary/outline/ghost/danger`),
  applied via internal state so rest-state rendering is **byte-for-byte unchanged** for existing
  consumers (auth forms) — verified axe-clean + e2e green. Centralizes the JS-hover pattern that
  ~70 ad-hoc buttons each copy.
- Adopted `Button` in **WelcomeScreen** (App.tsx) and **ErrorBoundary**, removing ~60 lines of
  duplicated inline styles + bespoke hover. Inline-style literals 639 → 636; Button adoption 3 → 5.

## 4. Preserved
Accessibility (axe 0 on landing + auth), performance (89 KB gzip main unchanged), and all workflows
(onClick/aria-label preserved; e2e 29/0). No brand/IA/feature changes.
