import kpEndgames from './endgames/king_and_pawn_endgames.md?raw';
import opposition from './endgames/opposition.md?raw';
import rookEndgames from './endgames/rook_endgames.md?raw';
import backRank from './motifs/back_rank.md?raw';
import hangingPieces from './motifs/hanging_pieces.md?raw';
import matingPatterns from './motifs/mating_patterns.md?raw';
import caroKann from './openings/caro_kann.md?raw';
import french from './openings/french.md?raw';
import italianGame from './openings/italian_game.md?raw';
import kingsIndian from './openings/kings_indian.md?raw';
import londonSystem from './openings/london_system.md?raw';
import queensGambit from './openings/queens_gambit.md?raw';
import ruyLopez from './openings/ruy_lopez.md?raw';
import sicilian from './openings/sicilian.md?raw';
import calculation from './principles/calculation.md?raw';
import kingSafety from './principles/king_safety.md?raw';
import openingPrinciples from './principles/opening_principles.md?raw';
import initiative from './strategy/initiative.md?raw';
import pawnStructure from './strategy/pawn_structure.md?raw';
import pieceActivity from './strategy/piece_activity.md?raw';
import weakSquares from './strategy/weak_squares.md?raw';
import discoveredAttacks from './tactics/discovered_attacks.md?raw';
import forks from './tactics/forks.md?raw';
import pins from './tactics/pins.md?raw';
import skewers from './tactics/skewers.md?raw';

// ─────────────────────────────────────────────────────────────────────────────
// Knowledge base (Coach Foundation, Deliverable 5).
//
// Curated markdown documents bundled at build time — Phase-1 placeholders that
// deterministic retrieval selects from (no embeddings, no vector store).
// `tags` are the retrieval keys: opening names/ECO prefixes, motif ids from
// lib/motifs, phases, and mistake classifications. Content grows over time;
// the registry shape stays.
// ─────────────────────────────────────────────────────────────────────────────

export type KnowledgeCategory =
  | 'openings'
  | 'strategy'
  | 'tactics'
  | 'endgames'
  | 'motifs'
  | 'principles';

export interface KnowledgeDoc {
  id: string;
  category: KnowledgeCategory;
  title: string;
  /** Lowercase match keys: opening names, motif ids, phases, classifications. */
  tags: string[];
  content: string;
}

export const KNOWLEDGE_BASE: KnowledgeDoc[] = [
  // ── Openings ──────────────────────────────────────────────────────────────
  { id: 'openings/sicilian', category: 'openings', title: 'Sicilian Defense', tags: ['sicilian'], content: sicilian },
  { id: 'openings/french', category: 'openings', title: 'French Defense', tags: ['french'], content: french },
  { id: 'openings/italian_game', category: 'openings', title: 'Italian Game', tags: ['italian', 'giuoco piano'], content: italianGame },
  { id: 'openings/ruy_lopez', category: 'openings', title: 'Ruy Lopez', tags: ['ruy lopez', 'spanish'], content: ruyLopez },
  { id: 'openings/caro_kann', category: 'openings', title: 'Caro-Kann Defense', tags: ['caro-kann', 'caro kann'], content: caroKann },
  { id: 'openings/queens_gambit', category: 'openings', title: "Queen's Gambit", tags: ["queen's gambit", 'qgd', 'qga'], content: queensGambit },
  { id: 'openings/london_system', category: 'openings', title: 'London System', tags: ['london'], content: londonSystem },
  { id: 'openings/kings_indian', category: 'openings', title: "King's Indian Defense", tags: ["king's indian"], content: kingsIndian },

  // ── Strategy ──────────────────────────────────────────────────────────────
  { id: 'strategy/initiative', category: 'strategy', title: 'Initiative', tags: ['initiative'], content: initiative },
  { id: 'strategy/pawn_structure', category: 'strategy', title: 'Pawn Structure', tags: ['pawn structure', 'premature-pawn-push'], content: pawnStructure },
  { id: 'strategy/piece_activity', category: 'strategy', title: 'Piece Activity', tags: ['piece activity'], content: pieceActivity },
  { id: 'strategy/weak_squares', category: 'strategy', title: 'Weak Squares', tags: ['weak squares', 'outpost'], content: weakSquares },

  // ── Tactics ───────────────────────────────────────────────────────────────
  { id: 'tactics/pins', category: 'tactics', title: 'Pins', tags: ['pin', 'pins'], content: pins },
  { id: 'tactics/forks', category: 'tactics', title: 'Forks', tags: ['fork', 'forks', 'double attack'], content: forks },
  { id: 'tactics/skewers', category: 'tactics', title: 'Skewers', tags: ['skewer', 'skewers'], content: skewers },
  { id: 'tactics/discovered_attacks', category: 'tactics', title: 'Discovered Attacks', tags: ['discovered attack', 'discovery'], content: discoveredAttacks },

  // ── Endgames ──────────────────────────────────────────────────────────────
  { id: 'endgames/rook_endgames', category: 'endgames', title: 'Rook Endgames', tags: ['rook endgame', 'endgame'], content: rookEndgames },
  { id: 'endgames/king_and_pawn_endgames', category: 'endgames', title: 'King and Pawn Endgames', tags: ['pawn endgame', 'endgame'], content: kpEndgames },
  { id: 'endgames/opposition', category: 'endgames', title: 'Opposition', tags: ['opposition', 'endgame'], content: opposition },

  // ── Motifs — tagged with the ids produced by lib/motifs.detectMotifs ──────
  { id: 'motifs/hanging_pieces', category: 'motifs', title: 'Hanging Pieces', tags: ['hung_piece', 'hanging-piece', 'allowed_material_loss', 'missed_material_gain'], content: hangingPieces },
  { id: 'motifs/back_rank', category: 'motifs', title: 'Back-Rank Weakness', tags: ['back rank', 'allowed_mate'], content: backRank },
  { id: 'motifs/mating_patterns', category: 'motifs', title: 'Mating Patterns', tags: ['missed_mate', 'allowed_mate', 'mate'], content: matingPatterns },

  // ── Principles ────────────────────────────────────────────────────────────
  { id: 'principles/opening_principles', category: 'principles', title: 'Opening Principles', tags: ['opening'], content: openingPrinciples },
  { id: 'principles/king_safety', category: 'principles', title: 'King Safety', tags: ['king safety', 'loosened-kingside', 'allowed_mate'], content: kingSafety },
  { id: 'principles/calculation', category: 'principles', title: 'Calculation', tags: ['calculation', 'blunder', 'mistake', 'major_tactical_blunder'], content: calculation },
];
