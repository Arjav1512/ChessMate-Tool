/**
 * EnginePanel — Lichess-style Stockfish analysis panel.
 *
 * Features:
 *   • Engine on/off toggle
 *   • Depth slider (1–30) + Infinite toggle
 *   • MultiPV selector (1–5 pill buttons)
 *   • Live streaming eval with depth & nps
 *   • PV lines in SAN notation (up to 5 lines)
 *   • "Analyze Full Game" with sequential per-position analysis + progress bar
 *   • Evaluation graph SVG (sparkline over all game positions)
 *   • Classification summary bar (★ / ! / ✓ / ?! / ? / ??)
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Chess } from 'chess.js';
import { StockfishEngine } from '../../lib/stockfish';
import type { StockfishAnalysis } from '../../lib/stockfish';
import {
  classifyMove,
  MoveClassification,
  CLASSIFICATION,
  summariseClassifications,
} from '../../utils/moveClassifier';
import type { PGNData } from '../../lib/pgn';
import { LoadingSpinner } from '../ui/LoadingSpinner';

// ─── UCI → SAN conversion ────────────────────────────────────────────────────

function pvToSan(startFen: string, pvUci: string[]): string[] {
  try {
    const chess = new Chess(startFen);
    const result: string[] = [];
    for (const uci of pvUci) {
      if (uci.length < 4) break;
      const move = chess.move({
        from: uci.slice(0, 2) as any,
        to: uci.slice(2, 4) as any,
        promotion: uci.length > 4 ? (uci[4] as any) : undefined,
      });
      if (!move) break;
      result.push(move.san);
    }
    return result;
  } catch {
    return pvUci; // fall back to UCI if conversion fails
  }
}

// ─── Eval graph ──────────────────────────────────────────────────────────────

interface EvalGraphProps {
  evals: number[];          // one per position (0 = start, 1 = after move 1 …)
  currentIndex: number;
  onSeek?: (index: number) => void;
}

function EvalGraph({ evals, currentIndex, onSeek }: EvalGraphProps) {
  const W = 260, H = 72;
  if (evals.length < 2) return null;

  const clamp = (v: number) => Math.max(-6, Math.min(6, v));
  const yPct = (v: number) => 50 - (clamp(v) / 6) * 50; // percent from top

  const pts = evals.map((e, i) => ({
    x: (i / (evals.length - 1)) * W,
    y: (yPct(e) / 100) * H,
    e,
  }));

  // Build filled white path (above midline)
  const midY = H / 2;
  let whitePath = `M0,${midY}`;
  pts.forEach(({ x, y }) => {
    whitePath += ` L${x},${Math.min(y, midY)}`;
  });
  whitePath += ` L${W},${midY} Z`;

  // Build filled black path (below midline)
  let blackPath = `M0,${midY}`;
  pts.forEach(({ x, y }) => {
    blackPath += ` L${x},${Math.max(y, midY)}`;
  });
  blackPath += ` L${W},${midY} Z`;

  // Overall outline
  const linePath = pts.map(({ x, y }, i) => `${i === 0 ? 'M' : 'L'}${x},${y}`).join(' ');

  // Cursor position
  const curX = currentIndex < evals.length
    ? (currentIndex / (evals.length - 1)) * W
    : W;

  return (
    <svg
      width={W}
      height={H}
      style={{ display: 'block', cursor: onSeek ? 'pointer' : 'default', borderRadius: '4px', overflow: 'hidden' }}
      onClick={onSeek ? (e) => {
        const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
        const relX = e.clientX - rect.left;
        const idx = Math.round((relX / rect.width) * (evals.length - 1));
        onSeek(Math.max(0, Math.min(evals.length - 1, idx)));
      } : undefined}
    >
      {/* Background */}
      <rect x={0} y={0} width={W} height={H} fill="var(--cm-bg-elevated)" />

      {/* Black advantage area */}
      <path d={blackPath} fill="rgba(20,20,30,0.85)" />

      {/* White advantage area */}
      <path d={whitePath} fill="rgba(230,230,240,0.85)" />

      {/* Outline */}
      <path d={linePath} fill="none" stroke="rgba(100,200,120,0.6)" strokeWidth={1.2} />

      {/* Midline */}
      <line x1={0} y1={midY} x2={W} y2={midY} stroke="var(--cm-border-subtle)" strokeWidth={0.8} />

      {/* Current position cursor */}
      <line x1={curX} y1={0} x2={curX} y2={H} stroke="var(--cm-accent)" strokeWidth={1.5} opacity={0.8} />
    </svg>
  );
}

// ─── Classification summary bar ───────────────────────────────────────────────

interface ClassBadgeProps {
  type: MoveClassification;
  count: number;
}

function ClassBadge({ type, count }: ClassBadgeProps) {
  const info = CLASSIFICATION[type];
  if (count === 0) return null;
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '2px',
      padding: '4px 6px',
      background: info.dim,
      borderRadius: '5px',
      minWidth: '28px',
    }}>
      <span style={{ fontSize: '12px', color: info.color, lineHeight: 1 }}>
        {info.symbol || '✓'}
      </span>
      <span style={{ fontSize: '10px', fontWeight: 700, color: info.color }}>{count}</span>
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface EnginePanelProps {
  /** Current board FEN — updated as user navigates moves. */
  fen: string;
  /** Full parsed game — needed for full-game analysis. */
  pgnData: PGNData | null;
  /** 0 = start pos, 1 = after move 1, … */
  currentMoveIndex: number;
  /** Fired on every live engine update (null when engine off). */
  onAnalysis?: (result: StockfishAnalysis | null) => void;
  /** Fired when full-game analysis finishes. */
  onClassifications?: (
    map: Map<number, MoveClassification>,
    evals: number[],
  ) => void;
  /** Optional: jump to position (used by graph seek). */
  onSeek?: (index: number) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function EnginePanel({
  fen,
  pgnData,
  currentMoveIndex,
  onAnalysis,
  onClassifications,
  onSeek,
}: EnginePanelProps) {
  // ── Controls ────────────────────────────────────────────────────────────────
  const [engineOn, setEngineOn] = useState(true);
  const [depth, setDepth] = useState(20);
  const [multiPV, setMultiPV] = useState(3);
  const [infinite, setInfinite] = useState(false);

  // ── Live analysis state ──────────────────────────────────────────────────────
  const [liveResult, setLiveResult] = useState<StockfishAnalysis | null>(null);
  const [engineReady, setEngineReady] = useState(false);
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
  useEffect(() => {
    if (!engineOn) return;
    let cancelled = false;
    engine.initialize().then(() => {
      if (!cancelled) setEngineReady(true);
    }).catch(console.error);
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
      console.error('EnginePanel: live analysis error', err);
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

  // Trigger analysis when fen or options change
  useEffect(() => {
    if (!engineOn || !engineReady) return;
    analysisPending.current = false; // invalidate any in-flight call
    engine.stopAnalysis();
    const timer = setTimeout(() => startLiveAnalysis(fen), 80);
    return () => clearTimeout(timer);
  }, [fen, engineOn, engineReady, depth, multiPV, infinite, startLiveAnalysis, engine]);

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

  // ── Format helpers ────────────────────────────────────────────────────────

  const fmtNps = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
    return String(n);
  };

  const evalColor = (evalStr: string, isMate: boolean): string => {
    if (isMate) return 'var(--cm-warning)';
    const v = parseFloat(evalStr);
    if (v > 0.3) return '#4ade80';
    if (v < -0.3) return '#ef4444';
    return 'var(--cm-text-primary)';
  };

  // ── Styles ────────────────────────────────────────────────────────────────

  const sectionStyle: React.CSSProperties = {
    background: 'var(--cm-bg-elevated)',
    border: '1px solid var(--cm-border-subtle)',
    borderRadius: '8px',
    padding: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '11px',
    fontWeight: 600,
    color: 'var(--cm-text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  };

  const pillStyle = (active: boolean): React.CSSProperties => ({
    padding: '3px 9px',
    borderRadius: '5px',
    border: `1px solid ${active ? 'var(--cm-accent)' : 'var(--cm-border-default)'}`,
    background: active ? 'var(--cm-accent-dim)' : 'transparent',
    color: active ? 'var(--cm-accent)' : 'var(--cm-text-secondary)',
    fontSize: '12px',
    fontWeight: active ? 600 : 400,
    cursor: 'pointer',
    transition: 'all 0.12s',
  });

  const toggleStyle = (on: boolean): React.CSSProperties => ({
    width: '34px',
    height: '18px',
    borderRadius: '9px',
    background: on ? 'var(--cm-accent)' : 'var(--cm-bg-hover)',
    border: '1px solid var(--cm-border-default)',
    cursor: 'pointer',
    position: 'relative',
    transition: 'background 0.2s',
    flexShrink: 0,
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>

      {/* ── Eval graph (only when full-game evals available) ────────────── */}
      {bulkEvals.length > 1 && (
        <div style={{ ...sectionStyle, padding: '10px 12px', gap: '6px' }}>
          <div style={labelStyle}>Evaluation Graph</div>
          <EvalGraph
            evals={bulkEvals}
            currentIndex={currentMoveIndex}
            onSeek={onSeek}
          />
        </div>
      )}

      {/* ── Classification summary (after full analysis) ─────────────── */}
      {classMap.size > 0 && (
        <div style={{ ...sectionStyle, padding: '8px 12px' }}>
          <div style={labelStyle}>Move Quality</div>
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            <ClassBadge type="best" count={classSummary.best} />
            <ClassBadge type="excellent" count={classSummary.excellent} />
            <ClassBadge type="good" count={classSummary.good} />
            <ClassBadge type="inaccuracy" count={classSummary.inaccuracy} />
            <ClassBadge type="mistake" count={classSummary.mistake} />
            <ClassBadge type="blunder" count={classSummary.blunder} />
          </div>
        </div>
      )}

      {/* ── Engine analysis ──────────────────────────────────────────── */}
      <div style={sectionStyle}>
        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={labelStyle}>Engine Analysis</span>
          {/* On/Off toggle */}
          <div
            style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
            onClick={() => setEngineOn(v => !v)}
            title={engineOn ? 'Turn engine off' : 'Turn engine on'}
          >
            <span style={{ fontSize: '11px', color: 'var(--cm-text-muted)' }}>
              {engineOn ? 'ON' : 'OFF'}
            </span>
            <div style={toggleStyle(engineOn)}>
              <div style={{
                position: 'absolute',
                top: '2px',
                left: engineOn ? '16px' : '2px',
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                background: '#fff',
                transition: 'left 0.2s',
                boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
              }} />
            </div>
          </div>
        </div>

        {/* Live eval display */}
        {engineOn && (
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', minHeight: '28px' }}>
            {liveResult ? (
              <>
                <span style={{
                  fontSize: '22px',
                  fontWeight: 700,
                  fontFamily: 'var(--font-family-mono)',
                  color: evalColor(liveResult.evaluation, liveResult.isMate),
                  lineHeight: 1,
                }}>
                  {liveResult.evaluation}
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--cm-text-muted)' }}>
                    depth {liveResult.depth}
                  </span>
                  {liveResult.nps ? (
                    <span style={{ fontSize: '10px', color: 'var(--cm-text-muted)', opacity: 0.7 }}>
                      {fmtNps(liveResult.nps)} nps
                    </span>
                  ) : null}
                </div>
              </>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--cm-text-muted)', fontSize: '13px' }}>
                {analyzing || (!engineReady && engineOn) ? (
                  <><LoadingSpinner size="sm" /> Initializing…</>
                ) : engineOn ? (
                  <span style={{ opacity: 0.5 }}>Waiting…</span>
                ) : (
                  <span style={{ opacity: 0.4 }}>Engine off</span>
                )}
              </div>
            )}
          </div>
        )}

        {/* PV lines */}
        {engineOn && pvLines.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {pvLines.map((line, idx) => {
              const scoreStr = line.isMate
                ? `M${line.score}`
                : line.score > 0
                ? `+${line.score.toFixed(2)}`
                : line.score.toFixed(2);
              // First 5 SAN moves in the PV
              const preview = line.san.slice(0, 5).join(' ');

              return (
                <div key={idx} style={{
                  display: 'flex',
                  gap: '8px',
                  alignItems: 'baseline',
                  padding: '3px 6px',
                  borderRadius: '5px',
                  background: idx === 0 ? 'rgba(74,222,128,0.07)' : 'transparent',
                }}>
                  <span style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    color: idx === 0 ? '#4ade80' : '#60a5fa',
                    fontFamily: 'var(--font-family-mono)',
                    width: '38px',
                    flexShrink: 0,
                  }}>
                    {scoreStr}
                  </span>
                  <span style={{
                    fontSize: '12px',
                    fontFamily: 'var(--font-family-mono)',
                    color: 'var(--cm-text-primary)',
                    wordBreak: 'break-all',
                    flex: 1,
                  }}>
                    {preview}
                    {line.san.length > 5 && (
                      <span style={{ color: 'var(--cm-text-muted)', opacity: 0.6 }}> …</span>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Controls */}
        {engineOn && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '4px', borderTop: '1px solid var(--cm-border-subtle)' }}>
            {/* Lines */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '11px', color: 'var(--cm-text-muted)', width: '36px', flexShrink: 0 }}>Lines</span>
              <div style={{ display: 'flex', gap: '3px' }}>
                {[1, 2, 3, 4, 5].map(n => (
                  <button
                    key={n}
                    onClick={() => setMultiPV(n)}
                    style={pillStyle(multiPV === n)}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* Depth slider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '11px', color: 'var(--cm-text-muted)', width: '36px', flexShrink: 0 }}>
                Depth
              </span>
              <input
                type="range"
                min={1}
                max={30}
                value={depth}
                onChange={e => setDepth(Number(e.target.value))}
                disabled={infinite}
                style={{
                  flex: 1,
                  cursor: infinite ? 'not-allowed' : 'pointer',
                  opacity: infinite ? 0.4 : 1,
                  accentColor: 'var(--cm-accent)',
                }}
              />
              <span style={{
                fontSize: '12px',
                fontWeight: 600,
                fontFamily: 'var(--font-family-mono)',
                color: infinite ? 'var(--cm-text-muted)' : 'var(--cm-text-primary)',
                width: '20px',
                textAlign: 'right',
                flexShrink: 0,
              }}>
                {infinite ? '∞' : depth}
              </span>
            </div>

            {/* Infinite toggle */}
            <div
              style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
              onClick={() => setInfinite(v => !v)}
            >
              <span style={{ fontSize: '11px', color: 'var(--cm-text-muted)', width: '36px', flexShrink: 0 }}>
                ∞
              </span>
              <div style={toggleStyle(infinite)}>
                <div style={{
                  position: 'absolute',
                  top: '2px',
                  left: infinite ? '16px' : '2px',
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  background: '#fff',
                  transition: 'left 0.2s',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                }} />
              </div>
              <span style={{ fontSize: '11px', color: 'var(--cm-text-muted)' }}>Infinite</span>
            </div>
          </div>
        )}
      </div>

      {/* ── Full game analysis ────────────────────────────────────────── */}
      {pgnData && (
        <div style={sectionStyle}>
          <div style={labelStyle}>Full Game Analysis</div>

          {bulkProgress ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {/* Progress bar */}
              <div style={{
                width: '100%',
                height: '6px',
                background: 'var(--cm-bg-hover)',
                borderRadius: '3px',
                overflow: 'hidden',
              }}>
                <div style={{
                  width: `${(bulkProgress.done / bulkProgress.total) * 100}%`,
                  height: '100%',
                  background: 'var(--cm-accent)',
                  borderRadius: '3px',
                  transition: 'width 0.2s',
                }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', color: 'var(--cm-text-muted)' }}>
                  Analyzing move {bulkProgress.done} / {bulkProgress.total}
                </span>
                <button
                  onClick={cancelFullGameAnalysis}
                  style={{
                    padding: '3px 8px',
                    background: 'var(--cm-error-dim)',
                    border: '1px solid rgba(239,68,68,0.3)',
                    borderRadius: '5px',
                    color: 'var(--cm-error)',
                    fontSize: '11px',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={startFullGameAnalysis}
              disabled={!pgnData.moves.length}
              style={{
                padding: '8px 14px',
                background: !pgnData.moves.length ? 'var(--cm-bg-hover)' : 'var(--cm-accent)',
                border: '1px solid transparent',
                borderRadius: '7px',
                color: !pgnData.moves.length ? 'var(--cm-text-muted)' : 'var(--cm-text-inverse)',
                fontSize: '13px',
                fontWeight: 500,
                cursor: !pgnData.moves.length ? 'not-allowed' : 'pointer',
                textAlign: 'center',
                transition: 'all 0.15s',
              }}
            >
              {classMap.size > 0 ? '↺ Re-analyze Game' : '⚡ Analyze Full Game'}
            </button>
          )}

          {classMap.size > 0 && !bulkProgress && (
            <p style={{ fontSize: '11px', color: 'var(--cm-text-muted)', margin: 0, lineHeight: 1.4 }}>
              {pgnData.moves.length} moves analyzed · Click on the graph to jump to any position
            </p>
          )}
        </div>
      )}
    </div>
  );
}
