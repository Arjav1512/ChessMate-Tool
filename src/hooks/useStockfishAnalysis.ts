/**
 * useStockfishAnalysis — owns the Stockfish engine lifecycle and all analysis
 * state, extracted verbatim from the original EnginePanel so the engine
 * behaviour is byte-for-byte identical. Exposing it as a hook lets a single
 * engine instance feed multiple presentational surfaces (the v2 tabbed right
 * panel) instead of being trapped inside one monolithic component.
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Chess } from 'chess.js';
import type { Square, PieceSymbol } from 'chess.js';
import { StockfishEngine } from '../lib/stockfish';
import type { StockfishAnalysis } from '../lib/stockfish';
import {
  classifyMove,
  MoveClassification,
  summariseClassifications,
} from '../utils/moveClassifier';
import type { PGNData } from '../lib/pgn';

// ─── UCI → SAN conversion ────────────────────────────────────────────────────

function pvToSan(startFen: string, pvUci: string[]): string[] {
  try {
    const chess = new Chess(startFen);
    const result: string[] = [];
    for (const uci of pvUci) {
      if (uci.length < 4) break;
      const move = chess.move({
        from: uci.slice(0, 2) as Square,
        to: uci.slice(2, 4) as Square,
        promotion: uci.length > 4 ? (uci[4] as PieceSymbol) : undefined,
      });
      if (!move) break;
      result.push(move.san);
    }
    return result;
  } catch {
    return pvUci; // fall back to UCI if conversion fails
  }
}

export interface UseStockfishAnalysisParams {
  /** Current board FEN — updated as user navigates moves. */
  fen: string;
  /** Full parsed game — needed for full-game analysis. */
  pgnData: PGNData | null;
  /** Fired on every live engine update (null when engine off). */
  onAnalysis?: (result: StockfishAnalysis | null) => void;
  /** Fired when full-game analysis finishes. */
  onClassifications?: (
    map: Map<number, MoveClassification>,
    evals: number[],
  ) => void;
  /**
   * When false the engine is initialised but does NOT auto-analyse on every
   * FEN change — the user must trigger a one-shot eval.
   */
  autoAnalysis?: boolean;
}

export function useStockfishAnalysis({
  fen,
  pgnData,
  onAnalysis,
  onClassifications,
  autoAnalysis = true,
}: UseStockfishAnalysisParams) {
  // ── Controls ────────────────────────────────────────────────────────────────
  const [engineOn, setEngineOn] = useState(true);
  const [depth, setDepth] = useState(20);
  const [multiPV, setMultiPV] = useState(3);
  const [infinite, setInfinite] = useState(false);

  // ── Live analysis state ──────────────────────────────────────────────────────
  const [liveResult, setLiveResult] = useState<StockfishAnalysis | null>(null);
  const [engineReady, setEngineReady] = useState(false);
  const [engineError, setEngineError] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  // ── Full game analysis ────────────────────────────────────────────────────
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number } | null>(null);
  const [bulkEvals, setBulkEvals] = useState<number[]>([]);
  const [bulkAbort, setBulkAbort] = useState<AbortController | null>(null);
  const [classMap, setClassMap] = useState<Map<number, MoveClassification>>(new Map());

  // ── Engine instance ──────────────────────────────────────────────────────────
  const [engine] = useState(() => new StockfishEngine());
  const analysisPending = useRef(false);

  // Terminate on unmount
  useEffect(() => {
    return () => {
      engine.terminate();
      setBulkAbort(prev => { prev?.abort(); return null; });
    };
  }, [engine]);

  // ── Initialize engine ─────────────────────────────────────────────────────
  const retryEngine = useCallback(() => {
    setEngineError(null);
    setEngineReady(false);
    engine.terminate();
    engine.initialize()
      .then(() => setEngineReady(true))
      .catch((err) => setEngineError(err instanceof Error ? err.message : String(err)));
  }, [engine]);

  useEffect(() => {
    if (!engineOn) return;
    let cancelled = false;
    engine.initialize()
      .then(() => { if (!cancelled) setEngineReady(true); })
      .catch((err) => {
        if (!cancelled) setEngineError(err instanceof Error ? err.message : String(err));
      });
    return () => { cancelled = true; };
  }, [engine, engineOn]);

  // ── Live analysis — triggered when fen / controls / engineOn changes ───────
  const startLiveAnalysis = useCallback(async (targetFen: string) => {
    if (!engineOn || !engineReady) return;
    setAnalyzing(true);
    analysisPending.current = true;
    try {
      const result = await engine.analyzePositionLive(
        targetFen,
        { depth, multiPV, infinite },
        (partialResult) => {
          if (!analysisPending.current) return;
          setLiveResult(partialResult);
          onAnalysis?.(partialResult);
        },
      );
      if (analysisPending.current) {
        setLiveResult(result);
        onAnalysis?.(result);
      }
    } catch (err) {
      console.error('useStockfishAnalysis: live analysis error', err);
    } finally {
      if (analysisPending.current) {
        setAnalyzing(false);
        analysisPending.current = false;
      }
    }
  }, [engine, engineOn, engineReady, depth, multiPV, infinite, onAnalysis]);

  // When engine turned off — clear results
  useEffect(() => {
    if (!engineOn) {
      analysisPending.current = false;
      engine.stopAnalysis();
      setLiveResult(null);
      setAnalyzing(false);
      onAnalysis?.(null);
    }
  }, [engineOn, engine, onAnalysis]);

  // Trigger analysis when fen or options change — only in auto mode
  useEffect(() => {
    if (!engineOn || !engineReady || !autoAnalysis) return;
    analysisPending.current = false; // invalidate any in-flight call
    engine.stopAnalysis();
    const timer = setTimeout(() => startLiveAnalysis(fen), 80);
    return () => clearTimeout(timer);
  }, [fen, engineOn, engineReady, depth, multiPV, infinite, autoAnalysis, startLiveAnalysis, engine]);

  // Manual analysis trigger (used when autoAnalysis=false)
  const handleManualAnalyze = useCallback(() => {
    if (!engineOn || !engineReady) return;
    analysisPending.current = false;
    engine.stopAnalysis();
    setTimeout(() => startLiveAnalysis(fen), 40);
  }, [engineOn, engineReady, engine, fen, startLiveAnalysis]);

  // ── Full-game analysis ────────────────────────────────────────────────────
  const startFullGameAnalysis = useCallback(async () => {
    if (!pgnData || bulkProgress) return;

    const ac = new AbortController();
    setBulkAbort(ac);
    setBulkProgress({ done: 0, total: pgnData.fen.length });
    setBulkEvals([]);

    // Pause live analysis
    analysisPending.current = false;
    engine.stopAnalysis();
    setAnalyzing(false);

    const collectedEvals: number[] = [];
    const collectedMap = new Map<number, MoveClassification>();

    try {
      await engine.initialize();

      for (let i = 0; i < pgnData.fen.length; i++) {
        if (ac.signal.aborted) break;

        const result = await engine.analyzePosition(pgnData.fen[i], 16, 1);
        const evalNum = result.isMate
          ? (result.evaluation.startsWith('-') ? -999 : 999)
          : parseFloat(result.evaluation) || 0;

        collectedEvals.push(evalNum);

        // Classify move i (move i = pgnData.moves[i-1], positions: fen[i-1] → fen[i])
        if (i > 0) {
          const evalBefore = collectedEvals[i - 1] * 100; // to centipawns
          const evalAfter = collectedEvals[i] * 100;
          const isWhiteMove = (i - 1) % 2 === 0; // moves[0] is White's first move
          const isBestMove = result.bestMove === (pgnData.moves[i - 1] ?? '');
          collectedMap.set(i - 1, classifyMove(evalBefore, evalAfter, isWhiteMove, isBestMove));
        }

        setBulkProgress({ done: i + 1, total: pgnData.fen.length });
        setBulkEvals([...collectedEvals]);
      }

      if (!ac.signal.aborted) {
        setClassMap(collectedMap);
        onClassifications?.(collectedMap, collectedEvals);
      }
    } catch (err) {
      console.error('Full game analysis error', err);
    } finally {
      setBulkProgress(null);
      setBulkAbort(null);
      // Restart live analysis at current position
      if (!ac.signal.aborted && engineOn) {
        setTimeout(() => startLiveAnalysis(fen), 200);
      }
    }
  }, [pgnData, engine, bulkProgress, engineOn, fen, startLiveAnalysis, onClassifications]);

  const cancelFullGameAnalysis = useCallback(() => {
    bulkAbort?.abort();
    setBulkProgress(null);
    setBulkAbort(null);
  }, [bulkAbort]);

  // ── Derived: SAN PV lines ─────────────────────────────────────────────────
  const pvLines = useMemo(() => {
    if (!liveResult) return [];
    return liveResult.variations.map((v) => ({
      ...v,
      san: pvToSan(fen, v.pv),
    }));
  }, [liveResult, fen]);

  const classSummary = useMemo(
    () => summariseClassifications(classMap),
    [classMap],
  );

  return {
    // controls
    engineOn, setEngineOn,
    depth, setDepth,
    multiPV, setMultiPV,
    infinite, setInfinite,
    // live state
    liveResult, engineReady, engineError, analyzing,
    // full-game state
    bulkProgress, bulkEvals, classMap,
    // derived
    pvLines, classSummary,
    // actions
    retryEngine, handleManualAnalyze,
    startFullGameAnalysis, cancelFullGameAnalysis,
  };
}

export type StockfishAnalysisApi = ReturnType<typeof useStockfishAnalysis>;
