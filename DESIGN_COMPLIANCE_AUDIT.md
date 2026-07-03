# ChessMate — Design Compliance Audit

> **Scope:** Phases 1–3 (Design tokens · Core UI system · App shell). Screens (Dashboard/Analysis/Improve/Games/Coach/Progress/Weaknesses/Settings/Profile) are placeholders and out of scope.
> **Authorities:** `CHESSMATE_SYSTEM_DESIGN.md` (design) + `CHESSMATE_IMPLEMENTATION_ARCHITECTURE.md` (engineering). Documentation wins.
> **Method:** code inspection + the Phase 2/3 verification captures (`/tmp/cm-phase2-*.png`, `/tmp/cm-phase3-*.png`).
> **Status legend:** ✅ Compliant · 🟡 Partially compliant · ❌ Non-compliant.
> No code was changed for this audit.

## Summary (original audit — pre Phase 3.5)

| # | Area | Verdict |
|---|---|---|
| 1 | Design token implementation | ✅ Compliant |
| 2 | Typography system | 🟡 Partially compliant |
| 3 | Color system | ✅ Compliant |
| 4 | Navigation architecture | 🟡 Partially compliant |
| 5 | Sidebar implementation | 🟡 Partially compliant |
| 6 | Mobile navigation | 🟡 Partially compliant |
| 7 | Command menu | 🟡 Partially compliant |
| 8 | Accessibility | 🟡 Partially compliant |
| 9 | Theme system | ✅ Compliant |
| 10 | Responsive behavior | 🟡 Partially compliant |

> **Update 2026-06-22 — Phase 3.5 Shell Compliance Remediation** resolved the high-priority findings. See the [Phase 3.5 Remediation Report](#phase-35-remediation-report-2026-06-22) at the end of this document for the updated scorecard, before/after evidence, and remaining (deferred) gaps.

**Headline:** Foundations (tokens/color/theme) are faithful to spec. The gaps are concentrated in shell behaviors that the spec specifies but Phase 3 simplified or deferred: tablet icon-rail, command-menu focus trap + "Recent games", the sidebar "Collections" semantics, and Settings/Profile placement. None are blocking for Phase 4; most are small, isolated fixes. The one cross-cutting risk is **`color-mix()` browser support** and **no automated axe pass yet**.

---

## 1. Design token implementation — ✅ Compliant

**Evidence**
- `src/styles/tokens.css` defines the full §5 token set under the spec's own names (`--bg`, `--surface-1..3`, `--surface-elev`, `--surface-card-grad`, `--hairline`, `--border(-strong)`, `--text-hi/body/mid/low/faint`, `--accent*`, `--mq-*`, semantic, `--board-*`, `--piece-*`, spacing, `--r-*`, shadows, motion, opacity, `--focus-ring`).
- `src/styles/tokens.test.ts` (11 tests) asserts locked values **verbatim** against §5 — e.g. `--bg:#0C0B0A`, `--accent:#EBD9B8`, `--mq-blunder:#D85B4A`, `--r-pill:999px`. All pass.
- Additive/strangler: legacy `--cm-*` (Obsidian) untouched, so production is unchanged. `src/main.tsx` imports `tokens.css` before legacy styles.
- Tailwind preset extended additively with token-bound utilities (`tailwind.config.js`: `bg`, `surface`, `text.*`, `accent`, `mq.*`, `rounded-iv-*`, `shadow-iv-*`, `bg-iv-*`, `maxWidth.content`).

**Screenshots:** `cm-phase2-styleguide.png` (surfaces, accent, radii, shadows, board all render from tokens).

**Gaps:** None material. Minor: spacing/type-scale tokens exist in `tokens.css` but are **not** mirrored into the Tailwind preset (only color/radius/shadow are), so Tailwind users can't reach `--space-*`/type via utilities yet.

**Recommended fix (low):** add `spacing` and `fontSize` scales to the Tailwind preset for parity (optional; inline `var(--space-*)` already works).

---

## 2. Typography system — 🟡 Partially compliant

**Evidence**
- `--font-sans:'Onest'` and `--font-mono:'JetBrains Mono'` per §5.3 (`tokens.css`). Onest loaded in `index.html` (weights 400;500;600;700, preconnect, `display=swap`); JetBrains Mono loaded via `style.css`.
- Full §5.3 type scale present as tokens (`--fs-display/h1/h2/h3/title/body/body-sm/label/caption/data` with matching weight/line-height/tracking).
- Mono is correctly used for data (ratings, eval, SAN, `⌘K` hint, metric values): `iv.css` `.iv-metric__value`, `.iv-metric__delta`, `.iv-chip__san`, `.iv-search__kbd`; `shell.css` `.ivs-navitem__badge`.
- New shell sets `font-family:var(--font-sans)` on `.ivs-shell` (`shell.css:7`).

**Screenshots:** `cm-phase3-desktop.png` (Onest headings + body), `cm-phase2-styleguide.png` (type rows + mono data).

**Gaps**
- **No global type layer.** Headings/body get the scale via **ad-hoc inline** `font: var(--fw-h1)...` in each component (e.g. `PlaceholderPage.tsx`, `Dialog.tsx`). There is no `h1→display`, `h2→h2` base mapping or reusable type utility classes, so scale consistency depends on every author repeating the tokens correctly. Spec §5.3 defines named roles; the implementation has the values but not named, reusable type styles.
- **Gradient-clip display treatment** (`.iv-headline-grad`, §5.3) exists in `globals.css` but is only used on the dev styleguide, not yet adopted by any product hero (expected — heroes are Phase 4+).

**Recommended fix (medium):** add a small set of type primitives or `@layer` base rules (e.g. `.iv-display/.iv-h1/.iv-h2/.iv-h3/.iv-title/.iv-label`) bound to the scale tokens, and have components use those instead of inline `font:` shorthands. Do this before Dashboard so screens inherit consistent type.

---

## 3. Color system — ✅ Compliant

**Evidence**
- Near-monochrome warm ivory-on-near-black; saturated color reserved for move-quality + semantic only (§2.8, §5.1). Verified across `tokens.css` and component CSS — no off-system hex in `iv.css`/`shell.css` (only `#211d18` progress track, which is the spec's literal value in §6).
- Move-quality palette fixed and never re-themed: `--mq-*` defined once under `:root`; **not** overridden by `[data-theme="light"]` or `[data-accent]` (verified — light block redefines only bg/surface/text/shadows). Chip pattern matches §5.1: text=color, `bg=color@11%`, `border=color@30%`, 7px dot, emphasis `box-shadow ... 55%` (`iv.css` `.iv-chip--mq`).
- Semantic tokens (`--success/--warning/--error/--info`) used for badges, error state, toasts, progress.

**Screenshots:** `cm-phase2-light-peri.png` — switching theme→light and accent→periwinkle recolors chrome while **move-quality chips stay fixed** (correct).

**Gaps**
- **`color-mix(in srgb, …)`** is used for all tint/alpha derivations (chips, badges, nav-active fill, state icons). Supported in current evergreen browsers (Chrome 111+/Safari 16.2+/Firefox 113+) but not older ones; the repo's browserslist data is stale, so the real support floor is unconfirmed. This is a robustness risk, not a spec deviation (spec gives explicit alpha values).

**Recommended fix (medium, pre-GA):** confirm the supported-browser floor; if it includes pre-2023 browsers, replace `color-mix` with precomputed `rgba()` token variants (e.g. `--mq-blunder-bg`, `--mq-blunder-border`) so tints don't silently fall back to transparent.

---

## 4. Navigation architecture — 🟡 Partially compliant

**Evidence**
- IA order exactly per §3: Dashboard → Games → Analysis → Improve → Coach (`src/app/navigation.ts` `PRIMARY_NAV`). Confirmed by `nav.test.tsx` (asserts order + hrefs) and `cm-phase3-desktop.png`.
- Command menu (`⌘K`) available globally (`AppShell.tsx` keydown), search hint in sidebar (§3 global utilities).
- Route table matches Architecture §4 (`AppRouter.tsx`): all destinations + `/games/import`, `/games/:id`, `/analysis/:id`; `/` → `/dashboard`; `*` → `/dashboard`.

**Screenshots:** `cm-phase3-desktop.png`, `cm-phase3-cmdk.png`.

**Gaps**
- **Settings & Profile are listed as sidebar nav items.** §3 specifies a "**user/profile menu** pinned bottom of sidebar" — Settings/Profile should hang off the user block menu, not appear as primary/secondary nav rows. Currently `SECONDARY_NAV` includes Settings + Profile as nav links.
- **"Recent games" not in command menu.** §6 Command Menu lists "Go to…, Recent games, Actions". Only "Go to" + "Actions" exist (Recent games needs game data — deferred, but flag it).
- **Improve count badge unused.** §3 marks Improve with a badge = active focus count; `.ivs-navitem__badge` CSS exists but is never rendered (needs data — deferred).
- **Search is not "scoped to games".** §3: "search scoped to games; deep query opens Command Menu." The sidebar search currently just opens the command menu (no games-scoped results) — acceptable pre-data, but not the final behavior.

**Recommended fix (medium):** (a) move Settings/Profile into a user-block popover menu (Phase 10 wires content; the menu affordance can land with the shell). (b) Reserve the "Recent games" command group + Improve badge for the data phases (Phase 4/7) — already implied by the roadmap; note as known-deferred.

---

## 5. Sidebar implementation — 🟡 Partially compliant

**Evidence**
- §6 Navigation Components checklist: brand mark ✅, search w/ `⌘K` ✅, nav items icon+label ✅, active = accent-tinted fill + border ✅ (`shell.css` `.ivs-navitem[aria-current="page"]` → `color-mix(accent 12%)` fill + `accent 24%` border; `aria-current` set by `NavLink`), user block pinned bottom ✅.
- Width **232px** exactly (§7 "app shell = sidebar 232px", `shell.css:13`). Collapse-to-icon-rail supported (`--collapsed` modifier + toggle, `uiStore`).

**Screenshots:** `cm-phase3-desktop.png` (active Dashboard pill, Library group, user block, collapse `«`).

**Gaps**
- **"Collections group" semantics differ.** §6 sidebar has a "Collections group (Library)" = **saved smart-filters** (per §4.2 Game Library collections). The implementation uses a "LIBRARY" group as a **catch-all for secondary nav** (Weakness Profile, Progress, Import, Settings, Profile). That's not what "Collections" means in the spec.
- Tied to #4: Settings/Profile shouldn't be in this group at all.

**Recommended fix (medium):** when Game Library lands (Phase 7), make the sidebar "Collections" group hold saved smart-filters (All games / Losses to review / Endgame slips, per §3/§4.2). Relocate Weakness/Progress as deeper entries or keep as a clearly-separate "Improve" sub-group, and move Settings/Profile to the user menu.

---

## 6. Mobile navigation — 🟡 Partially compliant

**Evidence**
- Bottom tab bar: 4 items Home/Games/Analysis/Improve (§4.11/§6), **64px** tall (`shell.css:78`), top `--hairline` border, active = accent glyph + `--text-hi` label (`.ivs-bottombar__item[aria-current="page"]`). Coach correctly **excluded** (contextual entry, §10). Confirmed `nav.test.tsx` + `cm-phase3-mobile.png`.
- Mobile top bar with brand + command-menu + sign-out; content padded for the fixed bar (`.ivs-shell__content--mobile`).

**Screenshots:** `cm-phase3-mobile.png`.

**Gaps**
- **Reachability on mobile.** Only the 4 bottom-tab destinations + whatever the command menu offers are reachable; Coach/Weaknesses/Progress/Settings/Profile are reachable **only via ⌘K** on mobile (no nav sheet). Spec is fine with Coach being contextual, but Settings/Profile/Weakness/Progress have no mobile nav affordance beyond the command menu. Acceptable but worth an explicit decision.
- 44px touch targets: bottom-tab items fill a 64px bar (OK); the top-bar icon buttons are `min 40×40` (`.ivs-iconbtn`), **below the 44px** minimum in §6/§10 for coarse pointers. (The `iv.css` primitives do enforce 44px under `@media (pointer:coarse)`, but `.ivs-iconbtn` in `shell.css` does not.)

**Recommended fix (low):** bump `.ivs-iconbtn` to 44×44 under coarse pointers; decide whether mobile needs a nav sheet (a "More" affordance) for non-tab destinations or whether ⌘K suffices.

---

## 7. Command menu — 🟡 Partially compliant

**Evidence**
- `⌘K`/`Ctrl+K` global toggle (`AppShell.tsx`), `role="dialog" aria-modal="true"`, input as `role="combobox"` with `aria-controls`/`aria-activedescendant`, grouped `role="listbox"`/`option` results, arrow-key nav, Enter executes, Esc closes (`CommandMenu.tsx`). Focus moves to input on open; restored to trigger on close. `nav.test.tsx` covers open/filter/Enter-navigates/Escape-closes.
- Mono `⌘K` hint in sidebar search (§6).

**Screenshots:** `cm-phase3-cmdk.png` (scrim, input, "Go to" group, active item highlighted).

**Gaps**
- **No Tab focus trap.** `CommandMenu.tsx` handles only Escape/Arrow/Enter (`grep` confirms no `Tab` handling and it does **not** use `useModalA11y`). Tab can move focus to elements behind the scrim — violates §11 "dialogs trap focus." (Note: the `iv` `Dialog` component *does* trap focus via `useModalA11y`; the command menu is the exception.)
- **Positioning:** spec §6/§375 says "centered overlay dialog"; implementation anchors near the top (`align-items:flex-start; padding-top:12vh`). This is a common command-palette convention but deviates from the literal "centered."
- **"Recent games" group missing** (data-dependent; see #4).

**Recommended fix (medium):** add a Tab focus trap to the command menu (reuse `useModalA11y` or add Tab handling); decide centered vs top-anchored with the designer (recommend keeping top-anchored only if approved, else center per spec).

---

## 8. Accessibility — 🟡 Partially compliant

**Evidence (compliant parts)**
- Keyboard: nav tabbable, `⌘K`, command-menu arrow/enter/esc, sidebar collapse button labeled.
- Focus management: route change moves focus to the screen `h1` (`PlaceholderPage.tsx` focuses `h1` with `tabIndex=-1`) — §11.
- Visible focus ring everywhere via `--focus-ring` (buttons, inputs, nav items, segmented, tabs, toggle, dropdown).
- ARIA: `<nav aria-label>` + `aria-current="page"`; tabs `tablist/tab/tabpanel`; segmented `radiogroup/radio`; toggle `switch`; dialog `aria-modal`; toasts `aria-live="polite"`, error state `role="alert" aria-live="assertive"` (§11).
- Reduced motion: `tokens.css` zeroes `--dur-*` and `globals.css` disables halo/shimmer/page-enter under `prefers-reduced-motion`.
- Meaning never color-only: move-quality chips pair color with symbol+label; metric deltas pair color with ▲/▼ (`iv.test.tsx` asserts both).

**Screenshots:** focus rings visible on interactive elements in `cm-phase2-components.png`.

**Gaps**
- **Command menu lacks focus trap** (see #7) — a real §11 violation.
- **No automated axe pass.** Architecture §20/§25 require axe in CI; `@axe-core/playwright` is installed but no a11y test runs against the new shell yet. Contrast is **spec-claimed** AA (Ivory values) but **not independently verified** in this implementation.
- **No skip-to-content link** for keyboard users landing on the shell.
- `.ivs-iconbtn` touch target < 44px (see #6).
- Sidebar search is a `readOnly` input acting as a button (labeled "Open command menu"); functional but a real `<button>` would be cleaner for SR semantics.

**Recommended fix (high for trap + axe):** (1) trap focus in the command menu; (2) add an axe smoke test (Playwright) over the shell + a contrast check on the token pairs, wire into CI; (3) add a skip link; (4) fix icon-button target size.

---

## 9. Theme system — ✅ Compliant

**Evidence**
- All three §5.10 tweaks implemented as independent attributes: `[data-accent]` (ivory/periwinkle/sage/clay), `[data-board]` (wood/slate/tournament), `[data-density]` (cozy/comfortable/spacious → `--content-max` 960/1120/1280), plus light/dark via `[data-theme]` (`tokens.css`).
- `themeStore.ts` persists prefs to `localStorage` and `applyThemeAttributes()` reflects them onto `<html>`; `AppRouter` applies on mount/change.
- Strangler-safe: new shell uses `data-theme`/`data-accent`/…; legacy app keeps its own `data-color-scheme` ThemeToggle — no interference.
- §5.2 invariant honored: light theme overrides only bg/surface/text/shadows; accent/move-quality/semantic inherit unchanged (verified — light block contains no accent/mq/semantic redefinition).

**Screenshots:** `cm-phase2-light-peri.png` (live recolor: light + periwinkle), `cm-phase2-styleguide.png` (board/accent/density toggles).

**Gaps**
- No **control surface** in the new shell to change theme yet (Appearance lives in Settings, Phase 10). The system works; only the UI to drive it is deferred. Not a spec deviation at this phase.

**Recommended fix:** none now; expose Accent/Board/Density controls in Settings (Phase 10) wired to `themeStore`.

---

## 10. Responsive behavior — 🟡 Partially compliant

**Evidence**
- Two-mode shell: sidebar (≥768px) ↔ top bar + bottom tab bar (<768px) via `useBreakpoint().width` (`AppShell.tsx:11,20`).
- Density max-width via `--content-max` token; placeholder content centers within `max-width:var(--content-max)`.
- Bottom-bar content padding prevents overlap.

**Screenshots:** `cm-phase3-desktop.png` (sidebar) vs `cm-phase3-mobile.png` (top + bottom bar).

**Gaps**
- **No distinct tablet treatment.** §10 defines tablet 768–1023 as "sidebar → **icon rail or top bar with overflow**". The implementation shows the **full** 232px sidebar across tablet/laptop/desktop; the icon rail exists but only via the manual collapse toggle, not automatically at the tablet breakpoint. The spec's 4-tier breakpoint system (mobile ≤767 / tablet 768–1023 / laptop 1024–1279 / desktop ≥1280) is collapsed to a single 768px threshold.
- Density `--content-max` is enforced per-screen (placeholder does it) rather than by the shell content container — fine, but each future screen must remember to apply it.

**Recommended fix (medium):** add auto-collapse to icon rail in the 768–1023 range (or a top-bar+overflow), matching §10; consider applying `max-width:var(--content-max)` at the shell's `<main>` so screens inherit it.

---

## Cross-cutting recommendations (priority order)

1. **High — Command-menu focus trap** (§7/§8): the only outright §11 violation; small fix.
2. **High — Wire axe + contrast checks into CI** (§8, Arch §20/§25): converts "spec-claimed AA" into verified AA before screens multiply.
3. **Medium — `color-mix()` fallback decision** (§3): confirm browser floor or precompute rgba tint tokens.
4. **Medium — Sidebar IA correction** (§4/§5): Settings/Profile → user menu; reserve "Collections" for saved smart-filters.
5. **Medium — Type primitives** (§2): named type classes before Dashboard so screens inherit consistent scale.
6. **Medium — Tablet icon-rail** (§10): honor the 768–1023 behavior.
7. **Low — `.ivs-iconbtn` 44px target** (§6/§8); skip-to-content link (§8); Tailwind spacing/type scale parity (§1).

**None of these block starting Phase 4.** Items 1, 2, 4, and 5 are best addressed either now or folded into Phase 4's start since they affect every screen built on the shell.

---

# Phase 3.5 Remediation Report (2026-06-22)

Shell-compliance-only milestone. Scope: the high-priority findings above. No screens, no new user-facing features. Legacy production app untouched; `ui.newShell` remains flagged OFF by default.

## Updated scorecard

| # | Area | Before | After | What changed |
|---|---|---|---|---|
| 1 | Design tokens | ✅ | ✅ | (held) Tailwind parity note remains low-pri |
| 2 | Typography | 🟡 | ✅ | Added type primitives (`.iv-display/.iv-h1…/.iv-data`); shell components use them, no inline `font:` shorthands |
| 3 | Color system | ✅ | ✅ | (held) `color-mix` fallback still a documented pre-GA item |
| 4 | Navigation architecture | 🟡 | ✅ | Settings/Profile → user menu; Weakness/Progress → Improve sub-views; Import → off Games (§3) |
| 5 | Sidebar implementation | 🟡 | ✅ | Primary nav only (5 items) + user/profile menu pinned bottom; "Collections" reserved for Phase 7 |
| 6 | Mobile navigation | 🟡 | ✅ | User menu added to mobile top bar; `.ivs-iconbtn` now 44px on coarse pointers |
| 7 | Command menu | 🟡 | ✅ | Focus trap + Tab loop + Esc + focus restoration; combobox options non-tabbable |
| 8 | Accessibility | 🟡 | ✅ | axe automation (jsdom component + Playwright e2e w/ contrast) in CI; skip link; focus trap; Avatar `role="img"` |
| 9 | Theme system | ✅ | ✅ | (held) Appearance controls still land in Settings (Phase 10) |
| 10 | Responsive behavior | 🟡 | ✅ | Four-tier breakpoints (§10): mobile / tablet icon-rail / laptop / desktop |

## Before → After → Evidence (high-priority items)

### 7. Command menu accessibility — 🟡 → ✅
- **Before:** `CommandMenu.tsx` handled Escape/Arrow/Enter only; Tab escaped the modal (no trap).
- **After:** Tab/Shift+Tab trap on the input (combobox pattern); options `tabIndex=-1` addressed via `aria-activedescendant`; Esc closes; focus restored to the trigger on close.
- **Evidence:** `src/components/nav/CommandMenu.tsx`; unit tests "traps Tab focus on the input", "restores focus to the trigger when closed" (`nav.test.tsx`); e2e "command menu opens on Ctrl/⌘+K, traps focus, closes on Escape, and is contrast-clean" (`e2e/shell-a11y.spec.ts`).

### 8. Accessibility automation — 🟡 → ✅
- **Before:** `@axe-core/playwright` installed but unused on the new shell; contrast spec-claimed, not verified; no skip link.
- **After:** (a) jsdom component axe smoke tests (`src/test/axe.ts` helper; `iv/a11y.test.tsx`, `nav.test.tsx`); (b) Playwright a11y e2e with real-browser **color-contrast** over sidebar chrome + command menu (`e2e/shell-a11y.spec.ts`); (c) explicit `accessibility` CI job + a11y specs run in `unit-tests` and `e2e` jobs → CI fails on regressions; (d) skip-to-content link; (e) Avatar uses `role="img"`.
- **Evidence:** `.github/workflows/ci.yml` (`accessibility` job + broadened PR triggers); `src/app/AppShell.tsx` (`.ivs-skiplink`); local runs: unit 177 passing, a11y e2e 4/4 passing.

### 4 & 5. Navigation / Sidebar IA — 🟡 → ✅
- **Before:** Settings/Profile were sidebar nav items; "Library" group was a secondary-nav catch-all.
- **After:** Primary nav = Dashboard/Games/Analysis/Improve/Coach only. Settings + Profile live in a `UserMenu` pinned bottom (shared by desktop sidebar + mobile top bar). Weakness Profile + Progress reclassified as Improve sub-views; Import as a route off Games. All remain reachable via ⌘K.
- **Evidence:** `src/app/navigation.ts` (`PRIMARY_NAV`, `USER_MENU`, `IMPROVE_SUBVIEWS`, `IMPORT_ROUTE`); `src/components/nav/UserMenu.tsx`; tests "does NOT expose Settings/Profile as primary nav", "UserMenu opens an account menu…"; screenshots `cm35-desktop.png`, `cm35-usermenu.png`.

### 2. Typography primitives — 🟡 → ✅
- **Before:** type scale applied via inline `font: var(--fw-h1)…` shorthands per component.
- **After:** named type primitives in `globals.css` (`.iv-display/.iv-h1/.iv-h2/.iv-h3/.iv-title/.iv-body/.iv-body-sm/.iv-label/.iv-caption/.iv-data`), bound to the scale tokens. Shell components (`PlaceholderPage`, `Dialog`) use the classes; no inline typography in the shell.
- **Evidence:** `src/styles/globals.css`; `src/app/PlaceholderPage.tsx`; `src/components/ui/iv/Dialog.tsx`.

### 10. Responsive architecture — 🟡 → ✅
- **Before:** single 768px threshold; tablet got the full sidebar.
- **After:** four tiers per §10 — mobile ≤767 (top bar + bottom tab bar), tablet 768–1023 (auto icon-rail sidebar, toggle hidden), laptop 1024–1279 + desktop ≥1280 (full sidebar, toggle available).
- **Evidence:** `src/app/AppShell.tsx` (`BP` thresholds, `sidebarCollapsed = isTablet || manualCollapsed`); screenshots `cm35-desktop.png`, `cm35-laptop.png`, `cm35-tablet.png`, `cm35-mobile.png`.

## Remaining gaps (intentionally deferred — not Phase 3.5 scope)

- **`color-mix()` fallback** (§3): still used for tints; confirm browser floor / precompute rgba tokens pre-GA.
- **"Collections" group** (§5/§6): saved smart-filters land with Game Library (Phase 7).
- **Improve count badge + "Recent games" in ⌘K** (§3/§6): data-dependent (Phase 4/7).
- **Appearance controls** (§9): Accent/Board/Density UI lands in Settings (Phase 10); `themeStore` already supports it.
- **Tailwind spacing/type-scale utility parity** (§1): low priority; inline `var(--space-*)` works today.
- **Command-menu positioning:** top-anchored (Raycast/Linear convention, the spec's stated influences) rather than literally centered — see DECISION_LOG.
