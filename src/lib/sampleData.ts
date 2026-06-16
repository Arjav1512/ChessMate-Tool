/**
 * Bundled sample data used by empty-state UIs so a brand-new user can
 * try ChessMate without finding their own PGN first.
 */

export const SAMPLE_PGN = `[Event "Sample Game — Ruy López"]
[Site "ChessMate"]
[Date "2024.01.15"]
[White "ChessMate"]
[Black "Sample Opponent"]
[Result "1-0"]

1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7
6. Re1 b5 7. Bb3 d6 8. c3 O-O 9. h3 Nb8 10. d4 Nbd7
11. Nbd2 Bb7 12. Bc2 Re8 13. Nf1 Bf8 14. Ng3 g6
15. a4 c5 16. d5 c4 17. Bg5 h6 18. Be3 Nc5 19. Qd2 h5 1-0`;

export const COACH_STARTER_PROMPTS = [
  'Walk me through the critical moment of this game.',
  "What's the best move in this position, and why?",
  'Was my opening choice solid? Where could I improve it?',
  'Show me the typical plan for both sides here.',
  'Find my biggest mistake and how I should have played instead.',
] as const;
