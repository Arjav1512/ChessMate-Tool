import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Profile {
  id: string;
  email: string;
  display_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface Game {
  id: string;
  user_id: string;
  pgn: string;
  white_player: string;
  black_player: string;
  result: string;
  date: string;
  event: string;
  uploaded_at: string;
  created_at: string;
}

export interface Move {
  id: string;
  game_id: string;
  move_number: number;
  white_move: string | null;
  black_move: string | null;
  position_fen: string;
  stockfish_evaluation: any;
  created_at: string;
}

export interface Question {
  id: string;
  user_id: string;
  game_id: string | null;
  move_id: string | null;
  question: string;
  answer: string;
  context: any;
  created_at: string;
}
