# ChessMate — Product Context

## Product Purpose
ChessMate is a web-based AI-powered chess analysis and coaching platform. Users import their own games (PGN format), analyze them move-by-move with the Stockfish engine, ask an AI coach (powered by Gemini) questions about positions and strategy, and track their improvement over time via statistics and progress charts.

## Register
product

## Users
- Intermediate to advanced chess players (ELO 800–2000) who want to improve their game
- Players frustrated by surface-level feedback — they want deep, position-specific coaching
- People who already play on chess.com or Lichess and want a dedicated analysis tool for their saved games
- Age range: 16–45, mostly male, technically comfortable

## Brand Tone
- Expert, precise, analytical — not casual or playful
- Chess carries weight and intelligence — the product should feel the same
- Confident without being arrogant
- Clean and focused — no marketing fluff, no unnecessary decoration
- Feels like a serious tool, not a game

## Anti-references (what this should NOT look like)
- Generic SaaS landing page aesthetic (gradient hero, three feature cards, testimonials)
- Neon/cyberpunk gaming aesthetic
- Overcrowded dashboard with widgets everywhere
- Cute, playful, colorful EdTech apps
- Purple/blue "AI product" gradient aesthetic

## Strategic Principles
- The chess board is the hero — everything else serves it
- AI coaching is the differentiator — make it feel like a real coach, not a chatbot
- Data should inform, not overwhelm — stats are a tool for improvement, not vanity metrics
- Serious chess players notice quality — every detail matters

## Key Flows
1. Import PGN (file upload or paste) → game appears in sidebar
2. Select game → board renders with move navigator, engine eval, move list
3. Navigate moves with arrows or click → board updates, eval gauge updates, analysis re-runs
4. Ask AI coach a question → structured markdown response in chat panel
5. Run bulk analysis → all games analyzed, stats updated
6. View statistics / progress → charts and metrics

## Surfaces
- Auth screen (sign in / sign up / OAuth)
- Main app shell (sticky nav, sidebar, main content)
- Game viewer (board + eval gauge + right panel + chat)
- Analyze Games modal (board analysis + bulk analysis)
- Statistics modal
- Progress modal
- Configuration screen (missing env vars)
