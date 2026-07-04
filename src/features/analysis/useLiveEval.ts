import { useEffect, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import { stockfish, type StockfishAnalysis } from '../../lib/stockfish';

/**
 * Live engine read of a single position (Lichess-style). Runs Stockfish on the
 * board's current/explored FEN and streams the eval + best line back so the user
 * can test their own moves and instantly see whether the idea works.
 *
 * White-POV eval (matches the eval bar). Debounced so rapid moves collapse to
 * the settled position, and `analyzePositionLive` cancels the prior search, so
 * only the latest position is analysed. Fails soft: on any engine error the
 * caller falls back to the stored game analysis.
 */
export interface LiveEval {
  loading: boolean;   // engine working, no result yet for this fen
  ready: boolean;     // engine returned at least one depth for this fen
  error: boolean;     // engine unavailable / failed
  evalCp: number | null;  // centipawns, White POV
  mate: number | null;    // mate-in-N, White POV (+ = White mates)
  bestUci: string | null; // e.g. "e2e4"
  bestSan: string | null;
  pvSan: string[];        // best line in SAN
  depth: number;
}

const EMPTY: LiveEval = {
  loading: false, ready: false, error: false,
  evalCp: null, mate: null, bestUci: null, bestSan: null, pvSan: [], depth: 0,
};

/** Convert a UCI principal variation to SAN from `fen` (stops at the first illegal move). */
function pvToSan(fen: string, uciPv: string[]): { first: string | null; line: string[] } {
  const c = new Chess();
  try { c.load(fen); } catch { return { first: null, line: [] }; }
  const line: string[] = [];
  for (const uci of uciPv) {
    if (!uci || uci.length < 4) break;
    try {
      const m = c.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] as never });
      if (!m) break;
      line.push(m.san);
    } catch { break; }
  }
  return { first: line[0] ?? null, line };
}

function toLiveEval(res: StockfishAnalysis, fen: string): LiveEval {
  const top = res.variations[0];
  const bestUci = res.bestMove || top?.move || null;
  const mate = top?.isMate ? top.score : null;
  const evalCp = top && !top.isMate ? Math.round(top.score * 100) : null;
  const { first, line } = pvToSan(fen, top?.pv?.length ? top.pv : (bestUci ? [bestUci] : []));
  return {
    loading: false, ready: true, error: false,
    evalCp, mate, bestUci, bestSan: first, pvSan: line, depth: res.depth,
  };
}

export function useLiveEval(fen: string | null, enabled: boolean, depth = 14): LiveEval {
  const [state, setState] = useState<LiveEval>(EMPTY);
  const runId = useRef(0);

  useEffect(() => {
    if (!enabled || !fen) { setState(EMPTY); return; }
    const myRun = ++runId.current;
    let cancelled = false;
    setState({ ...EMPTY, loading: true });

    const timer = setTimeout(() => {
      stockfish
        .analyzePositionLive(fen, { depth, multiPV: 1 }, (res) => {
          if (cancelled || myRun !== runId.current) return;
          if (res.variations.length) setState(toLiveEval(res, fen));
        })
        .then((res) => {
          if (cancelled || myRun !== runId.current) return;
          setState(toLiveEval(res, fen));
        })
        .catch(() => {
          if (!cancelled && myRun === runId.current) setState({ ...EMPTY, error: true });
        });
    }, 150);

    return () => { cancelled = true; clearTimeout(timer); };
  }, [fen, enabled, depth]);

  return state;
}
