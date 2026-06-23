/**
 * Review-Mistakes feed adapter (Phase 7). The single source of truth for
 * mistakes: the B-4 engine (`buildMistakeReview`) over detected mistakes, unioned
 * with the Send-to-Improve queue, mapped to the Ivory taxonomy. Pure + testable.
 */
import { buildMistakeReview, type MistakeInput } from '../../../lib/mistakeReview';
import { mapLegacyClassification } from '../../../lib/analysis/moveQuality';
import { MOTIF_INFO, type Motif } from '../../../lib/motifs';
import type { Phase } from '../../../lib/moveAnalysis';
import type { QueuedImport } from '../../../lib/improve/composePlan';
import type { MistakeFilterVM, MistakeMotifVM, ReviewMistakeVM } from './types';

function plyOf(moveNumber: number, color: 'white' | 'black'): number {
  return moveNumber * 2 - (color === 'white' ? 1 : 0);
}

function motifVMs(motifs: Motif[]): MistakeMotifVM[] {
  return motifs.map((m) => ({ key: m, label: MOTIF_INFO[m]?.label ?? m }));
}

function lessonFor(motifs: Motif[]): string {
  const first = motifs[0];
  return first ? MOTIF_INFO[first]?.definition ?? 'Review what went wrong here.' : 'A small slip — review the cleaner option.';
}

/** Pretty label for a raw Send-to-Improve motif string ("hanging-piece" → "Hanging piece"). */
function prettifyMotif(raw: string): string {
  const s = raw.replace(/[-_]/g, ' ').trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function detectedToVM(mistakes: MistakeInput[]): ReviewMistakeVM[] {
  // Build the whole feed once (no filter), then filter VMs uniformly downstream.
  return buildMistakeReview(mistakes, {}, 500).map((c) => ({
    id: `${c.gameId}:${plyOf(c.moveNumber, c.color)}`,
    gameId: c.gameId,
    ply: plyOf(c.moveNumber, c.color),
    moveNumber: c.moveNumber,
    fen: c.fen,
    playedSan: c.san,
    bestSan: c.bestMoveSan,
    quality: mapLegacyClassification(c.classification),
    phase: c.phase,
    motifs: motifVMs(c.motifs),
    cpLoss: c.cpLoss,
    lesson: lessonFor(c.motifs),
    priority: c.priority,
    source: 'detected' as const,
  }));
}

function queueToVM(queue: QueuedImport[]): ReviewMistakeVM[] {
  // Queued items are user-flagged → pinned high. Position context is sample for v1.
  return queue.map((q, i) => ({
    id: `${q.gameId}:${q.ply}`,
    gameId: q.gameId,
    ply: q.ply,
    moveNumber: Math.max(1, Math.ceil(q.ply / 2)),
    fen: 'r4rk1/ppp2ppp/2n5/2bqp3/8/2NP1N2/PPP2PPP/R2Q1RK1 w - - 0 12',
    playedSan: q.san || null,
    bestSan: null,
    quality: 'blunder' as const,
    phase: 'middlegame' as Phase,
    motifs: [{ key: q.motif, label: prettifyMotif(q.motif) }],
    cpLoss: 300,
    lesson: 'You flagged this from your analysis — review the better continuation.',
    priority: 100000 - i, // pin flagged items above detected, preserving queue order
    source: 'send-to-improve' as const,
  }));
}

/**
 * Compose the review feed (single source of truth). Queued (flagged) mistakes
 * take precedence over a detected duplicate at the same `id`; result is
 * priority-ordered. Filtering is a separate, reusable step (`applyFilter`).
 */
export function buildReviewFeed(detected: MistakeInput[], queue: QueuedImport[]): ReviewMistakeVM[] {
  const queued = queueToVM(queue);
  const queuedIds = new Set(queued.map((q) => q.id));
  return [...queued, ...detectedToVM(detected).filter((d) => !queuedIds.has(d.id))]
    .sort((a, b) => b.priority - a.priority);
}

export function applyFilter(feed: ReviewMistakeVM[], filter: MistakeFilterVM): ReviewMistakeVM[] {
  return feed.filter((m) => {
    if (filter.phase !== 'all' && m.phase !== filter.phase) return false;
    if (filter.motif !== 'all' && !m.motifs.some((x) => x.key === filter.motif)) return false;
    return true;
  });
}

/** Distinct motif options present in a feed (for the filter chips). */
export function motifOptions(feed: ReviewMistakeVM[]): MistakeMotifVM[] {
  const seen = new Map<string, string>();
  for (const m of feed) for (const x of m.motifs) if (!seen.has(x.key)) seen.set(x.key, x.label);
  return [...seen].map(([key, label]) => ({ key, label }));
}
