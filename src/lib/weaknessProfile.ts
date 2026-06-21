import { detectOpening } from './openings';
import type { Phase } from './moveAnalysis';
import type { MoveClassification } from '../utils/moveClassifier';

// ─────────────────────────────────────────────────────────────────────────────
// Weakness Detection Engine — Phase 1 (read-only, from existing stored data).
//
// Turns the data ChessMate already collects (per-game accuracy/mistakes/blunders
// + game result + user_color + the game PGN) into a categorized, evidence-backed
// weakness profile. No new schema, no per-move data, no analysis jobs — pure
// aggregation over rows already fetched for the Progress view.
//
// Honesty model: each weakness carries a `confidence`. Opening, recurring-mistake
// and color weaknesses are computed directly from data (low→high confidence by
// sample size). True opening/middlegame/endgame phase attribution needs per-move
// evals we do not persist, so the "phase" signal is an explicit game-length proxy
// marked low confidence (see DESIGN note) rather than a fabricated attribution.
// ─────────────────────────────────────────────────────────────────────────────

export type WeaknessCategory = 'opening' | 'recurring' | 'phase' | 'color';
export type Confidence = 'low' | 'medium' | 'high';
export type Trend = 'improving' | 'worsening' | 'stable' | 'unknown';

export interface WeaknessGame {
  id: string;
  result: string; // '1-0' | '0-1' | '1/2-1/2' | '*'
  user_color: 'white' | 'black' | null;
  pgn: string;
  uploaded_at: string;
  analysis?: {
    accuracy: number;
    mistakes: number;
    inaccuracies: number;
    blunders: number;
    total_moves?: number;
  } | null;
}

export interface Weakness {
  id: string;
  category: WeaknessCategory;
  title: string;
  detail: string;
  /** 0–100, higher = more pronounced weakness. */
  severity: number;
  confidence: Confidence;
  evidence: string[];
  trend: Trend;
  sampleSize: number;
}

/** One of the user's own moves with its derived phase, from move_analysis. */
export interface PhaseMove {
  phase: Phase;
  classification: MoveClassification;
}

export interface PhaseStrength {
  phase: Phase;
  /** 0–100 accuracy = share of the user's moves rated good-or-better in this phase. */
  strength: number;
  moves: number;
  mistakes: number; // mistake + blunder count
  blunders: number;
  confidence: Confidence;
}

export type PhaseStrengths = Partial<Record<Phase, PhaseStrength>>;

export interface WeaknessProfile {
  weaknesses: Weakness[];
  gamesConsidered: number;
  decidedGames: number;
  analyzedGames: number;
  /** Per-phase strength from real classified moves (empty until games are analyzed under B-1+). */
  phaseStrengths: PhaseStrengths;
  /** Total user moves with phase data — drives whether phase strengths are shown. */
  phaseMoveCount: number;
  /** Compact one-liner for the AI coach context. Empty when nothing significant. */
  summaryLine: string;
}

type Outcome = 'win' | 'loss' | 'draw';

const MIN_GROUP = 3; // minimum games to make any claim
const WINRATE_MARGIN = 0.1; // how far below baseline counts as a weakness
const MIN_PHASE_MOVES = 20; // minimum of the user's own moves in a phase to score it
const PHASE_GAP_MARGIN = 8; // accuracy-point gap (best vs worst phase) to flag a weakness

function outcome(g: WeaknessGame): Outcome | null {
  if (!g.user_color || g.result === '*' || !g.result) return null;
  if (g.result === '1/2-1/2') return 'draw';
  const userWon =
    (g.user_color === 'white' && g.result === '1-0') ||
    (g.user_color === 'black' && g.result === '0-1');
  const userLost =
    (g.user_color === 'white' && g.result === '0-1') ||
    (g.user_color === 'black' && g.result === '1-0');
  return userWon ? 'win' : userLost ? 'loss' : null;
}

/** Win-rate counting draws as 0.5. Returns null for an empty set. */
function score(games: WeaknessGame[]): number | null {
  const decided = games.map(outcome).filter((o): o is Outcome => o !== null);
  if (!decided.length) return null;
  const pts = decided.reduce((s, o) => s + (o === 'win' ? 1 : o === 'draw' ? 0.5 : 0), 0);
  return pts / decided.length;
}

function confidenceFor(n: number): Confidence {
  if (n >= 10) return 'high';
  if (n >= 5) return 'medium';
  return 'low';
}

// Phase strength accumulates moves across games, so the bar is higher than games.
function phaseConfidenceFor(moves: number): Confidence {
  if (moves >= 100) return 'high';
  if (moves >= 50) return 'medium';
  return 'low';
}

const GOOD_OR_BETTER: ReadonlySet<MoveClassification> = new Set(['best', 'excellent', 'good']);
const PHASES: readonly Phase[] = ['opening', 'middlegame', 'endgame'];
const PHASE_LABEL: Record<Phase, string> = { opening: 'opening', middlegame: 'middlegame', endgame: 'endgame' };

/**
 * Extract opening SAN tokens from a PGN cheaply (no chess.js replay): strip
 * headers, comments, NAGs, variations, move numbers and the result, then take
 * the first `maxPlies` tokens. Good enough for longest-prefix opening matching.
 */
export function extractOpeningMoves(pgn: string, maxPlies = 14): string[] {
  if (!pgn) return [];
  const body = pgn
    .replace(/\[[^\]]*\]/g, ' ') // headers
    .replace(/\{[^}]*\}/g, ' ') // comments
    .replace(/\([^)]*\)/g, ' ') // variations
    .replace(/\$\d+/g, ' ') // NAGs
    .replace(/\d+\.(\.\.)?/g, ' ') // move numbers (1. , 1...)
    .replace(/\b(1-0|0-1|1\/2-1\/2|\*)\b/g, ' '); // result
  return body
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t && /^[a-hKQRBNOx0-8+#=-]+$/.test(t))
    .slice(0, maxPlies);
}

/** Trend of the newer half vs the older half of a chronologically-sorted set. */
function trendOf(sortedOldToNew: WeaknessGame[], metricHigherIsBetter: (g: WeaknessGame[]) => number | null): Trend {
  if (sortedOldToNew.length < 6) return 'unknown';
  const mid = Math.floor(sortedOldToNew.length / 2);
  const older = metricHigherIsBetter(sortedOldToNew.slice(0, mid));
  const newer = metricHigherIsBetter(sortedOldToNew.slice(mid));
  if (older === null || newer === null) return 'unknown';
  const delta = newer - older;
  if (delta > 0.08) return 'improving';
  if (delta < -0.08) return 'worsening';
  return 'stable';
}

const pct = (x: number) => `${Math.round(x * 100)}%`;

export function buildWeaknessProfile(games: WeaknessGame[], moves: PhaseMove[] = []): WeaknessProfile {
  const byTime = [...games].sort((a, b) => a.uploaded_at.localeCompare(b.uploaded_at));
  const decided = byTime.filter((g) => outcome(g) !== null);
  const analyzed = byTime.filter((g) => g.analysis);
  const baseline = score(decided);

  const weaknesses: Weakness[] = [];

  // ── 1. Opening weaknesses ────────────────────────────────────────────────
  if (baseline !== null) {
    const groups = new Map<string, WeaknessGame[]>();
    for (const g of decided) {
      const op = detectOpening(extractOpeningMoves(g.pgn));
      if (!op) continue;
      const arr = groups.get(op.name);
      if (arr) arr.push(g);
      else groups.set(op.name, [g]);
    }
    for (const [name, gs] of groups) {
      if (gs.length < MIN_GROUP) continue;
      const wr = score(gs);
      if (wr === null || wr >= baseline - WINRATE_MARGIN) continue;
      const accs = gs.map((g) => g.analysis?.accuracy).filter((a): a is number => typeof a === 'number');
      const avgAcc = accs.length ? accs.reduce((s, a) => s + a, 0) / accs.length : null;
      const evidence = [
        `${gs.length} games · ${pct(wr)} score (vs ${pct(baseline)} overall)`,
      ];
      if (avgAcc !== null) evidence.push(`avg accuracy ${avgAcc.toFixed(1)}%`);
      weaknesses.push({
        id: `opening:${name}`,
        category: 'opening',
        title: `Struggles in the ${name}`,
        detail: `You score ${pct(wr)} in the ${name}, below your ${pct(baseline)} overall.`,
        severity: Math.min(100, Math.round((baseline - wr) * 220)),
        confidence: confidenceFor(gs.length),
        evidence,
        trend: trendOf(gs, score),
        sampleSize: gs.length,
      });
    }
  }

  // ── 2. Color weakness ────────────────────────────────────────────────────
  if (baseline !== null) {
    for (const color of ['white', 'black'] as const) {
      const gs = decided.filter((g) => g.user_color === color);
      if (gs.length < MIN_GROUP) continue;
      const wr = score(gs);
      if (wr === null || wr >= baseline - WINRATE_MARGIN) continue;
      weaknesses.push({
        id: `color:${color}`,
        category: 'color',
        title: `Weaker as ${color === 'white' ? 'White' : 'Black'}`,
        detail: `As ${color}, you score ${pct(wr)} — below your ${pct(baseline)} overall.`,
        severity: Math.min(100, Math.round((baseline - wr) * 200)),
        confidence: confidenceFor(gs.length),
        evidence: [`${gs.length} games as ${color} · ${pct(wr)} score`],
        trend: trendOf(gs, score),
        sampleSize: gs.length,
      });
    }
  }

  // ── 3. Recurring mistakes (blunders) ─────────────────────────────────────
  if (analyzed.length >= MIN_GROUP) {
    const blunderGames = analyzed.filter((g) => (g.analysis!.blunders ?? 0) > 0);
    const rate = blunderGames.length / analyzed.length;
    const avgBlunders =
      analyzed.reduce((s, g) => s + (g.analysis!.blunders ?? 0), 0) / analyzed.length;
    if (rate >= 0.4 || avgBlunders >= 1) {
      const blunderRate = (gs: WeaknessGame[]) => {
        const a = gs.filter((g) => g.analysis);
        return a.length ? 1 - a.filter((g) => (g.analysis!.blunders ?? 0) > 0).length / a.length : null;
      };
      weaknesses.push({
        id: 'recurring:blunders',
        category: 'recurring',
        title: 'Recurring blunders',
        detail: `You blunder in ${pct(rate)} of your analyzed games (${avgBlunders.toFixed(1)} per game on average).`,
        severity: Math.min(100, Math.round(rate * 100)),
        confidence: confidenceFor(analyzed.length),
        evidence: [
          `${blunderGames.length} of ${analyzed.length} analyzed games had ≥1 blunder`,
          `${avgBlunders.toFixed(1)} blunders/game`,
        ],
        // blunderRate is "higher = fewer blunders" so it aligns with trendOf.
        trend: trendOf(analyzed, blunderRate),
        sampleSize: analyzed.length,
      });
    }
  }

  // ── 4. True phase strength + weakness (from move_analysis, B-2) ──────────
  // `moves` are the USER's own moves (the hook filters to color === user_color),
  // each carrying a per-move derived phase. This replaces the old game-length
  // proxy with real opening/middlegame/endgame attribution.
  const phaseStrengths: PhaseStrengths = {};
  for (const phase of PHASES) {
    const pm = moves.filter((m) => m.phase === phase);
    if (pm.length < MIN_PHASE_MOVES) continue;
    const goodOrBetter = pm.filter((m) => GOOD_OR_BETTER.has(m.classification)).length;
    const blunders = pm.filter((m) => m.classification === 'blunder').length;
    const mistakes = pm.filter((m) => m.classification === 'mistake' || m.classification === 'blunder').length;
    phaseStrengths[phase] = {
      phase,
      strength: Math.round((goodOrBetter / pm.length) * 100),
      moves: pm.length,
      mistakes,
      blunders,
      confidence: phaseConfidenceFor(pm.length),
    };
  }

  const presentPhases = PHASES.map((p) => phaseStrengths[p]).filter((s): s is PhaseStrength => !!s);
  if (presentPhases.length >= 2) {
    const best = presentPhases.reduce((a, b) => (b.strength > a.strength ? b : a));
    const worst = presentPhases.reduce((a, b) => (b.strength < a.strength ? b : a));
    const gap = best.strength - worst.strength;
    if (gap >= PHASE_GAP_MARGIN) {
      const label = PHASE_LABEL[worst.phase];
      weaknesses.push({
        id: `phase:${worst.phase}`,
        category: 'phase',
        title: `Weakest in the ${label}`,
        detail: `Your ${label} accuracy is ${worst.strength}% vs ${best.strength}% in your strongest phase (the ${PHASE_LABEL[best.phase]}).`,
        severity: Math.min(100, Math.round(gap * 3)),
        confidence: worst.confidence,
        evidence: [
          `${worst.moves} ${label} moves · ${worst.strength}% good-or-better`,
          `${worst.blunders} blunder${worst.blunders === 1 ? '' : 's'} in the ${label}`,
        ],
        trend: 'unknown',
        sampleSize: worst.moves,
      });
    }
  }

  // Rank: severity weighted by confidence, strongest first.
  const confWeight: Record<Confidence, number> = { high: 1, medium: 0.85, low: 0.7 };
  weaknesses.sort((a, b) => b.severity * confWeight[b.confidence] - a.severity * confWeight[a.confidence]);
  const top = weaknesses.slice(0, 5);

  const summaryLine = top.length
    ? `Known weaknesses: ${top.slice(0, 3).map((w) => w.title.toLowerCase()).join('; ')}.`
    : '';

  return {
    weaknesses: top,
    gamesConsidered: games.length,
    decidedGames: decided.length,
    analyzedGames: analyzed.length,
    phaseStrengths,
    phaseMoveCount: moves.length,
    summaryLine,
  };
}
