/**
 * gameInsights — the "Improve Intelligence Layer". Turns the raw outputs the
 * engine already produces (per-move classifications + per-position evals) into
 * a human interpretation of the game: what went wrong, when control was lost,
 * what was played well, recurring habits, and what to practice next.
 *
 * Everything here is derived ONLY from move classifications and eval swings —
 * no external knowledge, no engine calls.
 */

import type { MoveClassification } from './moveClassifier';

export type InsightKind = 'opening' | 'blunder' | 'turning-point' | 'best-move' | 'pattern';

export interface GameInsight {
  kind: InsightKind;
  title: string;
  /** 0-based move index when the insight is tied to a specific move. */
  moveIndex?: number;
  move?: string;
  /** Why this matters (interpretation, not engine output). */
  why: string;
  /** What the player should learn from it. */
  learn: string;
  /** Pre-filled question for the coach. */
  coachQuestion: string;
  tone: 'error' | 'amber' | 'success' | 'accent';
}

export interface StudyItem { label: string; detail: string; }
export interface StudyPlan {
  weaknesses: StudyItem[]; // up to 2
  strength: StudyItem | null;
  training: StudyItem | null;
}

const CLAMP = 10; // pawns — keep a forced mate (±999) from dwarfing every swing.
const clamp = (v: number) => Math.max(-CLAMP, Math.min(CLAMP, v));
const LOSING = new Set<MoveClassification>(['inaccuracy', 'mistake', 'blunder']);

function moveLabel(moveIndex: number): string {
  const n = Math.floor(moveIndex / 2) + 1;
  return moveIndex % 2 === 0 ? `${n}.` : `${n}…`;
}

type Phase = 'opening' | 'middlegame' | 'endgame';
function phaseOf(moveIndex: number, total: number): Phase {
  if (moveIndex < 16) return 'opening';
  if (total >= 50 && moveIndex > total * 0.7) return 'endgame';
  return 'middlegame';
}
const PHASE_LABEL: Record<Phase, string> = { opening: 'opening', middlegame: 'middlegame', endgame: 'endgame' };

interface Ctx {
  moves: string[];
  classMap: Map<number, MoveClassification>;
  evals: number[];
  userColor: 'white' | 'black' | null;
}

function isUserMove(m: number, userColor: Ctx['userColor']) {
  if (userColor === 'white') return m % 2 === 0;
  if (userColor === 'black') return m % 2 === 1;
  return true;
}
// eval change across move m (White POV): pos m -> m+1
function swing(evals: number[], m: number) {
  if (m + 1 >= evals.length) return 0;
  return clamp(evals[m + 1]) - clamp(evals[m]);
}
// how much the mover worsened their own position (positive = lost ground)
function moverLoss(evals: number[], m: number) {
  return m % 2 === 0 ? -swing(evals, m) : swing(evals, m);
}

/** User's losing moves (inaccuracy/mistake/blunder), sorted worst-first. */
function userErrors(ctx: Ctx) {
  const { moves, classMap, evals, userColor } = ctx;
  const errs: { idx: number; cls: MoveClassification; loss: number }[] = [];
  for (let m = 0; m < moves.length; m++) {
    if (!isUserMove(m, userColor)) continue;
    const cls = classMap.get(m);
    if (!cls || !LOSING.has(cls)) continue;
    errs.push({ idx: m, cls, loss: moverLoss(evals, m) });
  }
  return errs.sort((a, b) => b.loss - a.loss);
}

/**
 * Ordered insights: Opening → Critical Blunder(s) → Turning Point → Best Move
 * → Pattern. (The Study Recommendation block is built separately.)
 */
export function deriveInsights(
  moves: string[],
  classMap: Map<number, MoveClassification>,
  evals: number[],
  userColor: 'white' | 'black' | null,
  opening?: { eco: string; name: string } | null,
): GameInsight[] {
  const insights: GameInsight[] = [];
  const used = new Set<number>();

  // 1. Opening understanding — available even before full analysis.
  if (opening) {
    insights.push({
      kind: 'opening',
      title: 'Opening understanding',
      why: `You played the ${opening.name} (${opening.eco}). Knowing an opening's ideas matters more than memorising moves — it tells you where your pieces belong and which pawn breaks to aim for.`,
      learn: `Learn the main plan and typical break of the ${opening.name}, so you reach familiar middlegames instead of guessing.`,
      coachQuestion: `I played the ${opening.name}. What are the key ideas, plans, and common mistakes in this opening?`,
      tone: 'accent',
    });
  }

  if (evals.length < 2 || moves.length === 0 || classMap.size === 0) return insights;

  const ctx: Ctx = { moves, classMap, evals, userColor };
  const errs = userErrors(ctx);

  // 2. Critical Blunder(s) — up to 2 worst losing moves.
  const blunders = errs.filter(e => e.loss >= 1).slice(0, 2);
  blunders.forEach((b, i) => {
    used.add(b.idx);
    const sev = b.cls === 'blunder' ? 'blunder' : b.cls === 'mistake' ? 'mistake' : 'inaccuracy';
    insights.push({
      kind: 'blunder',
      title: i === 0 ? 'Critical mistake' : 'Another costly moment',
      moveIndex: b.idx,
      move: moves[b.idx],
      why: `${moveLabel(b.idx)} ${moves[b.idx]} was a ${sev} — the evaluation swung about ${b.loss.toFixed(1)} pawns to your opponent. This is where you handed back control.`,
      learn: `Before committing, ask "what does this let my opponent do?" Most ${sev}s come from missing the reply, not from a bad plan.`,
      coachQuestion: `Why was ${moves[b.idx]} a ${sev}, and what should I have played instead?`,
      tone: 'error',
    });
  });

  // 3. Key Turning Point — the largest absolute swing (if distinct).
  let turn = { idx: -1, mag: 0 };
  for (let m = 0; m < moves.length; m++) {
    const mag = Math.abs(swing(evals, m));
    if (mag > turn.mag) turn = { idx: m, mag };
  }
  if (turn.idx >= 0 && turn.mag >= 1 && !used.has(turn.idx)) {
    used.add(turn.idx);
    insights.push({
      kind: 'turning-point',
      title: 'Key turning point',
      moveIndex: turn.idx,
      move: moves[turn.idx],
      why: `The game's balance shifted most after ${moveLabel(turn.idx)} ${moves[turn.idx]} (about ${turn.mag.toFixed(1)} pawns). This is the moment the character of the game changed.`,
      learn: `Replay this position slowly. Recognising when control changes hands is how you learn to seize — or avoid losing — the initiative.`,
      coachQuestion: `Why was ${moves[turn.idx]} the turning point of this game, and how should both sides have handled it?`,
      tone: 'amber',
    });
  }

  // 4. Best Move Highlight — the user's strongest engine-approved move.
  let best = -1;
  for (let m = 0; m < moves.length; m++) {
    if (!isUserMove(m, userColor)) continue;
    const cls = classMap.get(m);
    if ((cls === 'best' || cls === 'excellent') && !used.has(m)) { best = m; break; }
  }
  if (best >= 0) {
    used.add(best);
    insights.push({
      kind: 'best-move',
      title: 'Best move',
      moveIndex: best,
      move: moves[best],
      why: `${moveLabel(best)} ${moves[best]} was the engine's top choice — a moment you saw the position clearly.`,
      learn: `Notice what made this work (a tactic, a strong square, a timely trade) and look for the same idea in future games.`,
      coachQuestion: `Why was ${moves[best]} the best move here? What idea made it strong?`,
      tone: 'success',
    });
  }

  // 5. Pattern / Habit Detection — within-game behaviour.
  const pattern = detectPattern(ctx);
  if (pattern) insights.push(pattern);

  return insights;
}

/** One within-game habit, derived from where/how the user's errors cluster. */
function detectPattern(ctx: Ctx): GameInsight | null {
  const { moves, classMap } = ctx;
  const errs = userErrors(ctx);
  if (errs.length === 0) return null;

  const total = moves.length;
  const byPhase: Record<Phase, number> = { opening: 0, middlegame: 0, endgame: 0 };
  let blunderCount = 0;
  let secondHalf = 0;
  for (const e of errs) {
    byPhase[phaseOf(e.idx, total)]++;
    if (classMap.get(e.idx) === 'blunder') blunderCount++;
    if (e.idx > total / 2) secondHalf++;
  }

  // Most error-prone phase
  const worstPhase = (Object.keys(byPhase) as Phase[]).sort((a, b) => byPhase[b] - byPhase[a])[0];

  if (blunderCount >= 2) {
    return {
      kind: 'pattern',
      title: 'Habit: tactical lapses',
      why: `You had ${blunderCount} blunders this game — material or threats you overlooked. Repeated blunders are usually a calculation habit, not bad luck.`,
      learn: `Adopt a pre-move check: every move, scan for your opponent's checks, captures, and threats before you commit.`,
      coachQuestion: `I blundered ${blunderCount} times this game. How do I stop hanging pieces and missing my opponent's threats?`,
      tone: 'amber',
    };
  }
  if (byPhase[worstPhase] >= 2) {
    return {
      kind: 'pattern',
      title: `Habit: ${PHASE_LABEL[worstPhase]} slips`,
      why: `${byPhase[worstPhase]} of your inaccuracies happened in the ${PHASE_LABEL[worstPhase]}. A cluster in one phase points to a part of the game you find hardest.`,
      learn: `Spend your next few study sessions specifically on ${PHASE_LABEL[worstPhase]} play — it's your highest-leverage area right now.`,
      coachQuestion: `Most of my mistakes came in the ${PHASE_LABEL[worstPhase]}. What should I study to improve there?`,
      tone: 'amber',
    };
  }
  if (total >= 20 && secondHalf >= 2 && secondHalf >= errs.length - secondHalf) {
    return {
      kind: 'pattern',
      title: 'Habit: fading focus',
      why: `Most of your slips came in the second half of the game. Strong starts followed by late errors usually mean focus or energy dipping, not skill.`,
      learn: `Keep the same care on every move late in the game — slow down once you sense you're "winning".`,
      coachQuestion: `I played the opening well but made mistakes later. How do I keep my focus through a whole game?`,
      tone: 'amber',
    };
  }
  return null;
}

/**
 * Study Recommendation: 2 weaknesses, 1 strength, 1 training suggestion —
 * derived only from classifications + eval swings.
 */
export function buildStudyPlan(
  moves: string[],
  classMap: Map<number, MoveClassification>,
  evals: number[],
  userColor: 'white' | 'black' | null,
): StudyPlan | null {
  if (moves.length === 0 || classMap.size === 0) return null;

  let blunders = 0, mistakes = 0, inaccuracies = 0, greats = 0;
  let totalLost = 0; // pawns of advantage handed back across the user's errors
  const byPhase: Record<Phase, number> = { opening: 0, middlegame: 0, endgame: 0 };
  for (let m = 0; m < moves.length; m++) {
    if (!isUserMove(m, userColor)) continue;
    const cls = classMap.get(m);
    if (cls === 'blunder') { blunders++; byPhase[phaseOf(m, moves.length)]++; totalLost += Math.max(0, moverLoss(evals, m)); }
    else if (cls === 'mistake') { mistakes++; byPhase[phaseOf(m, moves.length)]++; totalLost += Math.max(0, moverLoss(evals, m)); }
    else if (cls === 'inaccuracy') { inaccuracies++; byPhase[phaseOf(m, moves.length)]++; totalLost += Math.max(0, moverLoss(evals, m)); }
    else if (cls === 'best' || cls === 'excellent') greats++;
  }

  const weaknesses: StudyItem[] = [];
  if (blunders > 0) {
    const lostNote = totalLost >= 1 ? ` You gave back about ${totalLost.toFixed(1)} pawns of advantage in total.` : '';
    weaknesses.push({ label: 'Tactical alertness', detail: `${blunders} blunder${blunders > 1 ? 's' : ''} — material or threats you missed.${lostNote} Spotting your opponent's tactics is the fastest rating gain.` });
  }
  const worstPhase = (Object.keys(byPhase) as Phase[]).sort((a, b) => byPhase[b] - byPhase[a])[0];
  if (byPhase[worstPhase] >= 2 && weaknesses.length < 2) {
    weaknesses.push({ label: `${PHASE_LABEL[worstPhase][0].toUpperCase()}${PHASE_LABEL[worstPhase].slice(1)} play`, detail: `${byPhase[worstPhase]} of your errors came in the ${PHASE_LABEL[worstPhase]} — your weakest phase this game.` });
  }
  if (weaknesses.length < 2 && mistakes > 0) {
    weaknesses.push({ label: 'Calculation', detail: `${mistakes} mistake${mistakes > 1 ? 's' : ''} shifted the game against you — moves that needed one more layer of calculation.` });
  }
  if (weaknesses.length < 2 && inaccuracies > 0) {
    weaknesses.push({ label: 'Precision', detail: `${inaccuracies} small inaccuracies added up. Tightening these keeps you in good positions longer.` });
  }

  // Strength
  let strength: StudyItem | null = null;
  const openingErrors = (() => { let c = 0; for (let m = 0; m < Math.min(16, moves.length); m++) { if (isUserMove(m, userColor) && LOSING.has(classMap.get(m) as MoveClassification)) c++; } return c; })();
  if (greats >= 2) strength = { label: 'Finding strong moves', detail: `You played ${greats} engine-top moves — when you see the idea, you play it well.` };
  else if (openingErrors === 0) strength = { label: 'Opening accuracy', detail: `You came out of the opening cleanly with no early errors — a solid foundation to build on.` };
  else if (blunders === 0) strength = { label: 'Steady play', detail: `No outright blunders — you avoided the big one-move disasters.` };

  // Training suggestion
  let training: StudyItem | null = null;
  if (blunders > 0) training = { label: 'Daily tactics puzzles', detail: 'Solve 10–15 tactics a day, focusing on spotting hanging pieces and forks before you move.' };
  else if (byPhase.endgame >= 2) training = { label: 'Endgame drills', detail: 'Practise basic king-and-pawn and rook endgames so winning positions convert.' };
  else if (byPhase.opening >= 2) training = { label: 'Opening review', detail: 'Review your main opening lines a few moves deeper so you stop drifting early.' };
  else if (mistakes + inaccuracies > 0) training = { label: 'Slow practice games', detail: 'Play longer time controls and double-check each move for your opponent\'s best reply.' };

  if (weaknesses.length === 0 && !strength && !training) return null;
  return { weaknesses, strength, training };
}
