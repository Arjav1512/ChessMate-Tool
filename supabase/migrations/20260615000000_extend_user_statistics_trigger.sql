/*
  # Extend update_user_statistics to populate W/L/D and color split

  The original trigger only updated total_games_analyzed, average_accuracy,
  total_mistakes, total_blunders. wins / losses / draws / games_as_white /
  games_as_black stayed 0 forever, so user_statistics could not be trusted
  for those columns.

  Strategy: match the user's profiles.display_name (case-insensitive)
  against games.white_player / black_player. This is the same match
  StatsDashboard does on the client; centralising it server-side keeps
  the DB column consistent with the UI fallback.

  Also adds a games trigger so that importing or deleting games refreshes
  the same row — otherwise the stats only update on analysis.
*/

CREATE OR REPLACE FUNCTION update_user_statistics()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id     uuid;
  v_display     text;
  v_dn          text;          -- lower-cased display_name, '' if absent
BEGIN
  -- NEW.user_id exists on INSERT/UPDATE; OLD.user_id on DELETE.
  -- Both game_analysis_results and games rows carry user_id.
  IF (TG_OP = 'DELETE') THEN
    v_user_id := OLD.user_id;
  ELSE
    v_user_id := NEW.user_id;
  END IF;

  SELECT display_name INTO v_display FROM profiles WHERE id = v_user_id;
  v_dn := LOWER(COALESCE(v_display, ''));

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

    -- Color split: only counted when display_name is set and matches.
    CASE WHEN v_dn = '' THEN 0 ELSE
      (SELECT COUNT(*) FROM games
        WHERE user_id = v_user_id AND LOWER(white_player) = v_dn)
    END,
    CASE WHEN v_dn = '' THEN 0 ELSE
      (SELECT COUNT(*) FROM games
        WHERE user_id = v_user_id AND LOWER(black_player) = v_dn)
    END,

    -- W / L / D: user-color-aware when display_name matches a side,
    -- fall back to raw result counting otherwise (matches the UI fallback
    -- in StatsDashboard.tsx).
    CASE WHEN v_dn = '' THEN
      (SELECT COUNT(*) FROM games WHERE user_id = v_user_id AND result = '1-0')
    ELSE
      (SELECT COUNT(*) FROM games WHERE user_id = v_user_id AND (
        (LOWER(white_player) = v_dn AND result = '1-0') OR
        (LOWER(black_player) = v_dn AND result = '0-1')
      ))
    END,
    CASE WHEN v_dn = '' THEN
      (SELECT COUNT(*) FROM games WHERE user_id = v_user_id AND result = '0-1')
    ELSE
      (SELECT COUNT(*) FROM games WHERE user_id = v_user_id AND (
        (LOWER(white_player) = v_dn AND result = '0-1') OR
        (LOWER(black_player) = v_dn AND result = '1-0')
      ))
    END,
    CASE WHEN v_dn = '' THEN
      (SELECT COUNT(*) FROM games WHERE user_id = v_user_id AND result = '1/2-1/2')
    ELSE
      (SELECT COUNT(*) FROM games
        WHERE user_id = v_user_id AND result = '1/2-1/2'
          AND (LOWER(white_player) = v_dn OR LOWER(black_player) = v_dn))
    END,

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

-- Existing trigger on game_analysis_results stays (created in the
-- 20251018000000 migration). Add a games trigger so importing or deleting
-- games also refreshes the row — otherwise W/L/D stays stale until the
-- next analysis.
DROP TRIGGER IF EXISTS update_stats_after_game_change ON games;
CREATE TRIGGER update_stats_after_game_change
  AFTER INSERT OR UPDATE OR DELETE ON games
  FOR EACH ROW
  EXECUTE FUNCTION update_user_statistics();
