# UI_UX_AUDIT.md

**Mode:** Ground Truth. **Date:** 2026-06-26.
**Captured live** via headless Chromium on `localhost:5173` at desktop (1280×720)
and mobile (375×812). Screenshots referenced were saved to `/tmp/cm-*.png` during
the audit. No fixes were applied.

---

## 1. Screens reviewed

| Screen | Desktop | Mobile | Verdict |
|---|---|---|---|
| Landing (`/`) | ✅ | (reflows) | Polished, complete, ships as-is |
| Dashboard | ✅ | ✅ | Clean; **sparse** + sample data |
| Games library | ✅ | n/a here | Dense table, well-structured |
| Analysis workspace | ✅ | n/a here | Strong 3-pane layout |
| Improve hub | ✅ | n/a here | Information-rich, good hierarchy |
| Placeholder (settings/etc.) | ✅ | — | Branded, on-system |

## 2. Landing page (`src/components/marketing/LandingPage.tsx`)

Full marketing page: sticky blurred nav, hero with glow, fake demo board +
insight rail, 6-card feature grid, 3-step "how it works", example analysis,
SVG progress preview, FAQ accordion, 3-tier pricing, final CTA, footer.

Observations:
- Visual quality is high and consistent (dark Obsidian base, single gold accent).
- **It is built entirely with inline `style={{}}` objects on `--cm-*` tokens** —
  ~1,200 lines, no shared components, no Ivory primitives. See DESIGN_SYSTEM_AUDIT.
- Pricing Pro/Team CTAs are correctly `disabled` with "coming soon" semantics.
- The hero and FAQ advertise the **AI coach** and "10 AI coach queries/day" — a
  feature that is a Coming-Soon placeholder in the app (see RELEASE_BLOCKERS).

## 3. Dashboard

- Greeting "Good evening, there" (name is empty in the auth-less preview).
- Two-column: Weekly Focus card + "Continue improving" CTA on the left; an
  improvement-score quote card and "Your plan" list on the right.
- **Whitespace:** below the fold the page is mostly empty on desktop — the
  content occupies the top third. Reads as under-built rather than intentionally
  minimal.
- All numbers ("84% last game · 5d streak", "Week 7", "+4%") are **fabricated
  sample values**, not the user's data (see DATA_FLOW_AUDIT).
- Mobile: reflows to a single column with the bottom tab bar; spacing is correct.

## 4. Games library

- Header "Your games · 12 games · 7 analyzed", filter chips (All/Recent/
  Favorites/Losses to review/+New collection), a second row of result/color/time/
  sort filters, then a table (opponent, result, color, opening, time, date,
  status).
- Status column mixes "✓ Analyzed" (green) and "○ Pending" (muted) — clear.
- Good density and alignment. The "Connect · soon" affordance is correctly muted.
- Two filter rows stacked is slightly heavy; acceptable.

## 5. Analysis workspace

- Three panes: player bars (Sample Opponent 1502 / ChessMate "You" 1487), a large
  board with file/rank labels, and a right rail (Analysis/Coach/Lines tabs,
  "What to take away", move-quality chips, numbered move list).
- Bottom: board controls (⏮ ‹ › ⏭, Flip) and an eval timeline.
- Strong, legible, genuinely useful layout. The move-quality legend chips
  (`!! ! ?! ? ??` with counts) are a nice touch.

## 6. Improve hub

- Weekly-focus banner, a weakness radar chart (Tactical/Endgame/Opening/
  Positional + more), four weakness cards with severity tags, a "Recommended
  study plan" list, and a "Study goals" checklist.
- Most information-dense screen; hierarchy holds up. Severity color coding
  (high/med/low) is consistent.

## 7. Placeholder pages

- `PlaceholderPage` renders an `iv-h1` title, the destination `purpose`, and a
  card with a "Coming soon" label + "Back to dashboard" button. On-brand, moves
  focus to the heading for screen-reader announcement. Good.

## 8. Cross-cutting UI/UX issues (not fixed — list only)

| # | Severity | Issue |
|---|---|---|
| U1 | High | Dashboard & Improve present **sample data as the user's real data** — a correctness/trust problem, not just visual. |
| U2 | High | **Settings/Profile unreachable** from the UI; user menu has only "Sign out". No appearance/account controls despite `ThemeToggle` existing elsewhere. |
| U3 | Medium | **Two visual languages** in one product: legacy-token landing (and the entire legacy app) vs Ivory shell. A user toggling rollback sees a different design system. |
| U4 | Medium | Dashboard desktop layout is **bottom-heavy with empty space**; looks unfinished. |
| U5 | Medium | Landing advertises the **AI Coach** prominently; in-app Coach is a placeholder. Expectation gap. |
| U6 | Low | Landing is 1,200 lines of inline styles — no reuse, hard to keep on-system as Ivory evolves. |
| U7 | Low | `/games/:id` and `/analysis/:id` are the same screen; deep-link/back-button semantics may surprise. |
| U8 | Low | Theme toggle present on landing and legacy header but **not in the Ivory shell** (lives in unreachable Settings). |

## 9. Accessibility posture (observed, not exhaustively re-tested)

- Skip link, focus management on route change (`PlaceholderPage`, `AppShell`),
  ARIA labels on icon buttons, `role="img"` on the demo board.
- A dedicated axe/Playwright a11y suite exists per screen (`e2e/*-a11y.spec.ts`).
  Not executed in this read-only pass; prior commits claim AA compliance.
- No automated contrast or keyboard-trap regressions were introduced by reading.
