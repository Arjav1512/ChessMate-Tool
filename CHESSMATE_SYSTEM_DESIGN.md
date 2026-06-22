# ChessMate — System Design & Implementation Specification

> **Status:** Final. This document reverse-engineers the **approved** ChessMate designs (Ivory direction, dark-first) into an authoritative build spec. It is the single source of truth for implementation. Do not redesign, re-concept, or introduce alternatives. Where a value is given, use it verbatim.

**Locked artifacts this spec is derived from**
- `ChessMate Styleguide.dc.html` — tokens, type, color, components, motion
- `ChessMate Dashboard.dc.html` — Screen 1
- `ChessMate Game Analysis.dc.html` — Screen 2 (Analysis Workspace)
- `ChessMate Improve Hub.dc.html` — Screen 3
- `ChessMate Weakness Profile.dc.html` — Weakness/Progress
- `ChessMate Game Library.dc.html` — Screen 4

**Stack assumption:** React + TypeScript, CSS variables for tokens, SVG for data viz. No component invention beyond what is specified here.

---

## 1. Product Vision

### What ChessMate is
ChessMate is a **Personal Chess Improvement System**. It converts a player's own games into understanding, a personalized improvement plan, and visible progress over time. The product's job is to make a club-level player measurably stronger, not to display engine output.

### What ChessMate is **not**
- ❌ A chess **chatbot** (the Coach is a supporting peer feature, never the entry point)
- ❌ An **engine viewer** (eval exists, but always paired with meaning)
- ❌ A **PGN reader** (import is a means, not the product)
- ❌ A **generic analytics dashboard** (no vanity metrics, no data for data's sake)

### Core positioning
> A premium thinking tool that turns analysis into understanding.

Closer in feel to **Linear, Raycast, Perplexity, Arc, Granola** than to Chess.com, Lichess, or a SaaS admin template — while still immediately reading as a serious chess improvement platform.

### User promise
"I will understand *why* I lose, know *exactly* what to work on next, and *see* myself improve."

### Product philosophy — the primary loop
```
Import → Analyze → Understand → Learn → Improve → (repeat)
```
Every screen must advance this loop. If a screen shows a number, it must also show what the number means and offer the next action. The improvement loop is the product; analysis is one stage inside it.

---

## 2. Design Principles

Each principle is a binding constraint, not an aspiration.

1. **Improvement over analysis.** Analysis is a stage, not the destination. Every analytical surface must route to a learning action (drill, replay, study session).
2. **Insights over raw data.** Lead with the interpreted insight ("You gave up the bishop pair early in 4 of 10 games"), support it with the number — never the reverse.
3. **Clarity over density.** Generous spacing, one primary message per region, restraint. When a region feels empty, solve with composition — never filler.
4. **Familiar chess conventions.** The board, coordinates, move notation, eval bar, and move navigation follow Chess.com/Lichess conventions exactly. Innovation happens in learning/insight/progress — **never** in board controls.
5. **Coach as guide, not centerpiece.** The Coach summarizes and routes. It is a peer tab/panel, never the default view, never a full-screen chat shell.
6. **Progress is always visible.** Rating trend, improvement score, streaks, milestones, and weakness deltas (▲/▼) are surfaced persistently so momentum is felt.
7. **Every screen answers "what should I do next?".** A single, unmistakable primary action (the accent-gradient button) per screen. Never leave the player at a dead end.
8. **Color is earned.** The interface is near-monochrome warm ivory-on-near-black. Saturated color is reserved for **move quality** and **semantic state** only.
9. **Depth from light, not loud color.** Vibrancy comes from gradient surfaces, soft elevation, the ambient brand halo, and warm/cool radial glows — not from neon or heavy gradients.

---

## 3. Information Architecture

### Primary navigation (persistent left sidebar, desktop; bottom tab bar, mobile)
Order is intentional — it mirrors the improvement loop.

| # | Destination | Icon | Purpose | Entry condition | Exit condition | Primary user goal |
|---|---|---|---|---|---|---|
| 1 | **Dashboard** | `◉` | Orientation + momentum. Answers "how am I doing / what next?" | Default after login | Click a focus CTA → Improve/Analysis; click a game → Analysis | See standing, jump to the one recommended action |
| 2 | **Games** | `▦` | Manage & locate every imported game | From nav, from "All games" links | Select a game → Analysis; Import → Import flow | Find a game or a class of games (losses, endgame slips) |
| 3 | **Analysis** | `◎` | Understand a single game move-by-move | From a game row, from Dashboard recent list | Send a mistake → Improve; back → Games | Understand what happened and what to learn |
| 4 | **Improve** | `▲` (badge = active focus count) | The improvement system: weaknesses → plan → milestones | From nav, from Dashboard focus CTA, from Analysis "add to plan" | Start session → training; back → Dashboard | Know and act on "what should I work on next?" |
| 5 | **Coach** | `✦` | On-demand guided explanation & review | From nav, from any Coach card "ask"/"expand" | Returns user to originating context | Get a plain-language explanation or guided review |

**Global utilities:** Command menu (`⌘K`) available on every screen; search scoped to games; user/profile menu pinned bottom of sidebar.

**Secondary/owned routes:** Game Import (modal/route off Games), Weakness Profile & Progress Tracking (sub-views within Improve), Settings, Profile.

---

## 4. Screen Inventory

> Components referenced here are defined in §6. Each screen ships desktop + mobile (mobile re-thinks hierarchy, never shrinks desktop).

### 4.1 Dashboard
- **Purpose:** Orientation and momentum; the loop's home base.
- **User questions:** How am I doing? What are my biggest weaknesses? What should I improve next? What changed recently?
- **Required sections:** Greeting + primary CTA; Improvement Score; Rating trend; Biggest weaknesses (ranked, top 3); Recommended-this-week focus; Coach summary; Recently analyzed games; Improvement roadmap.
- **Required components:** Score Ring, Line Chart, Weakness Card (compact), Focus Card, Coach Card, Game Row (compact), Roadmap/Timeline, Metric Card, Segmented Control (chart range).
- **Required actions:** Import games (secondary); Continue improving (primary); Start session (focus); open any game; View all weaknesses/games.
- **Success criteria:** User can name their #1 weakness and start the recommended action in ≤1 click within 5s of load.

### 4.2 Game Library
- **Purpose:** Fast, keyboard-friendly management of all games — never "just a list."
- **User questions:** Where is game X? Which games show weakness Y? What's analyzed vs pending?
- **Required sections:** Header + import actions; Quick-insight strip (most common mistake / best opening / avg accuracy); Filter toolbar (search, result, color, time control, sort); Collections (saved smart-filters); Table (desktop) / Card list (mobile).
- **Required components:** Quick-insight Metric Card, Search, Segmented Control, Dropdown, Game Row (full), Improvement Tag, Status indicator, Empty/Skeleton states.
- **Required actions:** Import PGN (primary); Connect Chess.com/Lichess (secondary); search; filter; sort; open game; open collection.
- **Success criteria:** Locate any game in ≤2 actions; analysis status of every game is unambiguous at a glance.

### 4.3 Game Import
- **Purpose:** Get games in with zero friction.
- **User questions:** How do I add games? Did it work? What happens next?
- **Required sections:** Source choices (paste PGN, upload file, connect account); paste/drop zone; parsed-preview list; import progress.
- **Required components:** Input (textarea, focus state), Button (primary/secondary), Game Row (preview), Toast, Progress/Status, Empty state.
- **Required actions:** Paste/drop/connect; confirm import; cancel.
- **Success criteria:** A pasted PGN is parsed, previewed, and queued for analysis with clear status; errors are explained and recoverable.

### 4.4 Analysis Workspace — *see §8 (detailed)*
- **Purpose:** Understand a single game; surface turning points and the lesson.
- **User questions:** What happened? Where did I lose advantage? Why was it a mistake? What should I learn?
- **Required sections:** Board + eval bar; player bars + clocks; board controls; eval timeline; Analysis tab (default), Coach tab (peer), Lines tab; accuracy summary; move-quality counts; move-detail card; coach note; move list.
- **Required components:** Board Container, Evaluation Bar, Eval Timeline (sparkline), Tabs, Metric Card, Move-quality chips/dots, Move-detail Insight Card, Coach Card, Move List, board control buttons.
- **Required actions:** Step/jump moves; flip; switch tabs; "best move" reveal; send mistake to Improve.
- **Success criteria:** The single most important turning point and its lesson are visible without scrolling; Coach is one tab away but not default.

### 4.5 Coach
- **Purpose:** On-demand, plain-language explanation and guided review — supporting, not central.
- **User questions:** Why was this a mistake? What's the plan here? Walk me through it.
- **Required sections:** Context header (which game/move/weakness); guided explanation thread; suggested follow-ups; "back to analysis/plan" return.
- **Required components:** Coach Card, Insight Card, Board Container (read-only mini), Button, Input (constrained prompt).
- **Required actions:** Ask a scoped question; expand a point; add insight to Improve plan; return.
- **Success criteria:** Never the first thing a user sees on Analysis; always returns the user to their task; reads as a guide, not a generic chatbot.

### 4.6 Improve Hub — *see §9 (detailed)*
- **Purpose:** The differentiator. Organize all detected weaknesses into a personalized plan.
- **User questions:** What's wrong with my game? What should I work on next? Am I getting better at it?
- **Required sections:** Weekly focus (hero); Skill profile (radar); Weakness profile by category (Tactical/Opening/Endgame/Positional) with filter; Recommended study plan; Milestones.
- **Required components:** Focus Card (hero), Radar Chart, Weakness Category Card, Segmented Control/Filter chips, Study-plan Row, Milestone Timeline, Progress bar.
- **Required actions:** Continue/Start session; filter category; open a weakness; queue/reorder plan.
- **Success criteria:** "What should I work on next?" is answerable in one glance; each weakness links to a concrete training action.

### 4.7 Weakness Profile
- **Purpose:** Deep view of recurring weaknesses ranked by rating impact, with trend.
- **User questions:** Which mistakes repeat? Are they improving? Which costs me most rating?
- **Required sections:** Stat tiles; rating trend; skill radar; ranked weakness list (frequency, trend sparkline, impact, practice CTA); phase accuracy.
- **Required components:** Metric Card, Line Chart, Radar Chart, Weakness Card (full), Sparkline, Progress bar, Coach Card.
- **Success criteria:** Each weakness shows frequency, direction of travel, and a one-click practice entry.

### 4.8 Progress Tracking
- **Purpose:** Make improvement felt over time.
- **User questions:** Is my rating going up? Where am I gaining? What's my streak/peak?
- **Required sections:** Rating-over-time (range switch); accuracy trend; phase accuracy; streak/peak stats; milestones achieved.
- **Required components:** Line Chart, Metric Card, Segmented Control, Progress bar, Milestone Timeline.
- **Success criteria:** Trend direction and the biggest driver of change are obvious; range switch (30d/90d/1y/all) works.

### 4.9 Settings
- **Purpose:** Account, connected platforms, analysis depth, appearance (Accent/Board/Density tweaks), notifications.
- **Required components:** Form rows, Input, Toggle, Segmented Control, Dropdown, Button.
- **Success criteria:** Connected accounts and analysis preferences are editable and persist.

### 4.10 Profile
- **Purpose:** Identity, rating, play history summary, achievements.
- **Required components:** Avatar, Metric Card, Line Chart, Milestone Timeline.
- **Success criteria:** Shows current rating, peak, and headline improvement at a glance.

### 4.11 Mobile equivalents
Every screen has a mobile layout with re-thought hierarchy:
- **Dashboard:** score-first; hero Improvement Score → recommended focus → rating → weaknesses. Bottom tab bar (Home/Games/Analysis/Improve).
- **Analysis:** board + eval first; controls as a full-width row; move-detail card; coach note collapsed; move list below. Tabs become a top segmented control.
- **Improve:** weekly focus first; categories become horizontally-scrolling filter chips; weakness category cards stack; study plan as cards.
- **Game Library:** cards, not a table; search + filter chips; status/tag inline on each card.

---

## 5. Design Tokens

> Implementation-ready. Define as CSS custom properties on `:root` (dark default). Light theme overrides under `[data-theme="light"]`.

### 5.1 Color — Dark (primary)

**Surfaces / background**
```
--bg:            #0C0B0A   /* app background */
--bg-grad:       radial-gradient(1100px 620px at 50% -8%, #16110c, #0C0B0A 58%);
--surface-1:     #131110   /* card base */
--surface-2:     #161412   /* inputs, inset wells */
--surface-3:     #1D1A17   /* secondary buttons, raised */
--surface-elev:  #242019   /* elevated chips/avatars */
--surface-card-grad: linear-gradient(180deg, #1d1714, #131110);  /* standard card fill */
--hairline:      rgba(255,255,255,0.06);   /* dividers */
--border:        rgba(255,255,255,0.08);   /* card borders */
--border-strong: rgba(255,255,255,0.12);   /* secondary button borders */
```

**Text**
```
--text-hi:   #F6F3EE   /* high emphasis / headings */
--text-body: #E9E3D9   /* card body strong */
--text-mid:  #B0A89D   /* body / secondary */
--text-low:  #8F877B   /* muted labels */
--text-faint:#726B61   /* captions, mono labels */
```

**Accent — Ivory** (brand; tweakable — see §5.10)
```
--accent:        #EBD9B8
--accent-bright: #F6F3EE
--on-accent:     #1A1814
--accent-grad:   linear-gradient(135deg, #F6F3EE, #EBD9B8);
--accent-glow:   rgba(224,178,110,0.12);   /* ambient halo / button shadow tint */
```

**Move quality** (the one place color speaks loudly — fixed, never re-themed)
```
--mq-brilliant: #6FBE85   /* !!  */
--mq-best:      #4FB6A8   /* !   */
--mq-good:      #B4AB9C
--mq-inaccuracy:#E0AE45   /* ?!  */
--mq-mistake:   #DD8442   /* ?   */
--mq-blunder:   #D85B4A   /* ??  */
```
Chip pattern: text = color; bg = `color @ 10–12% alpha`; border = `color @ 28–32% alpha`; 7px dot at full color. Emphasis dots may add `box-shadow: 0 0 12px {color}@55%`.

**Semantic**
```
--success: #6FBE85
--warning: #E0AE45
--error:   #D85B4A
--info:    #7BA6C4
```

**Board (Wood — default; Slate/Tournament are tweak options)**
```
--board-light: #E7DDC8
--board-dark:  #8A7C66
--piece-white: #FAF6EE
--piece-black: #2A251E
--board-lastmove: rgba(224,178,90,0.30)
```

### 5.2 Color — Light theme (defined, not primary)
```
--bg:        #F4F1EA   /* warm paper, never cold white */
--surface-1: #FBF9F4
--surface-2: #EDE8DD
--surface-3: #E4DCCB
--text-hi:   #211D17
--text-mid:  #5A5347
--primary-deep: #3A332A
--border:    rgba(28,24,18,0.10)
```
Accent, move-quality, and semantic values are unchanged from dark. Shadows soften (lower alpha).

### 5.3 Typography
**Families**
```
--font-sans: 'Onest', system-ui, sans-serif;     /* everything */
--font-mono: 'JetBrains Mono', ui-monospace, monospace;  /* numbers, ratings, eval, SAN notation, ECO codes */
```
**Scale** (size / weight / line-height / tracking)
| Token | px | weight | line-height | tracking |
|---|---|---|---|---|
| `display` | 40–48 | 700 | 1.04–1.12 | -0.03em |
| `h1` | 34 | 700 | 1.0 | -0.02em |
| `h2` | 24 | 700 | 1.0 | -0.02em |
| `h3` | 18 | 600 | 1.25 | -0.01em |
| `title` | 15–16 | 600–700 | 1.2 | -0.01em |
| `body` | 14 | 400 | 1.55 | 0 |
| `body-sm` | 13 | 400 | 1.5 | 0 |
| `label` | 11 | 600 | 1 | 0.12em, UPPERCASE |
| `caption` | 11–12 | 500 | 1.4 | 0 |
| `data` | 13–30 | 500–600 | 1 | -0.02em | (mono) |

Display headlines may use the gradient-clip treatment: `linear-gradient(118deg,#FFFFFF 18%,#F4E7CF 52%,var(--accent) 96%)` clipped to text. Use sparingly (hero headlines only).

### 5.4 Spacing — 4px base
`4, 8, 12, 16, 20, 24, 28, 32, 40, 48, 56`. Card padding: 20–22px (desktop), 14–16px (mobile). Section gap: 16px between cards, 28–32px between major sections. App content padding: 26–30px desktop, 16px mobile.

### 5.5 Border radius
```
--r-xs: 6px    /* chips, small tags */
--r-sm: 7px    /* segmented items, mono pills */
--r-md: 9–10px /* buttons, inputs, list rows */
--r-lg: 12–14px/* cards */
--r-xl: 16–18px/* hero/section cards */
--r-pill: 999px
```

### 5.6 Elevation & shadows
```
--shadow-card:  inset 0 1px 0 rgba(255,255,255,0.05), 0 12px 32px -18px rgba(0,0,0,0.75);
--shadow-hero:  inset 0 1px 0 rgba(255,255,255,0.06), 0 18px 40px -22px rgba(0,0,0,0.80);
--shadow-pop:   0 20px 50px -12px rgba(0,0,0,0.75);   /* dropdowns, dialogs */
--shadow-accent:0 6px 18px -8px var(--accent-glow);   /* primary button */
--board-shadow: 0 12px 40px -14px rgba(0,0,0,0.60);
```
Shadows are soft and warm-black. **No glow** except the ambient brand halo and explicit accent/move-quality glows.

**Ambient halos** (decorative, `pointer-events:none`, behind content):
- warm: `radial-gradient(ellipse, var(--accent-glow), transparent 68%)`
- cool accents: `rgba(74,150,200,0.11)` and `rgba(79,182,168,0.08)` blobs, large, low-opacity, slow `cmGlow` pulse (§12).

### 5.7 Motion
```
--dur-instant: 120ms  /* hover, press */
--dur-standard:200ms  /* moves, tabs, toggles */
--dur-emphasis:320ms  /* panels, dialogs, reveals */
--ease-standard: cubic-bezier(.2,.7,.2,1);
--ease-out: cubic-bezier(0.16,1,0.3,1);
```

### 5.8 Opacity
```
--op-disabled: 0.45
--op-hairline-fill: 0.018   /* zebra row tint */
--hover-tint: rgba(255,255,255,0.04)   /* row/card hover */
```

### 5.9 Focus & interaction states
```
--focus-ring: 0 0 0 3px rgba(235,217,184,0.12);  /* + 1px solid var(--accent) border on inputs */
```
- **Hover:** surfaces lighten by `--hover-tint`; primary button brightness +4%; links/accents underline-on-hover suppressed (use color shift).
- **Active/pressed:** translateY(0) + reduce shadow one step; 120ms.
- **Selected (nav/segmented/tab):** filled (`accent` bg + `--on-accent` text) OR underline (`2px solid var(--accent)` for tabs) — see component specs.
- **Disabled:** `--op-disabled`, no shadow, no hover.

### 5.10 Theme tweaks (from approved Styleguide props)
Three product-level theme props, each reshapes feel (not single pixels):
- **Accent:** Ivory `#EBD9B8` (default) · Periwinkle `#C7CCFF` · Sage `#BBD0B0` · Clay `#E3B79A`. Drives `--accent`, `--accent-bright`, `--accent-glow`, brand mark, primary buttons, tabs, focus ring, data emphasis.
- **Board theme:** Wood (default) · Slate `#D5D9DF/#6E7682` · Tournament `#ECECD2/#6E8A5A`. Drives board squares, piece tones, last-move tint.
- **Density:** Cozy (max 960) · Comfortable (max 1120, default) · Spacious (max 1280). Drives content max-width and vertical rhythm.

---

## 6. Component Library

> States listed are mandatory. Default = rest. All interactive components require visible focus (`--focus-ring`) and 44px min touch target on mobile.

### Buttons
- **Variants:** Primary (`--accent-grad` fill, `--on-accent` text, `--shadow-accent`); Secondary (`--surface-3` fill, `--border-strong`, `--text-body`); Ghost (transparent, `--text-mid`, hover tint); Accent-bright (solid `--accent-bright`). Sizes: md (11px×18px, `--r-md`), sm (8px×13px, `--r-sm`).
- **States:** rest, hover (+brightness/tint), active (depress, -shadow), focus (ring), disabled (`--op-disabled`), loading (spinner replaces label, width locked).
- **Responsive:** full-width on mobile where it's the screen's primary action.
- **A11y:** real `<button>`; `aria-busy` while loading; label never conveyed by color alone.

### Inputs (text / textarea / search)
- Fill `--surface-2`, `--border`, `--r-md`, text `--text-hi`, placeholder `--text-faint`.
- **States:** rest, hover (border-strong), focus (`1px solid var(--accent)` + `--focus-ring`), error (`--error` border + helper text), disabled.
- Search variant: leading `⌕` glyph, optional trailing `⌘K` kbd hint.

### Cards
- Base: `--surface-card-grad`, `--border`, `--r-lg`, `--shadow-card`. Hero/section: `--r-xl`, `--shadow-hero`, optional ambient halo.
- **Variants:** standard, hero (accent-tinted border `rgba(235,217,184,0.20–.22)` + halo), category (left semantic accent via border color).
- **States:** rest, hover (tint, optional lift on clickable), selected.

### Metric Cards
- Label (`--text-low`, 11–12px) + value (mono, 24–30px, `--text-hi`) + delta (`--success`/`--error`, `▲/▼` + value) + optional sublabel.
- Used in clusters of 2–4 with 8–14px gaps.

### Charts
- **Line Chart** (rating/accuracy trend): SVG polyline, 2px `--accent` stroke, gradient area fill (`--accent` 26%→0%), gridlines `rgba(255,255,255,0.05)`, last-point dot with accent glow. Range via Segmented Control. Mono axis labels `--text-faint`.
- **Radar Chart** (skill profile): 5–6 axes, 4 concentric rings, "you" polygon (accent fill gradient + 2px stroke + vertex dots) over dashed "peers" polygon (`--text-faint`). Axis labels `--text-low` 11px. Provide ≥66px horizontal label margin to prevent clipping.
- **Sparkline** (weakness trend): 70×24 mini line, color = trend semantic (`--success` improving, `--text-low` steady, `--error` worsening) + end dot.
- **Score Ring** (improvement score): SVG donut, 9px stroke, accent gradient arc with drop-shadow glow, centered mono value + "of 100".
- **Progress bar:** 5–8px track `#211d18`, fill = semantic/accent, `--r-pill`, optional glow for emphasis.
- **Eval bar:** vertical 9–11px rail, white fill from bottom = white advantage %, mono eval label above. Conventional orientation.
- All charts: provide `role="img"` + `aria-label` summarizing the trend; never rely on color alone (pair with ▲/▼ and text).

### Tables (Game Library, desktop)
- Header row: `label` style, `--text-faint`, bottom `--hairline`. Body rows: 13px padding, `--hairline` separators, zebra tint `--op-hairline-fill`, hover `--hover-tint`. Columns: result dot · opponent/opening · result · accuracy (mono, right) · improvement tag · status · date (right). Row is a single click target → Analysis.
- **Responsive:** collapses to **Card list** below tablet (never horizontal scroll of the full table).

### Dialogs / Sheets
- **Dialog (desktop):** centered, `--surface-card-grad` panel, `--r-xl`, `--shadow-pop`, scrim `rgba(0,0,0,0.6)`. Focus trapped; `Esc` closes; returns focus to trigger.
- **Sheet (mobile):** bottom sheet, drag handle, same fill; swipe-down/`Esc` dismiss.

### Dropdowns
- Trigger = Secondary-button style with trailing `▾`. Menu: `--surface-3`, `--border`, `--r-md`, `--shadow-pop`, 8px item padding, hover tint, selected = check + accent text. Keyboard navigable.

### Tabs
- Underline style: active = `--text-hi` + `2px solid var(--accent)` bottom border; inactive = `--text-low`. Used in Analysis (Analysis/Coach/Lines). **Analysis is default; Coach is never default.**

### Search
- See Inputs (search variant). Global search opens scoped to games; deep query opens Command Menu.

### Command Menu (`⌘K`)
- Centered overlay dialog; input + grouped results (Go to…, Recent games, Actions like "Import PGN", "Start focus session"). Arrow-key nav, `Enter` executes, `Esc` closes. Mono `⌘K` hint shown in sidebar search.

### Toasts
- Bottom-right (desktop) / bottom (mobile), `--surface-3`, `--border`, `--r-md`, semantic leading dot/icon, auto-dismiss 4s, `aria-live="polite"`. Variants: success/info/error.

### Coach Cards
- Leading 26–30px rounded mark (`linear-gradient(150deg,#2e2920,#161310)` + `✦` in `--accent`); `label` "COACH · {context}" in accent; body `--text-body`. Always visually subordinate (no full-width accent fill, no chat bubbles by default).

### Insight Cards (move-detail / generic)
- Accent-tinted border for emphasis; move-quality chip + SAN (mono) header; plain-language explanation with inline mono SAN; a divider then the "best" alternative (best chip + SAN + one-line rationale + eval). This is the **default** content of the Analysis panel.

### Weakness Cards
- **Full:** icon (semantic-tinted, chess glyph) · name · impact badge (High/Medium/Low) · frequency (mono %) · trend sparkline + direction label · Practice CTA (count). Border tints to `--error` for high-impact.
- **Compact (dashboard):** icon · name · frequency bar · % + trend.
- **Category (Improve):** header (icon, name, phase accuracy, severity badge) + 2–3 sub-weakness rows (name, one-line, severity tag).

### Progress Cards
- Metric Card + inline trend (sparkline or bar) + optional milestone reference.

### Game Rows
- **Full (table):** see Tables. Includes result dot (semantic + glow), opponent (+ color chip W/B), ECO + opening (mono ECO), result, accuracy, improvement tag, status, date.
- **Compact (dashboard):** result dot · vs opponent + opening · improvement tag · accuracy · relative time.

### Analysis Panels
- Right-column container hosting Tabs → (Analysis | Coach | Lines), accuracy summary Metric Cards, move-quality counts, Insight Card, Coach note, Move List. Scrolls independently of board column.

### Evaluation Components
- Eval Bar (§Charts), Eval Timeline (game-length sparkline with current-move marker + dashed playhead), numeric eval (mono, e.g. `+0.6`). Conventional, never reinvented.

### Board Containers
- 8×8 CSS grid, `aspect-ratio:1/1`, `--r-lg`, `--board-shadow`. Squares from board tokens; last-move tint overlay; rank/file coordinates (mono, low-opacity, a-file/rank conventions). Pieces = Unicode glyphs with subtle text-shadow. Read-only mini variant for Coach.

### Navigation Components
- **Sidebar (desktop):** brand mark, search (`⌘K`), nav items (icon + label, active = accent-tinted fill + border, optional count badge), Collections group (Library), user block pinned bottom.
- **Bottom tab bar (mobile):** 4 items (Home/Games/Analysis/Improve), active = accent icon + `--text-hi` label, 64px tall, top `--hairline`.

### Loading / Empty / Error / Skeleton states
- **Skeleton:** `--surface-2` blocks with subtle shimmer (200ms-feel, reduced-motion: static), matching final layout boxes (cards, rows, chart area). Used while analysis/data loads.
- **Loading (inline):** small accent spinner; charts show skeleton chart area.
- **Empty:** centered icon + one-line explanation + single primary action (e.g. Games empty → "Import your first game"). Never a blank region.
- **Error:** semantic `--error` accented card, plain-language cause + recovery action (Retry / Reconnect). Errors are explained, never raw codes.

---

## 7. Dashboard Specification

### Layout hierarchy (desktop, app shell = sidebar 232px + content)
1. **Greeting row:** "Good evening, {name}" (h2) + subtext; right-aligned actions — Secondary "Import games" + Primary "Continue improving →".
2. **Top row (2 cols):** left = **Improvement Score** hero card (300px: Score Ring 108px + driver text + 2 inline Metric Cards: last-game accuracy, streak). Right = **Rating trend** card (flex): header (mono 1487, +63, peak) + range Segmented Control (30d/90d/1y) + Line Chart + mono month axis.
3. **Middle row (2 cols):** left = **Biggest weaknesses** card (top 3 compact Weakness Cards: icon, name, frequency bar, % + trend) + "View all →". Right = **Recommended this week** focus card (340px, hero treatment: ✦ label, title, rationale, Primary "Start session" + ~time).
4. **Bottom row (2 cols):** left (1.4fr) = **Recently analyzed** (5 compact Game Rows + "All games →"). Right (1fr) stacked: **Coach summary** card + **Improvement roadmap** Timeline (done/in-progress/target nodes).

### Grid
12-col fluid inside content; explicit flex ratios above. Card gap 16px; section gap as rows. Respects Density max-width (§5.10).

### Interaction behavior
- Range Segmented Control re-renders Line Chart (200ms).
- Any Game Row → Analysis. Any weakness → Weakness Profile/Improve. Focus "Start session" → Improve training. "Continue improving" → the single highest-priority next action (focus session).

### Responsive
- **Laptop (≤1280):** density Comfortable; rows may wrap top→stack.
- **Tablet (≤1024):** sidebar collapses to icon rail or top bar; 2-col rows become 1-col stacks in priority order.
- **Mobile (≤640):** score-first single column (Score hero → Recommended focus → Rating chart → Weaknesses → [Coach/roadmap optional]); bottom tab bar replaces sidebar.

### States
- **Loading:** skeletons for Score Ring (circle), chart area, weakness rows, game rows.
- **Empty (new user, 0 games):** Score/weaknesses replaced by an onboarding focus card → "Import your first game" primary; rating chart shows empty illustration + caption.
- **Error (data fetch):** per-card error state with Retry; never blanks the whole screen.
- **Success:** populated as specified.

### Data hierarchy & rationale
Order encodes priority: **how am I doing** (score+rating) → **what's wrong** (weaknesses) → **what next** (focus) → **what changed** (recent games) → **where am I headed** (roadmap). Coach is a summary block, never the lead.

---

## 8. Analysis Workspace Specification (detailed)

### Columns (desktop, within app shell)
- **Board column (fixed ~720px):** opponent bar (avatar, name, mono rating·color, clock) → Board + Eval Bar (12px rail left of board) → your bar → **controls row** (⏮ ‹ › ⏭ as 38px buttons; current-step button uses Primary fill; right side: Flip, material indicator) → **Eval Timeline** card (label + mono current move + sparkline with playhead).
- **Analysis column (fluid):** **Tabs** (Analysis | Coach | Lines) → divider → **accuracy summary** (2 Metric Cards: your acc + delta, opponent acc) → **move-quality counts** (mono dot+count chips) → **Insight Card** (move-detail, default) → **Coach note** (subordinate Coach Card) → **Move List** (scrolls; 2-column SAN per move number, mono, current move highlighted with accent tint + border, quality dot per move).

### Tabs behavior — **critical**
- **Analysis** is the **default** active tab. It shows insights (move-detail Insight Card) first.
- **Coach** is a **peer tab**, never auto-selected. Selecting it shows guided explanation for the current move/turning point; deselecting returns to Analysis.
- **Lines** shows engine variations (mono SAN trees) for users who want depth.

### Board & evaluation
- Conventional board (board tokens, coordinates, last-move tint). Eval bar conventional (white from bottom). Numeric eval mono. Move navigation = conventional ⏮‹›⏭ + arrow keys (`←/→` step, `↑/↓` jump to start/end), `f` flips. **Do not reinvent.**

### Turning points
- Eval Timeline marks the current move (dashed playhead + accent dot); large swings render as steeper segments. A "turning points" affordance jumps between the game's biggest eval swings (the moves that decided the game).

### Engine status
- Small status pill near eval (e.g. "Even material", depth indicator). While analyzing: progress/skeleton in the analysis column; eval shows indeterminate until ready.

### Interaction flows
- Step move → board, eval bar, eval timeline marker, Insight Card, and move-list highlight all update in lockstep (200ms).
- Click a move in the list → jump to that position.
- "Best move" reveal in Insight Card → shows alternative + eval.
- "Send to Improve" on a mistake → adds the motif to the weakness/plan and toasts confirmation.

### Tablet layout
- Board column shrinks; analysis column moves **below** the board (single scroll) OR a 60/40 split if width ≥900px. Tabs persist.

### Mobile layout
- Board + Eval Bar first (full width). Controls as one full-width row (⏮ ‹ [Next ›] ⏭, Next is Primary). Tabs become a top **segmented control**. Insight Card next; Coach note collapsed (tap to expand); Move List below. Bottom tab bar for app nav.

### State transitions
- **Loading (analysis running):** board renders immediately from PGN; eval/insights show skeletons; eval bar indeterminate; tab content = skeleton.
- **Failure (analysis failed):** error card in analysis column with cause + Retry; board remains usable for manual stepping.
- **Empty (no mistakes / clean game):** Insight Card shows a positive state ("Clean game — 91% accuracy") with the best moment highlighted, not a blank.

---

## 9. Improve Hub Specification (detailed)

### Sections (desktop)
1. **Header:** "Your improvement plan" (h2) + provenance ("Built from N analyzed games · refreshes as you play").
2. **Weekly focus (hero, 1.4fr):** ✦ "Weekly focus · week N" label; title (h2, e.g. "Convert winning endgames"); rationale tied to the user's data; 2 Metric Cards (sessions done X/5, phase-accuracy delta) + Primary "Continue · session N". Ambient accent halo.
3. **Skill profile (1fr):** Radar Chart (Tactics/Openings/Middlegame/Endgame/Positional/Time) — "you" vs dashed "peers", legend.
4. **Weakness profile:** title + **category filter** Segmented Control (All/Tactical/Opening/Endgame/Positional) → 2×2 grid of **Weakness Category Cards** (header: icon, category, phase accuracy, severity badge; 2 sub-weakness rows with severity tags). Focus/weakest category border-tints `--error`.
5. **Recommended study plan (1.4fr):** ordered list of **Study-plan Rows** (icon by type, title, description, est. time, status: Next/Queued). First item highlighted (teal-tinted) as the next action.
6. **Milestones (1fr):** Timeline (achieved ✓ green, in-progress accent node + %, future hollow).

### Pattern detection → action mapping
Each detected weakness carries: category, severity (High/Medium/Low by rating impact), frequency, trend, and a **linked training action** (drill set / replay-your-games / tactics set / coach review). The Study Plan is the ordered materialization of these actions for the current week.

### From insight to improvement (explicit path)
```
Analysis finds a mistake
  → motif tagged to a Weakness (category + severity)
  → Weakness ranked by rating impact in Weakness Profile
  → highest-impact weakness becomes Weekly Focus
  → Focus expands into ordered Study Plan actions (drills + replays)
  → completing sessions updates phase accuracy + Milestones
  → progress shown on Dashboard (score, trend, weakness ▼)
  → loop repeats with refreshed data
```

### Goals & milestones
- **Weekly goals:** the Weekly Focus + its 5 sessions; progress bar X/5.
- **Monthly goals:** milestone targets (e.g. "Endgame conversion 80%", "Reach 1550"); shown on Milestone Timeline with current value vs target.

### Action hierarchy
One Primary per view = "Continue/Start session" on the Weekly Focus. Category cards and study rows are secondary entries. Never present competing primary actions.

### Responsive
- **Mobile:** weekly focus first (with X/5 progress bar + Primary); categories become horizontal filter chips; category cards stack; study plan as cards; radar may move below or into Progress. Bottom tab bar.

---

## 10. Responsive System

### Breakpoints
```
desktop:  ≥1280px   (sidebar 232px, multi-col rows, density Comfortable/Spacious)
laptop:   1024–1279  (sidebar persists, rows may wrap)
tablet:   768–1023   (sidebar → icon rail or top bar; 2-col → 1-col stacks)
mobile:   ≤767       (bottom tab bar; single column; re-thought hierarchy)
```

### Layout shifts
- Multi-column card rows collapse to single-column **in priority order** (never reflow arbitrarily).
- Game Library **table → card list** at ≤767.
- Analysis **side-by-side → board-then-panel stack**; tabs → segmented control on mobile.
- Improve category **grid → chips + stack**.

### Navigation behavior
- Desktop/laptop: persistent left sidebar.
- Tablet: collapsible icon rail or top bar with overflow.
- Mobile: fixed bottom tab bar (Home/Games/Analysis/Improve); Coach reachable from contextual entry points.

### Component adaptation rules
- Buttons that are a screen's primary action go full-width on mobile.
- Card padding 20–22 → 14–16 on mobile; section gaps tighten one step.
- Charts keep aspect but reduce label density; radar guarantees label margins.

### Touch interactions
- Min target 44×44. Filter chips horizontally scrollable. Bottom sheets replace dropdowns/dialogs. Swipe-down dismiss on sheets. No hover-only affordances.

---

## 11. Accessibility

- **Keyboard navigation:** every interactive element tabbable in logical order; `⌘K` command menu; Analysis supports `←/→` step, `↑/↓` start/end, `f` flip; dialogs trap focus, `Esc` closes and restores focus to trigger.
- **Focus management:** visible `--focus-ring` on all focusable elements (never `outline:none` without replacement); route changes move focus to the new screen's `h1/h2`.
- **Contrast:** body text and essential UI meet WCAG AA (≥4.5:1) on their surface; `--text-faint` reserved for non-essential captions only. Move-quality and semantic meaning is never conveyed by color alone — always paired with text/symbol (`!!`, `?`, ▲/▼, label).
- **Screen-reader support:** charts expose `role="img"` + descriptive `aria-label` (trend summary); icon-only buttons have `aria-label`; status uses `aria-live` (toasts `polite`, errors `assertive`); board squares/pieces have textual equivalents (SAN move log is the accessible source of truth).
- **Motion reduction:** honor `prefers-reduced-motion` — disable ambient halo pulse, skeleton shimmer, and non-essential transitions; keep instantaneous state changes.
- **ARIA expectations:** tabs use `role="tablist"/"tab"/"tabpanel"` with `aria-selected`; segmented controls as radio groups; dialogs `role="dialog" aria-modal="true"`; nav as `<nav>` with `aria-current="page"`.

---

## 12. Motion System

### Timing & easing
Use `--dur-*` and `--ease-*` from §5.7. Default transition: `200ms var(--ease-standard)`.

### Usage by type
- **Hover:** 120ms tint/brightness; no movement except optional 1px lift on clickable cards.
- **Press/active:** 120ms depress + shadow step-down.
- **Tabs/segmented/toggle:** 200ms; selected indicator slides/fades.
- **Page transitions:** 320ms content fade/slide-up (8–12px) on route change; respects reduced-motion.
- **Loading animations:** accent spinner (linear, ~800ms/rev); chart area skeleton.
- **Skeleton:** subtle shimmer sweep (~1.2s loop); static under reduced-motion.
- **Micro-interactions:** move-quality dot/score-ring arc may animate in over 320ms on first reveal; eval bar fills 200ms on move change; number counters may tween ≤320ms (skip under reduced-motion).
- **Ambient halo:** `cmGlow` opacity 0.5→0.85 over 7–13s, infinite, decorative only.

### Rules
1. Motion **confirms**, it never performs. No bounce, no parallax, no decorative entrance choreography.
2. Nothing essential is gated behind animation — content is usable immediately.
3. Every motion has a functional reason (state change, spatial continuity, progress feedback).
4. Respect `prefers-reduced-motion` everywhere.

---

## 13. Implementation Priorities

### Phase 1 — Foundation
- **Goals:** Token system (CSS vars, dark + light), typography, base primitives (Button, Input, Card, Metric Card, Badge/Chip, Progress bar), theme tweaks (Accent/Board/Density), motion + focus utilities.
- **Dependencies:** none.
- **Acceptance:** Styleguide reproduced 1:1 from tokens; theme switch recolors accent/board/density live; AA contrast verified.

### Phase 2 — Navigation & shell
- **Goals:** App shell (sidebar + content), bottom tab bar, Command Menu (`⌘K`), Search, routing, responsive shell behavior.
- **Dependencies:** Phase 1.
- **Acceptance:** Navigate all five destinations; `⌘K` opens/searches/executes; shell adapts across breakpoints; `aria-current` correct.

### Phase 3 — Dashboard
- **Goals:** Score Ring, Line Chart, compact Weakness/Game Rows, Focus Card, Coach Card, Roadmap; full Dashboard with loading/empty/error/success.
- **Dependencies:** Phases 1–2.
- **Acceptance:** Matches §7 hierarchy; range switch works; all four states implemented; mobile score-first order correct.

### Phase 4 — Analysis Workspace
- **Goals:** Board Container, Eval Bar, Eval Timeline, Tabs (Analysis default / Coach peer / Lines), Insight Card, Move List, controls, keyboard nav.
- **Dependencies:** Phases 1–3.
- **Acceptance:** Matches §8; Analysis is default, Coach never auto-opens; move stepping syncs all panels; loading/failure/clean-game states implemented; mobile stack + segmented tabs.

### Phase 5 — Improve Hub
- **Goals:** Radar Chart, Weakness Category Cards, Weekly Focus hero, Study-plan Rows, Milestone Timeline, category filter; Weakness Profile + Progress Tracking sub-views.
- **Dependencies:** Phases 1–4 (consumes Analysis-tagged motifs).
- **Acceptance:** Matches §9; insight→action path functional; one primary action per view; mobile chips + stacks.

### Phase 6 — Polish
- **Goals:** Game Library table/cards + Import flow + Collections; Settings; Profile; Toasts; all empty/skeleton/error states; reduced-motion pass; full a11y audit.
- **Dependencies:** Phases 1–5.
- **Acceptance:** Every screen meets §15 Definition of Done; library table↔cards responsive; import parses/previews/queues; a11y + reduced-motion verified.

---

## 14. Engineering Rules (binding)

1. **Never invent UI.** If a pattern isn't in this spec or the approved mockups, stop and ask — do not improvise.
2. **Never redesign approved screens.** Layout, hierarchy, spacing, and component choices are final.
3. **Never change IA** (nav order, destinations, screen purposes) without explicit approval.
4. **Reuse components before creating new ones.** Compose from §6; a new component requires justification.
5. **Tokens only.** No hard-coded colors/spacing/radii/shadows outside the token system. No new colors; saturated color is limited to move-quality + semantic.
6. **Preserve chess conventions.** Board, coordinates, notation (SAN), eval bar, and move navigation are conventional and must not be reinvented.
7. **Coach stays secondary.** Coach is a peer tab/panel and contextual feature — never the default Analysis view, never a full-screen chatbot, never visually dominant.
8. **Improvement is primary to statistics.** Lead with insight + next action; numbers support, never headline alone.
9. **Every screen answers "what next?"** with exactly one primary action.
10. **Mobile is re-thought, not shrunk.** Follow the mobile hierarchies in §§4,7,8,9,10.
11. **Accessibility is not optional.** Meet §11 for every component and screen.
12. **All four data states** (loading/empty/error/success) are required for any data-backed surface — no blank regions.
13. **Respect `prefers-reduced-motion`** and the motion rules in §12.
14. **Mono for data.** Ratings, eval, %, SAN, ECO, clocks, dates use `--font-mono`.

---

## 15. Definition of Done (per screen)

A screen is **done** only when all five are true:

**A. Visual completion**
- Matches approved mockup: layout, hierarchy, spacing, tokens, type, elevation, gradients/halos.
- Uses only tokenized values; no off-system colors; move-quality/semantic usage correct.

**B. Functional completion**
- All specified actions work and route correctly through the improvement loop.
- Exactly one primary action; secondary/tertiary actions correct.
- Data binds correctly; mono used for all data values; charts reflect data accurately.

**C. Responsive completion**
- Correct behavior at desktop/laptop/tablet/mobile breakpoints.
- Mobile uses the re-thought hierarchy (not a scaled desktop); 44px touch targets; table↔card and tabs↔segmented adaptations applied.

**D. Accessibility completion**
- Full keyboard operability + visible focus; logical tab order; route focus management.
- AA contrast; meaning never color-only; charts/icons labeled; ARIA roles correct; `aria-live` for async.
- `prefers-reduced-motion` honored.

**E. Production readiness**
- All four states implemented (loading/skeleton, empty, error w/ recovery, success).
- No console errors; no layout shift on load beyond skeleton→content; assets/fonts loaded (Onest + JetBrains Mono).
- Theme tweaks (Accent/Board/Density) apply without breakage.

---

*End of specification. This document, with the approved mockups, is sufficient for a senior frontend engineer to implement ChessMate without ambiguity.*
