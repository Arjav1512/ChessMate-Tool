/*
  # ChessMate Database Schema

  1. New Tables
    - `profiles`
      - `id` (uuid, primary key, references auth.users)
      - `email` (text)
      - `display_name` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `games`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to profiles)
      - `pgn` (text, full PGN notation)
      - `white_player` (text)
      - `black_player` (text)
      - `result` (text)
      - `date` (text)
      - `event` (text)
      - `uploaded_at` (timestamptz)
      - `created_at` (timestamptz)
    
    - `moves`
      - `id` (uuid, primary key)
      - `game_id` (uuid, foreign key to games)
      - `move_number` (integer)
      - `white_move` (text)
      - `black_move` (text)
      - `position_fen` (text, FEN notation after move)
      - `stockfish_evaluation` (jsonb, stores engine analysis)
      - `created_at` (timestamptz)
    
    - `questions`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to profiles)
      - `game_id` (uuid, foreign key to games, nullable)
      - `move_id` (uuid, foreign key to moves, nullable)
      - `question` (text)
      - `answer` (text)
      - `context` (jsonb, stores game context for AI)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
    - Users can only access their own games and questions
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  display_name text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Create games table
CREATE TABLE IF NOT EXISTS games (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  pgn text NOT NULL,
  white_player text DEFAULT '',
  black_player text DEFAULT '',
  result text DEFAULT '*',
  date text DEFAULT '',
  event text DEFAULT '',
  uploaded_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE games ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own games"
  ON games FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own games"
  ON games FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own games"
  ON games FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own games"
  ON games FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create moves table
CREATE TABLE IF NOT EXISTS moves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  move_number integer NOT NULL,
  white_move text,
  black_move text,
  position_fen text NOT NULL,
  stockfish_evaluation jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE moves ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view moves for their games"
  ON moves FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM games
      WHERE games.id = moves.game_id
      AND games.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert moves for their games"
  ON moves FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM games
      WHERE games.id = moves.game_id
      AND games.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update moves for their games"
  ON moves FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM games
      WHERE games.id = moves.game_id
      AND games.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM games
      WHERE games.id = moves.game_id
      AND games.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete moves for their games"
  ON moves FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM games
      WHERE games.id = moves.game_id
      AND games.user_id = auth.uid()
    )
  );

-- Create questions table
CREATE TABLE IF NOT EXISTS questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  game_id uuid REFERENCES games(id) ON DELETE CASCADE,
  move_id uuid REFERENCES moves(id) ON DELETE CASCADE,
  question text NOT NULL,
  answer text DEFAULT '',
  context jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own questions"
  ON questions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own questions"
  ON questions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own questions"
  ON questions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own questions"
  ON questions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_games_user_id ON games(user_id);
CREATE INDEX IF NOT EXISTS idx_moves_game_id ON moves(game_id);
CREATE INDEX IF NOT EXISTS idx_questions_user_id ON questions(user_id);
CREATE INDEX IF NOT EXISTS idx_questions_game_id ON questions(game_id);