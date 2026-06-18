/**
 * Presentational engine sections — the pieces the old monolithic EnginePanel
 * rendered, now split so the v2 tabbed right panel can place them across the
 * Insights and Lines tabs. All of them read from the shared
 * useStockfishAnalysis api (a single engine instance), so rendering them in
 * different tabs never spawns a second Stockfish worker or re-triggers analysis.
 */

import React from 'react';
import {
  MoveClassification,
  CLASSIFICATION,
} from '../../../utils/moveClassifier';
import type { PGNData } from '../../../lib/pgn';
import { LoadingSpinner } from '../../ui/LoadingSpinner';
import type { StockfishAnalysisApi } from '../../../hooks/useStockfishAnalysis';

// ── Shared styles ───────────────────────────────────────────────────────────

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

const knob = (on: boolean): React.CSSProperties => ({
  position: 'absolute',
  top: '2px',
  left: on ? '16px' : '2px',
  width: '12px',
  height: '12px',
  borderRadius: '50%',
  background: '#fff',
  transition: 'left 0.2s',
  boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
});

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

// ── Engine eval (on/off, live eval, states) ─────────────────────────────────

export function EngineEval({ engine, autoAnalysis }: { engine: StockfishAnalysisApi; autoAnalysis: boolean }) {
  const { engineOn, setEngineOn, liveResult, engineReady, engineError, analyzing, retryEngine, handleManualAnalyze } = engine;
  return (
    <div style={sectionStyle}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={labelStyle}>Engine Analysis</span>
        <div
          style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
          onClick={() => setEngineOn(v => !v)}
          title={engineOn ? 'Turn engine off' : 'Turn engine on'}
        >
          <span style={{ fontSize: '11px', color: 'var(--cm-text-muted)' }}>{engineOn ? 'ON' : 'OFF'}</span>
          <div style={toggleStyle(engineOn)}><div style={knob(engineOn)} /></div>
        </div>
      </div>

      {engineOn && engineReady && !autoAnalysis && !analyzing && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
          <span style={{ fontSize: '11px', color: 'var(--cm-text-muted)' }}>Auto analysis off</span>
          <button
            onClick={handleManualAnalyze}
            style={{ padding: '4px 10px', background: 'var(--cm-accent)', border: 'none', borderRadius: '6px', color: 'var(--cm-text-inverse)', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}
          >
            Analyze
          </button>
        </div>
      )}

      {engineOn && (
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', minHeight: '28px' }}>
          {liveResult ? (
            <>
              <span style={{ fontSize: '22px', fontWeight: 700, fontFamily: 'var(--font-family-mono)', color: evalColor(liveResult.evaluation, liveResult.isMate), lineHeight: 1 }}>
                {liveResult.evaluation}
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                <span style={{ fontSize: '11px', color: 'var(--cm-text-muted)' }}>depth {liveResult.depth}</span>
                {liveResult.nps ? (
                  <span style={{ fontSize: '10px', color: 'var(--cm-text-muted)', opacity: 0.7 }}>{fmtNps(liveResult.nps)} nps</span>
                ) : null}
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--cm-text-muted)', fontSize: '13px' }}>
              {engineError ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
                  <span style={{ color: 'var(--cm-error)', fontSize: '12px' }}>Engine failed to load</span>
                  <button onClick={retryEngine} style={{ padding: '5px 10px', background: 'var(--cm-accent)', border: 'none', borderRadius: '6px', color: 'var(--cm-text-inverse)', fontSize: '12px', fontWeight: 600, cursor: 'pointer', alignSelf: 'flex-start' }}>Retry</button>
                </div>
              ) : !engineReady && engineOn ? (
                <><LoadingSpinner size="sm" /><span>Loading engine…</span></>
              ) : analyzing ? (
                <><LoadingSpinner size="sm" /><span style={{ opacity: 0.8 }}>Analyzing…</span></>
              ) : engineOn ? (
                <span style={{ opacity: 0.5 }}>Waiting for position…</span>
              ) : (
                <span style={{ opacity: 0.4 }}>Engine off</span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── PV lines ────────────────────────────────────────────────────────────────

export function PvLines({ engine }: { engine: StockfishAnalysisApi }) {
  const { engineOn, pvLines } = engine;
  if (!engineOn || pvLines.length === 0) return null;
  return (
    <div style={{ ...sectionStyle, gap: '4px' }}>
      <div style={labelStyle}>Engine Lines</div>
      {pvLines.map((line, idx) => {
        const scoreStr = line.isMate ? `M${line.score}` : line.score > 0 ? `+${line.score.toFixed(2)}` : line.score.toFixed(2);
        const preview = line.san.slice(0, 5).join(' ');
        return (
          <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'baseline', padding: '3px 6px', borderRadius: '5px', background: idx === 0 ? 'rgba(74,222,128,0.07)' : 'transparent' }}>
            <span style={{ fontSize: '10px', fontWeight: 700, color: idx === 0 ? '#4ade80' : '#60a5fa', fontFamily: 'var(--font-family-mono)', width: '38px', flexShrink: 0 }}>{scoreStr}</span>
            <span style={{ fontSize: '12px', fontFamily: 'var(--font-family-mono)', color: 'var(--cm-text-primary)', wordBreak: 'break-all', flex: 1 }}>
              {preview}
              {line.san.length > 5 && <span style={{ color: 'var(--cm-text-muted)', opacity: 0.6 }}> …</span>}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Engine controls (Lines / Depth / Infinite) ──────────────────────────────

export function EngineControls({ engine }: { engine: StockfishAnalysisApi }) {
  const { engineOn, multiPV, setMultiPV, depth, setDepth, infinite, setInfinite } = engine;
  if (!engineOn) return null;
  return (
    <div style={{ ...sectionStyle, gap: '10px' }}>
      <div style={labelStyle}>Engine Controls</div>
      {/* Lines */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '11px', color: 'var(--cm-text-muted)', width: '36px', flexShrink: 0 }}>Lines</span>
        <div style={{ display: 'flex', gap: '3px' }}>
          {[1, 2, 3, 4, 5].map(n => (
            <button key={n} onClick={() => setMultiPV(n)} style={pillStyle(multiPV === n)}>{n}</button>
          ))}
        </div>
      </div>
      {/* Depth */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '11px', color: 'var(--cm-text-muted)', width: '36px', flexShrink: 0 }}>Depth</span>
        <input type="range" min={1} max={30} value={depth} onChange={e => setDepth(Number(e.target.value))} disabled={infinite}
          style={{ flex: 1, cursor: infinite ? 'not-allowed' : 'pointer', opacity: infinite ? 0.4 : 1, accentColor: 'var(--cm-accent)' }} />
        <span style={{ fontSize: '12px', fontWeight: 600, fontFamily: 'var(--font-family-mono)', color: infinite ? 'var(--cm-text-muted)' : 'var(--cm-text-primary)', width: '20px', textAlign: 'right', flexShrink: 0 }}>
          {infinite ? '∞' : depth}
        </span>
      </div>
      {/* Infinite */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }} onClick={() => setInfinite(v => !v)}>
        <span style={{ fontSize: '11px', color: 'var(--cm-text-muted)', width: '36px', flexShrink: 0 }}>∞</span>
        <div style={toggleStyle(infinite)}><div style={knob(infinite)} /></div>
        <span style={{ fontSize: '11px', color: 'var(--cm-text-muted)' }}>Infinite</span>
      </div>
    </div>
  );
}

// ── Move-quality summary ────────────────────────────────────────────────────

function ClassBadge({ type, count }: { type: MoveClassification; count: number }) {
  const info = CLASSIFICATION[type];
  if (count === 0) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', padding: '4px 6px', background: info.dim, borderRadius: '5px', minWidth: '28px' }}>
      <span style={{ fontSize: '12px', color: info.color, lineHeight: 1 }}>{info.symbol || '✓'}</span>
      <span style={{ fontSize: '10px', fontWeight: 700, color: info.color }}>{count}</span>
    </div>
  );
}

export function MoveQualitySummary({ engine }: { engine: StockfishAnalysisApi }) {
  const { classMap, classSummary } = engine;
  if (classMap.size === 0) return null;
  return (
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
  );
}

// ── Full-game analysis ──────────────────────────────────────────────────────

export function FullGameAnalysis({ engine, pgnData }: { engine: StockfishAnalysisApi; pgnData: PGNData | null }) {
  const { bulkProgress, classMap, startFullGameAnalysis, cancelFullGameAnalysis } = engine;
  if (!pgnData) return null;
  return (
    <div style={sectionStyle}>
      <div style={labelStyle}>Full Game Analysis</div>
      {bulkProgress ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ width: '100%', height: '6px', background: 'var(--cm-bg-hover)', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{ width: `${(bulkProgress.done / bulkProgress.total) * 100}%`, height: '100%', background: 'var(--cm-accent)', borderRadius: '3px', transition: 'width 0.2s' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: 'var(--cm-text-muted)' }}>Analyzing move {bulkProgress.done} / {bulkProgress.total}</span>
            <button onClick={cancelFullGameAnalysis} style={{ padding: '3px 8px', background: 'var(--cm-error-dim)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '5px', color: 'var(--cm-error)', fontSize: '11px', cursor: 'pointer' }}>Cancel</button>
          </div>
        </div>
      ) : (
        <button
          onClick={startFullGameAnalysis}
          disabled={!pgnData.moves.length}
          style={{ padding: '8px 14px', background: !pgnData.moves.length ? 'var(--cm-bg-hover)' : 'var(--cm-accent)', border: '1px solid transparent', borderRadius: '7px', color: !pgnData.moves.length ? 'var(--cm-text-muted)' : 'var(--cm-text-inverse)', fontSize: '13px', fontWeight: 500, cursor: !pgnData.moves.length ? 'not-allowed' : 'pointer', textAlign: 'center', transition: 'all 0.15s' }}
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
  );
}
