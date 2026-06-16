/*
  # Persist the user's color per game

  H-4 and H-7 were the same root problem: matching profiles.
  display_name against games.white_player / black_player strings at
  read time. PGN headers rarely match a display_name verbatim
  (ratings, titles, handles vs real names), so most games fell to
  fallback paths that quietly miscounted W/L/D.

  Persist the answer at import time instead. Apps populate user_color
  by comparing PGN headers against display_name AND email prefix when
  the row is inserted; if neither candidate matches confidently the
  column stays NULL and the UI surfaces a "set display name" prompt
  rather than guessing.
*/

ALTER TABLE games
  ADD COLUMN IF NOT EXISTS user_color text;

ALTER TABLE games
  DROP CONSTRAINT IF EXISTS games_user_color_check;
ALTER TABLE games
  ADD CONSTRAINT games_user_color_check
  CHECK (user_color IN ('white', 'black') OR user_color IS NULL);

CREATE INDEX IF NOT EXISTS idx_games_user_color
  ON games(user_id, user_color);

-- NO BACKFILL. Deliberate.
--
-- A previous revision of this migration ran four UPDATE statements
-- that reproduced the runtime detectUserColor() logic in SQL —
-- LOWER + TRIM + SPLIT_PART. That created two sources of truth: SQL
-- and src/lib/userColor.ts. The two would drift the moment
-- detectUserColor's normalisation grew (it already strips "(1500)"
-- and " 1500" rating tails; the SQL did not), and identical PGN
-- headers would resolve to different user_color values depending on
-- whether the row arrived through backfill or through a fresh
-- import. That is exactly the brittleness the column was added to
-- kill.
--
-- Pre-existing rows therefore keep user_color = NULL. They surface
-- to the user via the "N games have no detected color" banner in
-- StatsDashboard; resolving them is a re-import, not a SQL job.
--
-- If an automatic backfill is ever wanted, the only acceptable path
-- is a one-off Node script that imports and reuses detectUserColor
-- from src/lib/userColor.ts — not a SQL reimplementation.
