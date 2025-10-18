/*
  # Add User Statistics and Analytics

  1. New Tables
    - `game_analysis_results`
      - `id` (uuid, primary key)
      - `game_id` (uuid, foreign key to games)
      - `user_id` (uuid, foreign key to auth.users)
      - `accuracy` (decimal) - Overall game accuracy percentage
      - `total_moves` (int) - Total moves in the game
      - `mistakes` (int) - Number of mistakes
      - `blunders` (int) - Number of blunders
      - `good_moves` (int) - Number of good moves
      - `best_moves` (int) - Number of best moves
      - `average_centipawn_loss` (decimal) - Average evaluation loss
      - `analyzed_at` (timestamptz)

    - `user_statistics`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users, unique)
      - `total_games_analyzed` (int)
      - `average_accuracy` (decimal)
      - `total_mistakes` (int)
      - `total_blunders` (int)
      - `games_as_white` (int)
      - `games_as_black` (int)
      - `wins` (int)
      - `losses` (int)
      - `draws` (int)
      - `last_updated` (timestamptz)

    - `user_progress_snapshots`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `snapshot_date` (date)
      - `games_analyzed` (int)
      - `average_accuracy` (decimal)
      - `mistakes_per_game` (decimal)
      - `blunders_per_game` (decimal)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all new tables
    - Users can only access their own statistics
    - Policies for authenticated users
*/

-- Create game analysis results table
CREATE TABLE IF NOT EXISTS game_analysis_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid REFERENCES games(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  accuracy decimal(5,2) DEFAULT 0,
  total_moves int DEFAULT 0,
  mistakes int DEFAULT 0,
  blunders int DEFAULT 0,
  good_moves int DEFAULT 0,
  best_moves int DEFAULT 0,
  average_centipawn_loss decimal(6,2) DEFAULT 0,
  analyzed_at timestamptz DEFAULT now(),
  UNIQUE(game_id)
);

-- Create user statistics table
CREATE TABLE IF NOT EXISTS user_statistics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  total_games_analyzed int DEFAULT 0,
  average_accuracy decimal(5,2) DEFAULT 0,
  total_mistakes int DEFAULT 0,
  total_blunders int DEFAULT 0,
  games_as_white int DEFAULT 0,
  games_as_black int DEFAULT 0,
  wins int DEFAULT 0,
  losses int DEFAULT 0,
  draws int DEFAULT 0,
  last_updated timestamptz DEFAULT now()
);

-- Create progress snapshots table
CREATE TABLE IF NOT EXISTS user_progress_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  snapshot_date date NOT NULL,
  games_analyzed int DEFAULT 0,
  average_accuracy decimal(5,2) DEFAULT 0,
  mistakes_per_game decimal(4,2) DEFAULT 0,
  blunders_per_game decimal(4,2) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, snapshot_date)
);

-- Enable Row Level Security
ALTER TABLE game_analysis_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_statistics ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress_snapshots ENABLE ROW LEVEL SECURITY;

-- RLS Policies for game_analysis_results
CREATE POLICY "Users can view own game analysis"
  ON game_analysis_results FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own game analysis"
  ON game_analysis_results FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own game analysis"
  ON game_analysis_results FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own game analysis"
  ON game_analysis_results FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for user_statistics
CREATE POLICY "Users can view own statistics"
  ON user_statistics FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own statistics"
  ON user_statistics FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own statistics"
  ON user_statistics FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for user_progress_snapshots
CREATE POLICY "Users can view own progress snapshots"
  ON user_progress_snapshots FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own progress snapshots"
  ON user_progress_snapshots FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_game_analysis_user_id ON game_analysis_results(user_id);
CREATE INDEX IF NOT EXISTS idx_game_analysis_game_id ON game_analysis_results(game_id);
CREATE INDEX IF NOT EXISTS idx_game_analysis_analyzed_at ON game_analysis_results(analyzed_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_statistics_user_id ON user_statistics(user_id);
CREATE INDEX IF NOT EXISTS idx_progress_snapshots_user_date ON user_progress_snapshots(user_id, snapshot_date DESC);

-- Function to update user statistics
CREATE OR REPLACE FUNCTION update_user_statistics()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_statistics (user_id, total_games_analyzed, average_accuracy, total_mistakes, total_blunders, last_updated)
  SELECT
    NEW.user_id,
    COUNT(*),
    AVG(accuracy),
    SUM(mistakes),
    SUM(blunders),
    now()
  FROM game_analysis_results
  WHERE user_id = NEW.user_id
  ON CONFLICT (user_id)
  DO UPDATE SET
    total_games_analyzed = EXCLUDED.total_games_analyzed,
    average_accuracy = EXCLUDED.average_accuracy,
    total_mistakes = EXCLUDED.total_mistakes,
    total_blunders = EXCLUDED.total_blunders,
    last_updated = now();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically update statistics
CREATE TRIGGER update_stats_after_analysis
  AFTER INSERT OR UPDATE ON game_analysis_results
  FOR EACH ROW
  EXECUTE FUNCTION update_user_statistics();
