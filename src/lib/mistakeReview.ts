import { Chess } from 'chess.js';
import type { Phase } from './moveAnalysis';
import type { Motif } from './motifs';
import type { MoveClassification } from '../utils/moveClassifier';

// ─────────────────────────────────────────────────────────────────────────────
// Train On Your Mistakes — read-only v1 (Phase 2 / B-4).
//
// Turns the user's stored mistake/blunder rows (move_analysis) into a prioritized,
// filterable review feed. Pure aggregation over existing data — no new analysis,
// engine, or AI calls. No drills / SRS / puzzles / plans (later, if ever).
// ─────────────────────────────────────────────────────────────────────────────

export interface MistakeInput {
  gameId: string;
  fen: string;             // position BEFORE the move (the board to study)
  san: string | null;      // the move actually played
  bestMove: string | null; // engine's best move, UCI
  classification: MoveClassification;
  cpLoss: number;
  phase: Phase;
  motifs: Motif[];
  moveNumber: number;
  color: 'white' | 'black';
}

export interface MistakeFilter {
  phase?: Phase;
  motif?: Motif;
}

export interface MistakeCard extends MistakeInput {
  /** Best move converted to SAN for display (from the FEN; falls back to UCI). */
  bestMoveSan: string | null;
  priority: number;
}

// Mate motifs matter most, then material, then a generic blunder.
const MOTIF_IMPORTANCE: Record<Motif, number> = {
  allowed_mate: 3,
  missed_mate: 3,
  hung_piece: 2,
  allowed_material_loss: 2,
  missed_material_gain: 2,
  major_tactical_blunder: 1,
};

function importanceOf(motifs: Motif[]): number {
  return motifs.reduce((max, m) => Math.max(max, MOTIF_IMPORTANCE[m] ?? 0), 0);
}

function uciToSan(fen: string, uci: string | null): string | null {
  if (!uci || uci.length < 4) return uci;
  try {
    const c = new Chess(fen);
    const m = c.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] as never });
    return m?.san ?? uci;
  } catch {
    return uci;
  }
}

/**
 * Rank and filter the user's mistakes for review.
 *
 * Priority blends the three requested signals:
 *   - severity   → centipawn loss (dominant term)
 *   - motif importance → mate > material > generic
 *   - recurrence → how often the card's strongest motif appears across all mistakes
 */
export function buildMistakeReview(
  mistakes: MistakeInput[],
  filter: MistakeFilter = {},
  limit = 24,
): MistakeCard[] {
  // Recurrence: count how many mistakes carry each motif (computed over the full
  // set, before filtering, so a filtered view still reflects true recurrence).
  const motifCounts = new Map<Motif, number>();
  for (const m of mistakes) {
    for (const tag of m.motifs) motifCounts.set(tag, (motifCounts.get(tag) ?? 0) + 1);
  }

  const filtered = mistakes.filter((m) => {
    if (filter.phase && m.phase !== filter.phase) return false;
    if (filter.motif && !m.motifs.includes(filter.motif)) return false;
    return true;
  });

  const cards: MistakeCard[] = filtered.map((m) => {
    const importance = importanceOf(m.motifs);
    const recurrence = m.motifs.reduce((max, tag) => Math.max(max, motifCounts.get(tag) ?? 0), 0);
    return {
      ...m,
      bestMoveSan: uciToSan(m.fen, m.bestMove),
      priority: m.cpLoss + importance * 150 + Math.min(recurrence, 10) * 30,
    };
  });

  cards.sort((a, b) => b.priority - a.priority);
  return cards.slice(0, limit);
}
