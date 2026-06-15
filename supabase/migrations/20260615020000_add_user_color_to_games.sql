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

-- Backfill: best-effort using existing data. Mirrors the runtime
-- detectUserColor() logic — case-insensitive exact match against
-- display_name first, then the email local-part. Anything ambiguous
-- stays NULL so the UI can still flag the user to set a name.

UPDATE games AS g
SET user_color = 'white'
FROM profiles p
WHERE g.user_color IS NULL
  AND g.user_id = p.id
  AND p.display_name IS NOT NULL
  AND LOWER(TRIM(p.display_name)) <> ''
  AND LOWER(TRIM(g.white_player)) = LOWER(TRIM(p.display_name));

UPDATE games AS g
SET user_color = 'black'
FROM profiles p
WHERE g.user_color IS NULL
  AND g.user_id = p.id
  AND p.display_name IS NOT NULL
  AND LOWER(TRIM(p.display_name)) <> ''
  AND LOWER(TRIM(g.black_player)) = LOWER(TRIM(p.display_name));

UPDATE games AS g
SET user_color = 'white'
FROM profiles p
WHERE g.user_color IS NULL
  AND g.user_id = p.id
  AND p.email IS NOT NULL
  AND LOWER(TRIM(g.white_player)) = LOWER(SPLIT_PART(p.email, '@', 1));

UPDATE games AS g
SET user_color = 'black'
FROM profiles p
WHERE g.user_color IS NULL
  AND g.user_id = p.id
  AND p.email IS NOT NULL
  AND LOWER(TRIM(g.black_player)) = LOWER(SPLIT_PART(p.email, '@', 1));
