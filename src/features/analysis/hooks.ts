import { useEffect, useMemo, useRef, useState } from 'react';
import { getSampleGame, getSampleMoves, getSampleTurningPoints, computeAccuracies } from './sampleAnalysis';
import type { AnalysisMoveVM, AnalysisVM, GameVM } from './types';

/**
 * Game + analysis for the workspace (Phase 5, decisions #3/#4).
 *
 * The full move list (SAN + FEN) is available immediately so the board and move
 * list paint at once; the *analysis* (eval, quality, best) populates
 * **progressively** — simulating the client engine running on open, with no
 * mandatory Analyze button. When the real client-Stockfish runner lands, only
 * this hook changes (the component contracts are stable).
 *
 * `instant` reveals everything synchronously (used by tests).
 */
export function useAnalysis(gameId: string, opts: { instant?: boolean } = {}): {
  game: GameVM;
  moves: AnalysisMoveVM[];
  analysis: AnalysisVM;
} {
  const game = useMemo(() => getSampleGame(), []);
  const full = useMemo(() => getSampleMoves(), []);
  const total = full.length;
  const [analyzed, setAnalyzed] = useState(opts.instant ? total : 0);
  const reduceMotion = useRef(typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);

  useEffect(() => {
    if (opts.instant) { setAnalyzed(total); return; }
    setAnalyzed(0);
    if (reduceMotion.current) { setAnalyzed(total); return; }
    let p = 0;
    const id = window.setInterval(() => {
      p += 2;
      if (p >= total) { p = total; window.clearInterval(id); }
      setAnalyzed(p);
    }, 110);
    return () => window.clearInterval(id);
  }, [gameId, total, opts.instant]);

  // Reveal analysis fields progressively; SAN/FEN are always present.
  const moves = useMemo<AnalysisMoveVM[]>(
    () => full.map((m) => (m.ply <= analyzed
      ? m
      : { ...m, evalCp: null, mate: null, cpLoss: null, quality: null, bestSan: null, bestEvalCp: null })),
    [full, analyzed],
  );

  const done = analyzed >= total;
  const acc = done ? computeAccuracies() : null;
  const analysis: AnalysisVM = {
    status: done ? 'analyzed' : 'analyzing',
    analyzedPlies: analyzed,
    totalPlies: total,
    accuracyUser: acc?.user ?? null,
    accuracyOpponent: acc?.opponent ?? null,
    turningPoints: done ? getSampleTurningPoints() : [],
  };

  return { game, moves, analysis };
}
