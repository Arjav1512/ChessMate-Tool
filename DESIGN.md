# ChessMate — Design System

## Theme
Dark-first. The physical scene: a chess player at night, focused on their board, no distractions. Deep charcoal backgrounds that don't strain eyes during long analysis sessions. This is a focused work environment.

## Color Tokens (current — needs upgrade)
```
--cm-bg-base:      #0C0E12   /* near-black background */
--cm-bg-surface:   #13161C   /* card/panel surface */
--cm-bg-elevated:  #1A1D24   /* elevated elements */
--cm-bg-hover:     #20242D
--cm-bg-active:    #262B35

--cm-border-subtle:  #252830
--cm-border-default: #32363F
--cm-border-strong:  #454A56

--cm-text-primary:   #F1F3F6
--cm-text-secondary: #9499A5
--cm-text-muted:     #5C6070

--cm-accent:         #F0A840   /* amber gold */
--cm-accent-hover:   #E8972A
--cm-accent-dim:     rgba(240,168,64,0.12)
--cm-accent-ring:    rgba(240,168,64,0.35)

--cm-success:        #3DB87A
--cm-error:          #E8554A
--cm-info:           #4A90E2

--cm-board-light:    #F0D9B5   /* classic chess board */
--cm-board-dark:     #B58863
```

## Typography (current — needs upgrade)
- Primary: system font stack (generic — needs a real font)
- Mono: system monospace (for chess notation, FEN, move lists)
- No custom font loaded currently

## Layout
- 56px sticky header
- 300px fixed sidebar (game list)
- Fluid main content area
- Modals use backdrop blur overlay

## Components
- Chess board: 8×8 grid, 60px cells, coordinate labels
- Evaluation gauge: 28px vertical bar
- Move navigator: 4 buttons (start/prev/next/end)
- Chat: right-aligned user bubbles, left-aligned AI responses
- Game cards: hover reveals delete button

## Known Design Weaknesses
- Generic system font with no character
- The amber accent is the right idea but needs refinement
- Borders are subtly visible but not atmospheric enough
- Cards feel flat — no depth or material quality
- Chess board is functional but not visually premium
- No entry animations — everything appears instantly
- Icons are standard Lucide (too thick, too generic)
- Buttons lack tactile feedback
- No skeleton loaders — circular spinners everywhere
