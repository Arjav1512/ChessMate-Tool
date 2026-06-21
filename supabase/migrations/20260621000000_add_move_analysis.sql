/*
  # Add move_analysis — per-ply analysis persistence (Phase 2 / PR B-1)

  Foundational data layer for true phase weakness detection, tactical-motif
  tagging, train-on-your-mistakes, and future drills. Until now per-move analysis
  was computed during analysis and discarded (only per-game aggregates persisted).

  ADDITIVE ONLY: a brand-new table. No existing table is touched. RLS mirrors the
  proven `game_analysis_results` pattern (denormalized `user_id` → `auth.uid()`),
  so cross-user isolation needs no join.

  Backfill is persist-forward + lazy: rows are written only for newly analyzed or
  explicitly re-analyzed games. `phase` and `motif_tags` columns are created here
  (so the schema is designed once) but populated by later PRs (B-2 phase, B-3
  motifs) — they are nullable / default-empty and unused for now.
*/

CREATE TABLE IF NOT EXISTS move_analysis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  ply integer NOT NULL,                 -- 0-based half-move index of the played move
  move_number integer NOT NULL,         -- 1-based full-move number
  color text NOT NULL CHECK (color IN ('white', 'black')),

  fen text NOT NULL,                    -- position BEFORE the move (what you'd drill)
  san text,                             -- the move actually played (SAN)
  eval_cp integer,                      -- eval AFTER the move, centipawns, White POV
  cp_loss integer,                      -- centipawn loss vs best (>= 0)
  classification text,                  -- best|excellent|good|inaccuracy|mistake|blunder
  best_move text,                       -- engine's best move in the BEFORE position

  -- Reserved for later PRs (created now to keep the migration additive-once):
  phase text,                           -- opening|middlegame|endgame (B-2)
  motif_tags text[] NOT NULL DEFAULT '{}', -- lightweight tactical motifs (B-3)

  created_at timestamptz DEFAULT now(),
  UNIQUE (game_id, ply)
);

ALTER TABLE move_analysis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own move analysis"
  ON move_analysis FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own move analysis"
  ON move_analysis FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own move analysis"
  ON move_analysis FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own move analysis"
  ON move_analysis FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_move_analysis_game_id ON move_analysis(game_id);
CREATE INDEX IF NOT EXISTS idx_move_analysis_user_id ON move_analysis(user_id);
-- Supports "count my blunders by classification" weakness queries efficiently.
CREATE INDEX IF NOT EXISTS idx_move_analysis_user_class ON move_analysis(user_id, classification);
