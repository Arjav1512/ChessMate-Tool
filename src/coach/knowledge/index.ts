import kpEndgames from './endgames/king_and_pawn_endgames.md?raw';
import endgamePrinciples from './endgames/endgame_principles.md?raw';
import minorPieceEndgames from './endgames/minor_piece_endgames.md?raw';
import opposition from './endgames/opposition.md?raw';
import queenEndgames from './endgames/queen_endgames.md?raw';
import rookEndgames from './endgames/rook_endgames.md?raw';
import attackingTheKing from './middlegame/attacking_the_king.md?raw';
import convertingAdvantages from './middlegame/converting_advantages.md?raw';
import defending from './middlegame/defending.md?raw';
import planning from './middlegame/planning.md?raw';
import backRank from './motifs/back_rank.md?raw';
import blunderPrevention from './motifs/blunder_prevention.md?raw';
import hangingPieces from './motifs/hanging_pieces.md?raw';
import losingMaterial from './motifs/losing_material.md?raw';
import matingPatterns from './motifs/mating_patterns.md?raw';
import missedTactics from './motifs/missed_tactics.md?raw';
import caroKann from './openings/caro_kann.md?raw';
import catalan from './openings/catalan.md?raw';
import english from './openings/english.md?raw';
import french from './openings/french.md?raw';
import italianGame from './openings/italian_game.md?raw';
import kingsGambit from './openings/kings_gambit.md?raw';
import kingsIndian from './openings/kings_indian.md?raw';
import londonSystem from './openings/london_system.md?raw';
import nimzoIndian from './openings/nimzo_indian.md?raw';
import pircModern from './openings/pirc_modern.md?raw';
import queensGambit from './openings/queens_gambit.md?raw';
import ruyLopez from './openings/ruy_lopez.md?raw';
import scandinavian from './openings/scandinavian.md?raw';
import sicilian from './openings/sicilian.md?raw';
import slav from './openings/slav.md?raw';
import carlsbad from './pawn_structures/carlsbad_minority_attack.md?raw';
import hangingPawns from './pawn_structures/hanging_pawns.md?raw';
import iqp from './pawn_structures/isolated_queens_pawn.md?raw';
import pawnChainsBreaks from './pawn_structures/pawn_chains_breaks.md?raw';
import chessPsychology from './practical/chess_psychology.md?raw';
import defendingWorse from './practical/defending_worse_positions.md?raw';
import timeManagement from './practical/time_management.md?raw';
import calculation from './principles/calculation.md?raw';
import centerControl from './principles/center_control.md?raw';
import development from './principles/development.md?raw';
import kingSafety from './principles/king_safety.md?raw';
import openingPrinciples from './principles/opening_principles.md?raw';
import improving1200 from './rating/improving_1200_1800.md?raw';
import improvingAbove1800 from './rating/improving_above_1800.md?raw';
import improvingUnder1200 from './rating/improving_under_1200.md?raw';
import bishopPair from './strategy/bishop_pair.md?raw';
import initiative from './strategy/initiative.md?raw';
import openFiles from './strategy/open_files.md?raw';
import pawnStructure from './strategy/pawn_structure.md?raw';
import pieceActivity from './strategy/piece_activity.md?raw';
import prophylaxis from './strategy/prophylaxis.md?raw';
import spaceAdvantage from './strategy/space_advantage.md?raw';
import tradingPieces from './strategy/trading_pieces.md?raw';
import weakSquares from './strategy/weak_squares.md?raw';
import discoveredAttacks from './tactics/discovered_attacks.md?raw';
import deflectionDecoy from './tactics/deflection_decoy.md?raw';
import forks from './tactics/forks.md?raw';
import pins from './tactics/pins.md?raw';
import removingTheDefender from './tactics/removing_the_defender.md?raw';
import skewers from './tactics/skewers.md?raw';
import trappedPieces from './tactics/trapped_pieces.md?raw';
import zwischenzug from './tactics/zwischenzug.md?raw';

// ─────────────────────────────────────────────────────────────────────────────
// Knowledge base — Phase 2 curated coaching corpus (KNOWLEDGE_BASE_PLAN.md).
//
// 63 coach-voice documents bundled at build time and selected by the
// deterministic StructuredRetriever (no embeddings, no vector store).
//
// Tag rules (retrieval matches whole-word tag-in-term only):
// - Opening docs carry words that whole-word match lib/openings names
//   ('slav' also matches "Semi-Slav"; 'pirc' + 'modern defense' cover both).
// - Single words that appear inside opening NAMES ('defense', 'attack',
//   'game', 'gambit') are never used alone — they would hijack opening
//   queries ("Sicilian Defense" must not retrieve a defending doc).
// - Bare 'blunder'/'mistake' stay exclusive to principles/calculation and
//   bare 'opening' to principles/opening_principles (pinned by tests).
// - Motif ids from lib/motifs spread across motifs/ docs; array order keeps
//   the primary doc for each id first.
// - Categories beyond today's query derivation (middlegame, pawn-structures,
//   practical, rating) carry descriptive tags for future retrieval — see the
//   coverage report in KNOWLEDGE_BASE_REPORT.md.
// ─────────────────────────────────────────────────────────────────────────────

export type KnowledgeCategory =
  | 'openings'
  | 'strategy'
  | 'tactics'
  | 'endgames'
  | 'motifs'
  | 'principles'
  | 'middlegame'
  | 'pawn-structures'
  | 'practical'
  | 'rating';

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
  { id: 'openings/english', category: 'openings', title: 'English Opening', tags: ['english'], content: english },
  { id: 'openings/scandinavian', category: 'openings', title: 'Scandinavian Defense', tags: ['scandinavian'], content: scandinavian },
  { id: 'openings/slav', category: 'openings', title: 'Slav Defense', tags: ['slav', 'semi-slav'], content: slav },
  { id: 'openings/nimzo_indian', category: 'openings', title: 'Nimzo-Indian Defense', tags: ['nimzo-indian'], content: nimzoIndian },
  { id: 'openings/pirc_modern', category: 'openings', title: 'Pirc and Modern Defense', tags: ['pirc', 'modern defense'], content: pircModern },
  { id: 'openings/catalan', category: 'openings', title: 'Catalan Opening', tags: ['catalan'], content: catalan },
  { id: 'openings/kings_gambit', category: 'openings', title: "King's Gambit", tags: ["king's gambit"], content: kingsGambit },

  // ── Strategy ──────────────────────────────────────────────────────────────
  { id: 'strategy/initiative', category: 'strategy', title: 'Initiative', tags: ['initiative'], content: initiative },
  { id: 'strategy/pawn_structure', category: 'strategy', title: 'Pawn Structure', tags: ['pawn structure', 'premature-pawn-push'], content: pawnStructure },
  { id: 'strategy/piece_activity', category: 'strategy', title: 'Piece Activity', tags: ['piece activity'], content: pieceActivity },
  { id: 'strategy/weak_squares', category: 'strategy', title: 'Weak Squares', tags: ['weak squares', 'outpost'], content: weakSquares },
  { id: 'strategy/open_files', category: 'strategy', title: 'Open Files and the 7th Rank', tags: ['open file', 'open files', 'seventh rank', 'rook activity'], content: openFiles },
  { id: 'strategy/bishop_pair', category: 'strategy', title: 'The Bishop Pair', tags: ['bishop pair', 'two bishops'], content: bishopPair },
  { id: 'strategy/space_advantage', category: 'strategy', title: 'Space Advantage', tags: ['space advantage', 'cramped'], content: spaceAdvantage },
  { id: 'strategy/prophylaxis', category: 'strategy', title: 'Prophylaxis', tags: ['prophylaxis', 'prevention'], content: prophylaxis },
  { id: 'strategy/trading_pieces', category: 'strategy', title: 'Trading Pieces', tags: ['trading pieces', 'simplification', 'exchanging'], content: tradingPieces },

  // ── Tactics ───────────────────────────────────────────────────────────────
  { id: 'tactics/pins', category: 'tactics', title: 'Pins', tags: ['pin', 'pins'], content: pins },
  { id: 'tactics/forks', category: 'tactics', title: 'Forks', tags: ['fork', 'forks', 'double attack'], content: forks },
  { id: 'tactics/skewers', category: 'tactics', title: 'Skewers', tags: ['skewer', 'skewers'], content: skewers },
  { id: 'tactics/discovered_attacks', category: 'tactics', title: 'Discovered Attacks', tags: ['discovered attack', 'discovery'], content: discoveredAttacks },
  { id: 'tactics/removing_the_defender', category: 'tactics', title: 'Removing the Defender', tags: ['removing the defender', 'overloading', 'overloaded'], content: removingTheDefender },
  { id: 'tactics/deflection_decoy', category: 'tactics', title: 'Deflection and Decoys', tags: ['deflection', 'decoy'], content: deflectionDecoy },
  { id: 'tactics/zwischenzug', category: 'tactics', title: 'Zwischenzug (In-Between Move)', tags: ['zwischenzug', 'in-between move', 'intermezzo'], content: zwischenzug },
  { id: 'tactics/trapped_pieces', category: 'tactics', title: 'Trapped Pieces', tags: ['trapped piece', 'trapped pieces'], content: trappedPieces },

  // ── Endgames (rook + K&P stay first: pinned retrieval order) ──────────────
  { id: 'endgames/rook_endgames', category: 'endgames', title: 'Rook Endgames', tags: ['rook endgame', 'endgame'], content: rookEndgames },
  { id: 'endgames/king_and_pawn_endgames', category: 'endgames', title: 'King and Pawn Endgames', tags: ['pawn endgame', 'endgame'], content: kpEndgames },
  { id: 'endgames/opposition', category: 'endgames', title: 'Opposition', tags: ['opposition', 'endgame'], content: opposition },
  { id: 'endgames/endgame_principles', category: 'endgames', title: 'Endgame Principles', tags: ['endgame', 'endgame principles'], content: endgamePrinciples },
  { id: 'endgames/minor_piece_endgames', category: 'endgames', title: 'Minor Piece Endgames', tags: ['endgame', 'minor piece endgame', 'bishop endgame', 'knight endgame'], content: minorPieceEndgames },
  { id: 'endgames/queen_endgames', category: 'endgames', title: 'Queen Endgames', tags: ['endgame', 'queen endgame', 'perpetual check'], content: queenEndgames },

  // ── Motifs / blunder patterns — tagged with lib/motifs detector ids ───────
  { id: 'motifs/hanging_pieces', category: 'motifs', title: 'Hanging Pieces', tags: ['hung_piece', 'hanging-piece', 'allowed_material_loss', 'missed_material_gain'], content: hangingPieces },
  { id: 'motifs/back_rank', category: 'motifs', title: 'Back-Rank Weakness', tags: ['back rank', 'allowed_mate'], content: backRank },
  { id: 'motifs/mating_patterns', category: 'motifs', title: 'Mating Patterns', tags: ['missed_mate', 'allowed_mate', 'mate'], content: matingPatterns },
  { id: 'motifs/missed_tactics', category: 'motifs', title: 'Missed Tactics', tags: ['missed_material_gain', 'missed_mate', 'missed tactic'], content: missedTactics },
  { id: 'motifs/losing_material', category: 'motifs', title: 'Losing Material in Exchanges', tags: ['allowed_material_loss', 'losing material'], content: losingMaterial },
  { id: 'motifs/blunder_prevention', category: 'motifs', title: 'Blunder Prevention', tags: ['major_tactical_blunder', 'blunder prevention', 'blunder check'], content: blunderPrevention },

  // ── Principles ────────────────────────────────────────────────────────────
  // The 'opening' tag doubles as a deliberate fallback: openings whose NAME
  // contains the word "Opening" (English Opening, Reti Opening, …) with no
  // dedicated doc retrieve these general principles instead.
  { id: 'principles/opening_principles', category: 'principles', title: 'Opening Principles', tags: ['opening', 'opening principles'], content: openingPrinciples },
  { id: 'principles/development', category: 'principles', title: 'Development', tags: ['development', 'tempo'], content: development },
  { id: 'principles/center_control', category: 'principles', title: 'Center Control', tags: ['center control', 'central control'], content: centerControl },
  { id: 'principles/king_safety', category: 'principles', title: 'King Safety', tags: ['king safety', 'loosened-kingside', 'allowed_mate'], content: kingSafety },
  { id: 'principles/calculation', category: 'principles', title: 'Calculation', tags: ['calculation', 'blunder', 'mistake', 'major_tactical_blunder'], content: calculation },

  // ── Middlegame planning ───────────────────────────────────────────────────
  { id: 'middlegame/planning', category: 'middlegame', title: 'Middlegame Planning', tags: ['planning', 'middlegame plan'], content: planning },
  { id: 'middlegame/attacking_the_king', category: 'middlegame', title: 'Attacking the King', tags: ['king attack', 'attacking the king', 'kingside attack'], content: attackingTheKing },
  { id: 'middlegame/defending', category: 'middlegame', title: 'Defending', tags: ['defending', 'under attack'], content: defending },
  { id: 'middlegame/converting_advantages', category: 'middlegame', title: 'Converting Advantages', tags: ['converting', 'conversion', 'winning technique'], content: convertingAdvantages },

  // ── Pawn structures ───────────────────────────────────────────────────────
  { id: 'pawn_structures/isolated_queens_pawn', category: 'pawn-structures', title: "The Isolated Queen's Pawn (IQP)", tags: ['isolated pawn', 'iqp', 'isolated queen'], content: iqp },
  { id: 'pawn_structures/carlsbad_minority_attack', category: 'pawn-structures', title: 'Carlsbad Structure and the Minority Attack', tags: ['carlsbad', 'minority attack'], content: carlsbad },
  { id: 'pawn_structures/hanging_pawns', category: 'pawn-structures', title: 'Hanging Pawns', tags: ['hanging pawns'], content: hangingPawns },
  { id: 'pawn_structures/pawn_chains_breaks', category: 'pawn-structures', title: 'Pawn Chains and Breaks', tags: ['pawn break', 'pawn breaks', 'pawn chain', 'pawn chains'], content: pawnChainsBreaks },

  // ── Practical play ────────────────────────────────────────────────────────
  { id: 'practical/time_management', category: 'practical', title: 'Time Management', tags: ['time management', 'clock', 'time trouble'], content: timeManagement },
  { id: 'practical/chess_psychology', category: 'practical', title: 'Chess Psychology', tags: ['psychology', 'tilt', 'mindset'], content: chessPsychology },
  { id: 'practical/defending_worse_positions', category: 'practical', title: 'Defending Worse Positions', tags: ['worse position', 'defending worse', 'swindle'], content: defendingWorse },

  // ── Rating-specific advice ────────────────────────────────────────────────
  { id: 'rating/improving_under_1200', category: 'rating', title: 'Improving Under 1200', tags: ['beginner', 'under 1200'], content: improvingUnder1200 },
  { id: 'rating/improving_1200_1800', category: 'rating', title: 'Improving 1200–1800', tags: ['intermediate', 'club player'], content: improving1200 },
  { id: 'rating/improving_above_1800', category: 'rating', title: 'Improving Above 1800', tags: ['advanced', 'above 1800'], content: improvingAbove1800 },
];
