# DESIGN_SYSTEM_AUDIT.md

**Mode:** Ground Truth. **Date:** 2026-06-26. **Branch:** `feature/stabilization-pr1-landing`.

**Headline:** the application does **not** follow one design system. It runs two
token systems and two component libraries in parallel, by deliberate strangler
design — but the migration is incomplete and the most visible surface (the
landing page) sits in neither system cleanly.

---

## 1. Two token systems

| System | File | Naming | Scope | Defs |
|---|---|---|---|---|
| **Legacy "Obsidian"** | `src/style.css` | `--cm-*` (`--cm-bg-base`, `--cm-accent`, `--cm-border-subtle`…) | legacy app + landing page | **~350** |
| **Ivory (spec)** | `src/styles/tokens.css` | spec names (`--bg`, `--surface-1`, `--accent`, `--text-hi`, `--mq-*`, `--r-*`, `--space-*`) | Ivory shell + `ui/iv` | ~50 core + scales |

`tokens.css` is explicitly **additive and disjoint** from `--cm-*` (header
comment: "does NOT touch the legacy `--cm-*` Obsidian tokens … byte-for-byte
unchanged … at cutover the legacy tokens are removed"). Load order in `main.tsx`:
`tokens.css → globals.css → style.css → index.css`.

Ivory supports theme attributes on `<html>` (`data-theme`, `data-accent`,
`data-board`, `data-density`) via `themeStore.applyThemeAttributes`. The legacy
system has its own dark/light handling.

**Both systems are live in the same running app** because the legacy app is one
rollback flag away, and the landing page (always shown pre-auth) uses `--cm-*`.

## 2. The landing page is mislabeled

`eb8caf2` is titled "PR1 — re-theme marketing landing to the Ivory design
system." In reality `LandingPage.tsx`:
- uses **`--cm-*` tokens** throughout (`--cm-bg-base`, `--cm-accent`, …),
- uses **inline `style={{}}`** objects, not `ui/iv` components, not `iv-*` classes,
- duplicates button styles locally (`primaryBtn`, `secondaryBtn`, `ghostBtn`).

So it is a legacy-token page restyled to *look* Ivory, not a page built on the
Ivory system. It will not inherit Ivory token changes and must be re-themed again
at cutover when `--cm-*` is removed.

## 3. Two component libraries (direct duplication)

| Primitive | Legacy `src/components/ui/` | Ivory `src/components/ui/iv/` |
|---|---|---|
| Button | ✅ | ✅ |
| Card | ✅ | ✅ |
| Input | ✅ | ✅ |
| Badge | ✅ | ✅ |
| Chip | ✅ | ✅ |
| Toggle | ✅ | ✅ |
| Toast | ✅ | ✅ |
| SegmentedControl | ✅ | ✅ |
| Modal / Dialog | Modal | Dialog |
| Drawer | ✅ | — |
| MarkdownRenderer, LoadingSpinner | ✅ | (Spinner, Skeleton in iv) |
| — | — | Avatar, Dropdown, Tabs, MetricCard, EmptyState, ErrorState, ProgressBar, Gallery |

**8 primitives are duplicated** (Button, Card, Input, Badge, Chip, Toggle, Toast,
SegmentedControl). They are not shared — `ui/iv` is a clean-room reimplementation
on Ivory tokens. The legacy `ui/*` set is consumed only by the legacy app and the
landing page; `ui/iv/*` only by the Ivory shell.

## 4. Two chart implementations

- Legacy: `src/components/charts/` — `RadarChart`, `LineChart`, `ScoreRing`,
  `EvalBar` (used by legacy stats/analysis).
- Ivory: charts are hand-rolled inline SVG inside `src/features/**` (e.g. the
  dashboard rating line, the improve radar, the landing progress SVG).

No single charting abstraction. The radar concept exists at least twice.

## 5. Classification

| Category | Examples |
|---|---|
| **Ivory (target)** | `tokens.css`, `globals.css`, `components/ui/iv/*`, `src/app/*`, `src/features/*` |
| **Legacy (to retire)** | `style.css` (`--cm-*`), `components/ui/*`, `components/charts/*`, `components/game/*`, `components/stats/*`, `components/analysis/*` (legacy), `MainApp` |
| **Mixed / ambiguous** | `LandingPage.tsx` (Ivory-styled, legacy tokens, inline), `ThemeToggle`, `ErrorBoundary`, `AuthForm` — shared by both apps, themed with `--cm-*` |
| **Duplicate** | 8 UI primitives, radar/line charts, two Toast systems (legacy `ToastContext` + Ivory `IvToastProvider`) |

Note: **two toast systems run at once** — `ToastProvider` (legacy, in `App.tsx`)
and `IvToastProvider` (Ivory, in `AppRouter.tsx`). Both are mounted in the default
authed path.

## 6. Token inconsistencies / drift risks

- Same semantic concept under two names: `--cm-bg-base` vs `--bg`,
  `--cm-accent` vs `--accent`, `--cm-border-subtle` vs `--border`. Any global
  color change must be made twice until cutover.
- Landing hardcodes some values inline (e.g. `rgba(12,14,18,0.72)` nav blur,
  `rgba(224,178,110,…)` glows) that don't map to either token set.
- Ivory `data-accent`/`data-board`/`data-density` theming is implemented but has
  **no user-facing control** (Settings is unbuilt/unreachable), so the
  theming system is dormant.

## 7. Is there one design system? — No, but there's a clear target

The **intended** end state is one system (Ivory). The strangler is partway: shell
+ 4 screens are on Ivory; the landing page, the entire legacy app, shared
auth/error/theme components, and all `--cm-*` styling are not. Consolidation =
the Phase 11 cutover (remove `--cm-*`, delete `components/ui/*` + legacy app,
re-theme the landing on Ivory tokens/components). Until then, "two of everything"
is the steady state.
