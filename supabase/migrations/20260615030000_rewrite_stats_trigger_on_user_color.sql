/*
  # Rewrite update_user_statistics to consume games.user_color

  Supersedes the 20260615000000 trigger which case-insensitively
  matched display_name against PGN player strings inside the
  function — exactly the brittleness the column was added to fix.

  Now: every aggregate that depends on "which side was the user
  playing?" reads games.user_color directly. Games with
  user_color = NULL are excluded from the color split and from
  W/L/D so the trigger never lies; StatsDashboard surfaces a
  "set display name to resolve color" hint instead.
*/

CREATE OR REPLACE FUNCTION update_user_statistics()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id uuid;
BEGIN
  IF (TG_OP = 'DELETE') THEN
    v_user_id := OLD.user_id;
  ELSE
    v_user_id := NEW.user_id;
  END IF;

  INSERT INTO user_statistics (
    user_id,
    total_games_analyzed, average_accuracy, total_mistakes, total_blunders,
    games_as_white, games_as_black, wins, losses, draws,
    last_updated
  )
  SELECT
    v_user_id,
    COALESCE((SELECT COUNT(*) FROM game_analysis_results WHERE user_id = v_user_id), 0),
    COALESCE((SELECT AVG(accuracy) FROM game_analysis_results WHERE user_id = v_user_id), 0),
    COALESCE((SELECT SUM(mistakes) FROM game_analysis_results WHERE user_id = v_user_id), 0),
    COALESCE((SELECT SUM(blunders) FROM game_analysis_results WHERE user_id = v_user_id), 0),

    -- Color split: only games with a resolved user_color are counted.
    (SELECT COUNT(*) FROM games
       WHERE user_id = v_user_id AND user_color = 'white'),
    (SELECT COUNT(*) FROM games
       WHERE user_id = v_user_id AND user_color = 'black'),

    -- W / L / D from the user's perspective. Games with NULL user_color
    -- contribute to none of these — the trigger never guesses.
    (SELECT COUNT(*) FROM games
       WHERE user_id = v_user_id AND (
         (user_color = 'white' AND result = '1-0') OR
         (user_color = 'black' AND result = '0-1')
       )),
    (SELECT COUNT(*) FROM games
       WHERE user_id = v_user_id AND (
         (user_color = 'white' AND result = '0-1') OR
         (user_color = 'black' AND result = '1-0')
       )),
    (SELECT COUNT(*) FROM games
       WHERE user_id = v_user_id
         AND user_color IN ('white', 'black')
         AND result = '1/2-1/2'),

    now()
  ON CONFLICT (user_id) DO UPDATE SET
    total_games_analyzed = EXCLUDED.total_games_analyzed,
    average_accuracy     = EXCLUDED.average_accuracy,
    total_mistakes       = EXCLUDED.total_mistakes,
    total_blunders       = EXCLUDED.total_blunders,
    games_as_white       = EXCLUDED.games_as_white,
    games_as_black       = EXCLUDED.games_as_black,
    wins                 = EXCLUDED.wins,
    losses               = EXCLUDED.losses,
    draws                = EXCLUDED.draws,
    last_updated         = now();

  IF (TG_OP = 'DELETE') THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
