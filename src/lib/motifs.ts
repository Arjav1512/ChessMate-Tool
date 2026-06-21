import { Chess } from 'chess.js';
import type { MoveClassification } from '../utils/moveClassifier';

// ─────────────────────────────────────────────────────────────────────────────
// Lightweight tactical-motif detection (Phase 2 / B-3).
//
// Deterministic rules over data analysis already produced — NO extra engine pass.
// Mate situations are read from the eval magnitude (BulkAnalysis encodes a forced
// mate as ±10000cp); material motifs are gated to real errors and use a single
// chess.js capture check (no static-exchange search). Approved Phase-1 taxonomy
// only — no full tactical ontology.
// ─────────────────────────────────────────────────────────────────────────────

export type Motif =
  | 'hung_piece'
  | 'missed_material_gain'
  | 'allowed_material_loss'
  | 'missed_mate'
  | 'allowed_mate'
  | 'major_tactical_blunder';

export const MOTIF_INFO: Record<Motif, { label: string; weaknessTitle: string; definition: string }> = {
  hung_piece:           { label: 'Hung piece',            weaknessTitle: 'Frequently hangs pieces',        definition: 'Lost material on a quiet move — a piece or pawn left undefended.' },
  missed_material_gain: { label: 'Missed material',       weaknessTitle: 'Misses tactical wins',           definition: 'A capturing move would have won material, but you played otherwise.' },
  allowed_material_loss:{ label: 'Allowed material loss', weaknessTitle: 'Drops material under pressure',  definition: 'Allowed the opponent to win material in an exchange or tactic.' },
  missed_mate:          { label: 'Missed mate',           weaknessTitle: 'Misses forced mates',            definition: 'A forced mate was available but you did not play it.' },
  allowed_mate:         { label: 'Allowed mate',          weaknessTitle: 'Allows mating attacks',          definition: 'Walked into a forced mate for the opponent.' },
  major_tactical_blunder:{ label: 'Major blunder',        weaknessTitle: 'Major tactical blunders',        definition: 'A move that threw away a large amount of evaluation.' },
};

export interface MotifInput {
  fenBefore: string;
  san: string | null;
  bestMove: string | null; // UCI, the engine's best move in fenBefore
  isWhiteMove: boolean;
  evalCpBefore: number; // White POV centipawns
  evalCpAfter: number;  // White POV centipawns
  classification: MoveClassification;
}

const MATE_CP = 9000;      // |eval| at/above this ⇒ forced mate (±10000 encoding)
const MATERIAL_MIN = 150;  // mover-side cp loss that counts as dropping material

function isCapture(fen: string, move: { san?: string | null; uci?: string | null }): boolean {
  try {
    const c = new Chess(fen);
    const played = move.san
      ? c.move(move.san)
      : move.uci && move.uci.length >= 4
        ? c.move({ from: move.uci.slice(0, 2), to: move.uci.slice(2, 4), promotion: move.uci[4] as never })
        : null;
    return !!played?.captured;
  } catch {
    return false;
  }
}

/** Deterministically tag a move with Phase-1 motifs. Returns [] for clean moves. */
export function detectMotifs(input: MotifInput): Motif[] {
  const { isWhiteMove, evalCpBefore, evalCpAfter, classification } = input;
  // Everything from the moving side's perspective.
  const moverBefore = isWhiteMove ? evalCpBefore : -evalCpBefore;
  const moverAfter = isWhiteMove ? evalCpAfter : -evalCpAfter;
  const drop = moverBefore - moverAfter; // > 0 ⇒ the move worsened the mover's eval

  const motifs: Motif[] = [];
  const mateSituation = Math.abs(moverBefore) >= MATE_CP || Math.abs(moverAfter) >= MATE_CP;
  const isError = classification === 'mistake' || classification === 'blunder';

  // Mate motifs.
  if (moverAfter <= -MATE_CP && moverBefore > -MATE_CP) motifs.push('allowed_mate');
  if (moverBefore >= MATE_CP && moverAfter < MATE_CP && classification !== 'best') motifs.push('missed_mate');

  // Material motifs — only real errors that lose material, away from mate scores.
  if (!mateSituation && isError && drop >= MATERIAL_MIN) {
    // A quiet (non-capturing) move that drops material ⇒ left something hanging.
    // A capture/exchange that drops material ⇒ allowed a material loss.
    if (isCapture(input.fenBefore, { san: input.san })) motifs.push('allowed_material_loss');
    else motifs.push('hung_piece');

    // The engine's best move was a capture you didn't make ⇒ missed material.
    if (input.bestMove && isCapture(input.fenBefore, { uci: input.bestMove })) {
      motifs.push('missed_material_gain');
    }
  }

  // Broad bucket — always tag blunders.
  if (classification === 'blunder') motifs.push('major_tactical_blunder');

  return motifs;
}
