/**
 * gameInsights — derive human-readable "what mattered in this game" insights
 * from data the engine already produces (full-game classifications + evals).
 * No engine work here; pure derivation so the Insights tab can lead with
 * meaning ("biggest mistake", "turning point", "best move") instead of raw
 * numbers.
 */

import type { MoveClassification } from './moveClassifier';

export type InsightKind = 'turning-point' | 'biggest-mistake' | 'best-move';

export interface GameInsight {
  kind: InsightKind;
  title: string;
  /** 0-based move index. Board position to show = moveIndex + 1. */
  moveIndex: number;
  /** SAN of the move. */
  move: string;
  /** Plain-language explanation. */
  detail: string;
  tone: 'error' | 'amber' | 'success';
}

const CLAMP = 10; // pawns — keep a forced mate (±999) from dwarfing every swing.
const clamp = (v: number) => Math.max(-CLAMP, Math.min(CLAMP, v));

/** "12." for White's move, "12…" for Black's. */
function moveLabel(moveIndex: number): string {
  const n = Math.floor(moveIndex / 2) + 1;
  return moveIndex % 2 === 0 ? `${n}.` : `${n}…`;
}

const LOSING = new Set<MoveClassification>(['inaccuracy', 'mistake', 'blunder']);

export function deriveInsights(
  moves: string[],
  classMap: Map<number, MoveClassification>,
  evals: number[],
  userColor: 'white' | 'black' | null,
): GameInsight[] {
  const insights: GameInsight[] = [];
  const used = new Set<number>(); // move indices already surfaced (avoid duplicates)
  if (evals.length < 2 || moves.length === 0 || classMap.size === 0) return insights;

  // Eval change across move m (0-based), White's point of view: pos m -> m+1.
  const swing = (m: number) => {
    if (m + 1 >= evals.length) return 0;
    return clamp(evals[m + 1]) - clamp(evals[m]);
  };
  // How much the *mover* worsened their own position (positive = lost ground).
  // White moves on even indices (eval down = bad); Black on odd (eval up = bad).
  const moverLoss = (m: number) => (m % 2 === 0 ? -swing(m) : swing(m));

  const isUserMove = (m: number) => {
    if (userColor === 'white') return m % 2 === 0;
    if (userColor === 'black') return m % 2 === 1;
    return true; // unknown colour → consider every move
  };

  // ── Biggest mistake (user side, classified inaccuracy/mistake/blunder) ──
  let worst = { idx: -1, loss: 0 };
  for (let m = 0; m < moves.length; m++) {
    if (!isUserMove(m)) continue;
    const cls = classMap.get(m);
    if (!cls || !LOSING.has(cls)) continue;
    const loss = moverLoss(m);
    if (loss > worst.loss) worst = { idx: m, loss };
  }
  if (worst.idx >= 0) {
    insights.push({
      kind: 'biggest-mistake',
      title: 'Biggest mistake',
      moveIndex: worst.idx,
      move: moves[worst.idx],
      detail: `${moveLabel(worst.idx)} ${moves[worst.idx]} was your costliest move — the evaluation dropped about ${worst.loss.toFixed(1)} in your opponent's favour.`,
      tone: 'error',
    });
    used.add(worst.idx);
  }

  // ── Turning point (largest absolute swing, anyone) ──
  let turn = { idx: -1, mag: 0 };
  for (let m = 0; m < moves.length; m++) {
    const mag = Math.abs(swing(m));
    if (mag > turn.mag) turn = { idx: m, mag };
  }
  if (turn.idx >= 0 && turn.mag >= 1 && !used.has(turn.idx)) {
    insights.push({
      kind: 'turning-point',
      title: 'Turning point',
      moveIndex: turn.idx,
      move: moves[turn.idx],
      detail: `The game swung most after ${moveLabel(turn.idx)} ${moves[turn.idx]} — its pivotal moment. Worth understanding why.`,
      tone: 'amber',
    });
    used.add(turn.idx);
  }

  // ── Best move (the user's strongest engine-approved move) ──
  let best = -1;
  for (let m = 0; m < moves.length; m++) {
    if (!isUserMove(m)) continue;
    const cls = classMap.get(m);
    if (cls === 'best' || cls === 'excellent') { best = m; break; }
  }
  if (best >= 0 && !used.has(best)) {
    insights.push({
      kind: 'best-move',
      title: 'Best move',
      moveIndex: best,
      move: moves[best],
      detail: `${moveLabel(best)} ${moves[best]} was a strong, engine-approved choice. Nicely found.`,
      tone: 'success',
    });
  }

  return insights;
}
