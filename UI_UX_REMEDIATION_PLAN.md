# UI/UX Remediation Plan — Ivory product-wide refinement

> **Authority:** `CHESSMATE_SYSTEM_DESIGN.md` (§3 "Clarity over density — generous spacing, one primary message per region, restraint"; §5 tokens; §10 responsive) · `CHESSMATE_IMPLEMENTATION_ARCHITECTURE.md` · `DESIGN_COMPLIANCE_AUDIT.md` · `PROJECT_STATE.md`. Documentation wins.
> **Nature:** product-wide **visual refinement** — simplify, breathe, strengthen hierarchy. **Not** bug-fixing; **no** functional/architectural/a11y regressions.
> **Evidence:** live captures `/tmp/cmaudit/{d,m}-*.png` (Dashboard, Games, Analysis, Improve, Review Mistakes; desktop 1440 + mobile 390).

---

## Guiding principles (from §3)
1. One **primary** action per screen — everything else recedes.
2. **Generous, consistent** whitespace; solve emptiness with composition, never filler.
3. Strong type hierarchy: page → section → card title → body → meta.
4. Coaching-first: lead with the lesson + the next step, not a metrics wall.

---

## Issue inventory + severity

### 🔴 High
| # | Screen | Issue | Evidence |
|---|---|---|---|
| H1 | **Dashboard** | **Competing primaries** — header shows *two* prominent buttons ("Import games" + "Continue improving") AND Weekly Focus has "Start session". Three CTAs fight for the eye. | `d-dashboard.png` top-right + Weekly Focus |
| H2 | **Dashboard** | **Clutter / high cognitive load** — 7 regions on one view (score, trend, weaknesses, weekly focus, recently-analyzed, roadmap, coach summary) with tight gaps; reads as an analytics console, not a coach. | `d-dashboard.png` |
| H3 | **Global** | **Weak vertical rhythm** — section gaps are tight and inconsistent across screens; cards crowd each other; little "air." | all `d-*` |

### 🟠 Medium
| # | Screen | Issue | Evidence |
|---|---|---|---|
| M1 | **Improve** | Skill-profile **radar card is imbalanced** — a small radar floating in a large, mostly-empty card next to a dense Weekly Focus. | `d-improve.png` top-right |
| M2 | **Analysis** | **Right-rail top gap** — an empty dark band above the move-quality chips (PlayerBar/EvalBar alignment); the Eval-Timeline card at the bottom is mostly empty. | `d-analysis.png` |
| M3 | **Dashboard (mobile)** | Header's **two buttons cramped** side-by-side; CTAs wrap awkwardly. | `m-dashboard.png` |
| M4 | **Review Mistakes** | Feed **rows are dense** (tight padding, small meta); two filter rows stack heavily. | `d-mistakes.png` |
| M5 | **Global typography** | Section labels (uppercase micro-caps) and card titles sit too close in size/weight → hierarchy reads flat. | all |

### 🟡 Low
| # | Screen | Issue |
|---|---|---|
| L1 | Global | Content max-width feels wide/dense at 1440 (rows stretch); Comfortable density (`--content-max` 1120) gives better gutters. |
| L2 | Games | Table rows are tight vertically; quick-insight strip cards could breathe more. |
| L3 | Improve | View-switcher (Plan / Review mistakes) is visually small under the title. |

---

## Before → After (per item)

- **H1 (one primary):** *Before* — Import + Continue improving + Start session all prominent. *After* — Weekly Focus "Start session" is the **single primary**; header "Import games" becomes **ghost/secondary**; drop the duplicate "Continue improving" header button (it duplicates the focus action). One unmistakable next step.
- **H2 (declutter):** *Before* — 7 equal-weight regions. *After* — elevate the hero (score) + Weekly Focus; **visually demote** secondary regions (roadmap, coach summary, recently-analyzed) with lighter treatment + more spacing; no data removed, weight rebalanced. Coaching narrative leads.
- **H3 / L1 (rhythm + width):** *Before* — tight gaps, wide rows. *After* — bump inter-section gap to `--space-7/8`, card padding up, default **Comfortable** density (`--content-max` 1120) for generous gutters.
- **M1 (radar balance):** *Before* — tiny radar in a big empty card. *After* — enlarge the radar / tighten the card so fill ≈ matches the Weekly Focus height; balanced top row.
- **M2 (analysis rail):** *Before* — empty band above chips; empty timeline card. *After* — align PlayerBar/EvalBar to remove the gap; give the Eval-Timeline real height or fold its label inline.
- **M3 (mobile header):** *Before* — two buttons cramped. *After* — single primary; Import moves to an icon/ghost or below; full-width primary.
- **M4 (feed density):** *Before* — cramped rows. *After* — increase row padding/line-height; combine the two filter rows into one wrapping row.
- **M5 (type):** *Before* — flat. *After* — larger/heavier page h1 + h2; clearer section-label vs card-title contrast (size/color/tracking).

---

## Exact components affected (CSS-led; minimal JSX)
- **Global:** `src/styles/tokens.css` (default density → Comfortable) · `src/styles/globals.css` (type scale tune, if needed).
- **Dashboard:** `src/features/dashboard/dashboard.css` (rhythm, region weight) · `DashboardPage.tsx` (demote header CTAs — JSX, no logic change).
- **Improve:** `src/features/improve/improve.css` (radar card balance, view-switcher, rhythm).
- **Analysis:** `src/features/analysis/analysis.css` (rail gap, timeline height).
- **Review Mistakes:** `src/features/improve/improve.css` (`.iv-rm-*` row padding, filter row).
- **Games:** `src/features/games/games.css` (row + insight spacing).
- **Shell:** `src/app/shell.css` (page padding rhythm) — light touch.

> Strictly visual: spacing, sizing, weight, balance, one CTA demotion. **No** data, hooks, routing, or component contracts change. Accessibility (roles, labels, focus, contrast) preserved or improved.

---

## Implementation order
1. **Global foundation** (H3, L1, M5): density default + rhythm + type scale — biggest leverage, lifts every screen.
2. **Dashboard** (H1, H2): one primary + declutter/weight rebalance.
3. **Improve** (M1, L3): radar balance + switcher.
4. **Analysis** (M2): rail gap + timeline.
5. **Review Mistakes** (M4) + **Games** (L2): density relief.
6. **Mobile** (M3) pass across the above.
7. QA: visual + responsive + a11y; screenshots; PR.

## Estimated effort
| Phase | Effort |
|---|---|
| Global foundation | S (tokens/CSS) |
| Dashboard | M (CSS + small JSX) |
| Improve / Analysis | M (CSS, chart sizing) |
| Review Mistakes / Games | S (CSS) |
| Mobile pass + QA | M |
| **Total** | **~M** — CSS-dominant, low blast radius |

## Risk assessment
| Risk | Severity | Mitigation |
|---|---|---|
| Spacing changes regress a11y contrast/focus | Med | Re-run full axe e2e (30 specs); contrast unaffected by spacing. |
| Demoting a CTA hides an action | Low | Action preserved (ghost/secondary), not removed; one-primary is the intent. |
| Density default change shifts every layout | Med | `--content-max` only widens gutters; verify all breakpoints; reversible token. |
| Chart resize breaks radar label margins | Low | Keep ≥66px label margin (§6); re-run improve a11y. |
| Scope creep into functional change | Med | CSS-led; JSX limited to CTA demotion; no hooks/routing touched. |

## QA gates
Visual (re-capture all screens desktop+mobile, before/after) · Responsive (1440/1024/768/390) · Accessibility (full axe e2e 30/30 + unit suite) · typecheck/lint/build green. Then PR (no merge).

---
*Plan complete. Implementation proceeds in `feature/ui-ux-remediation` (branched from the cutover branch), CSS-led, preserving functionality/architecture/accessibility.*
