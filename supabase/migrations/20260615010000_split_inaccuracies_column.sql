/*
  # Split inaccuracies out of the mistakes column

  After the H-2 fix, BulkAnalysis was bundling Lichess "inaccuracy"
  and "mistake" classifications together into game_analysis_results.mistakes.
  That makes the mistake count semi-meaningful but kills the ability
  to display a real three-category pie (blunders / mistakes /
  inaccuracies) in ProgressBar.

  This migration adds an `inaccuracies` column so BulkAnalysis can
  persist the buckets separately. Existing rows default to 0; old
  data continues to render correctly (mistakes column still holds
  the previously-bundled count). Re-running analysis on a game
  refreshes both columns to the new semantics (mistakes = mistake
  bucket only, inaccuracies = inaccuracy bucket).

  StatsDashboard "Mistakes" totals will read slightly lower for
  re-analyzed games (no longer includes inaccuracies). Intentional.
*/

ALTER TABLE game_analysis_results
  ADD COLUMN IF NOT EXISTS inaccuracies int DEFAULT 0;
