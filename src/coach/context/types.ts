import type { Phase } from '../../lib/moveAnalysis';
import type { Motif } from '../../lib/motifs';
import type { MoveClassification } from '../../utils/moveClassifier';

// ─────────────────────────────────────────────────────────────────────────────
// Coach context (Coach Foundation, Deliverable 3).
//
// Everything the model needs is assembled by ChessMate BEFORE inference — the
// LLM never fetches data itself. All fields are optional: the coach can be
// asked about a whole game, a single move, or nothing in particular, and the
// renderer collapses absent sections instead of fabricating them.
// ─────────────────────────────────────────────────────────────────────────────

export interface CoachGameContext {
  white?: string;
  black?: string;
  whiteRating?: number | null;
  blackRating?: number | null;
  result?: string;
  event?: string;
  date?: string;
  /** Full PGN — used to derive the opening when one is not supplied. */
  pgn?: string;
  opening?: { eco?: string; name: string };
  userColor?: 'white' | 'black' | null;
}

export interface CoachEvaluation {
  /** Display evaluation, e.g. "+1.35" (pawns) — matches the engine panel. */
  evaluation: string;
  isMate: boolean;
  bestMove?: string;
}

export interface CoachMoveContext {
  san?: string | null;
  moveNumber?: number;
  color?: 'white' | 'black';
  classification?: MoveClassification;
  /** Centipawns thrown away vs the engine's best, mover's perspective. */
  cpLoss?: number;
  motifs?: Motif[] | string[];
  phase?: Phase;
  bestMove?: string | null;
  evaluation?: CoachEvaluation;
}

export interface CoachPlayerContext {
  rating?: number | null;
  /** Mean accuracy over the player's analyzed games (0–100). */
  accuracy?: number | null;
  /** Compact one-liner from lib/weaknessProfile — never fabricated. */
  weaknessSummary?: string;
  /** Compact lines describing recent mistakes (e.g. from mistakeReview). */
  recentMistakes?: string[];
  /** Compact lines describing recent games (result + opening). */
  recentGames?: string[];
}

/** One entry of the Send-to-Improve queue the user flagged for study. */
export interface CoachQueueItem {
  san: string;
  motif: string;
  phase?: Phase;
}

export interface CoachContext {
  game?: CoachGameContext;
  /** FEN of the position the question is about. */
  fen?: string;
  move?: CoachMoveContext;
  /** SAN history up to the current position (capped by the renderer). */
  moveHistory?: string[];
  player?: CoachPlayerContext;
  improveQueue?: CoachQueueItem[];
}
