import { detectOpening } from '../../lib/openings';
import { extractOpeningMoves } from '../../lib/weaknessProfile';
import { CLASSIFICATION } from '../../utils/moveClassifier';
import type { CoachContext } from './types';

// ─────────────────────────────────────────────────────────────────────────────
// Context builder — normalizes raw app data into a CoachContext and renders it
// into the compact, labeled block the prompt-assembly pipeline embeds. Pure
// functions only: no Supabase, no network — callers pass in data the app has
// already loaded, honoring "ChessMate assembles everything first".
// ─────────────────────────────────────────────────────────────────────────────

/** Caps keep the rendered block small; the transport budget is ~4000 chars. */
const MAX_HISTORY_PLIES = 40;
const MAX_RECENT_MISTAKES = 5;
const MAX_RECENT_GAMES = 5;
const MAX_QUEUE_ITEMS = 5;

/**
 * Pipeline-stage abstraction over context assembly. Async because future
 * builders may gather parts server-side (recent games, weakness profile);
 * the Phase-1 builder is pure and derives only what the caller supplied.
 */
export interface ContextBuilder {
  build(input: CoachContext): Promise<CoachContext>;
}

/** The default builder: pure normalization + derivation, no I/O. */
export class ChessContextBuilder implements ContextBuilder {
  async build(input: CoachContext): Promise<CoachContext> {
    return buildCoachContext(input);
  }
}

/**
 * Normalize a caller-supplied context: derive what is derivable (opening from
 * PGN) and drop empty containers, so rendering and retrieval see one shape.
 */
export function buildCoachContext(input: CoachContext): CoachContext {
  const context: CoachContext = { ...input };

  if (context.game) {
    const game = { ...context.game };
    if (!game.opening && game.pgn) {
      const detected = detectOpening(extractOpeningMoves(game.pgn));
      if (detected) game.opening = { eco: detected.eco, name: detected.name };
    }
    context.game = game;
  }

  return context;
}

function playersLine(context: CoachContext): string | null {
  const g = context.game;
  if (!g || (!g.white && !g.black)) return null;
  const rated = (name: string | undefined, rating: number | null | undefined) =>
    name ? (rating ? `${name} (${rating})` : name) : '?';
  let line = `Game: ${rated(g.white, g.whiteRating)} vs ${rated(g.black, g.blackRating)}`;
  if (g.result && g.result !== '*') line += `, result ${g.result}`;
  if (g.userColor) line += ` — the player is ${g.userColor === 'white' ? 'White' : 'Black'}`;
  return line;
}

function moveLine(context: CoachContext): string | null {
  const m = context.move;
  if (!m?.san) return null;
  const number = m.moveNumber ? `${m.moveNumber}${m.color === 'black' ? '...' : '.'}` : '';
  let line = `Move under discussion: ${number}${m.san}`;
  if (m.classification) {
    const label = CLASSIFICATION[m.classification].label.toLowerCase();
    line += m.cpLoss != null ? ` (${label}, lost ${m.cpLoss}cp)` : ` (${label})`;
  }
  if (m.bestMove) line += `; engine preferred ${m.bestMove}`;
  if (m.phase) line += `; phase: ${m.phase}`;
  if (m.motifs?.length) line += `; motifs: ${m.motifs.join(', ')}`;
  return line;
}

function evalLine(context: CoachContext): string | null {
  const e = context.move?.evaluation;
  if (!e) return null;
  let line = `Engine evaluation: ${e.evaluation}${e.isMate ? ' (forced mate)' : ''}`;
  if (e.bestMove && !context.move?.bestMove) line += `, best move ${e.bestMove}`;
  return line;
}

/**
 * Render the context as compact labeled lines. Absent data is omitted, never
 * invented. The output is embedded verbatim by the prompt assembler.
 */
export function renderContext(context: CoachContext): string {
  const lines: (string | null)[] = [];

  lines.push(playersLine(context));
  if (context.game?.opening) {
    const { eco, name } = context.game.opening;
    lines.push(`Opening: ${eco ? `${eco} ` : ''}${name}`);
  }
  if (context.fen) lines.push(`Position (FEN): ${context.fen}`);
  lines.push(moveLine(context));
  lines.push(evalLine(context));

  if (context.moveHistory?.length) {
    const recent = context.moveHistory.slice(-MAX_HISTORY_PLIES);
    const prefix = context.moveHistory.length > recent.length ? '… ' : '';
    lines.push(`Moves so far: ${prefix}${recent.join(' ')}`);
  }

  const p = context.player;
  if (p) {
    if (p.rating) lines.push(`Player rating: ${p.rating}`);
    if (p.accuracy != null && p.accuracy > 0) lines.push(`Player's average accuracy: ${p.accuracy}%`);
    if (p.weaknessSummary) lines.push(p.weaknessSummary.startsWith('Known weaknesses') ? p.weaknessSummary : `Known weaknesses: ${p.weaknessSummary}`);
    for (const m of p.recentMistakes?.slice(0, MAX_RECENT_MISTAKES) ?? []) {
      lines.push(`Recent mistake: ${m}`);
    }
    for (const g of p.recentGames?.slice(0, MAX_RECENT_GAMES) ?? []) {
      lines.push(`Recent game: ${g}`);
    }
  }

  if (context.improveQueue?.length) {
    const items = context.improveQueue
      .slice(0, MAX_QUEUE_ITEMS)
      .map((q) => `${q.san} (${q.motif.replace(/[-_]/g, ' ')}${q.phase ? `, ${q.phase}` : ''})`);
    lines.push(`Positions the player queued for study: ${items.join('; ')}`);
  }

  return lines.filter((l): l is string => !!l).join('\n');
}
