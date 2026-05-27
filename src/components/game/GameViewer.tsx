import { useState, useEffect, useCallback, useMemo } from 'react';
import { ChessBoard } from '../chess/ChessBoard';
import { BoardArrows } from '../chess/BoardArrows';
import { EvaluationGauge } from '../chess/EvaluationGauge';
import { DisplaySettings, DisplayOptions } from '../analysis/DisplaySettings';
import { EnginePanel } from '../analysis/EnginePanel';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { MarkdownRenderer } from '../ui/MarkdownRenderer';
import { ChevronLeft, ChevronRight, SkipBack, SkipForward, Send, Zap, List, MessageCircle } from 'lucide-react';
import type { Game } from '../../lib/supabase';
import { parsePGN, PGNData } from '../../lib/pgn';
import type { StockfishAnalysis } from '../../lib/stockfish';
import { askChessMentor } from '../../lib/gemini';
import { MoveClassification, CLASSIFICATION } from '../../utils/moveClassifier';
import { detectOpening } from '../../lib/openings';
import { useBreakpoint } from '../../hooks/useResponsive';

// ─── Mobile tab type ────────────────────────────────────────────────────────
type MobileTab = 'engine' | 'moves' | 'coach';

interface GameViewerProps {
  game: Game;
}

export function GameViewer({ game }: GameViewerProps) {
  const { isMobile, width: screenWidth } = useBreakpoint();

  // Compute square size: fill available width on mobile, 60px on desktop
  const squareSize = useMemo(() => {
    if (!isMobile) return 60;
    // 24px side padding × 2 = 48px removed; leave a little room for scrollbars
    return Math.min(60, Math.floor((Math.min(screenWidth, 480) - 48) / 8));
  }, [isMobile, screenWidth]);
  const boardPx = squareSize * 8;

  const [currentMoveIndex, setCurrentMoveIndex] = useState(0);
  const [pgnData, setPgnData] = useState<PGNData | null>(null);
  const [mobileTab, setMobileTab] = useState<MobileTab>('engine');

  // Engine analysis results — driven by EnginePanel via onAnalysis callback
  const [engineAnalysis, setEngineAnalysis] = useState<StockfishAnalysis | null>(null);

  // Full-game analysis results
  const [classifications, setClassifications] = useState<Map<number, MoveClassification>>(new Map());
  const [gameEvals, setGameEvals] = useState<number[]>([]);

  // Ask Coach state
  const [coachQuestion, setCoachQuestion] = useState('');
  const [coachAnswer, setCoachAnswer] = useState<string | null>(null);
  const [coachLoading, setCoachLoading] = useState(false);

  const [displayOptions, setDisplayOptions] = useState<DisplayOptions>({
    showAnnotations: true,
    showBestMoveArrow: true,
    showEvaluationGauge: true,
    showFishnetAnalysis: true,
    inlineNotation: false,
    variationOpacity: 70,
  });

  // Detect opening from move sequence
  const opening = useMemo(() => {
    if (!pgnData?.moves.length) return null;
    return detectOpening(pgnData.moves);
  }, [pgnData?.moves]);

  // Parse PGN when game changes
  useEffect(() => {
    try {
      const parsed = parsePGN(game.pgn);
      setPgnData(parsed);
      setCurrentMoveIndex(0);
      setEngineAnalysis(null);
      setClassifications(new Map());
      setGameEvals([]);
    } catch (error) {
      console.error('Failed to parse PGN:', error);
    }
  }, [game.id, game.pgn]);

  // Current FEN from precomputed array
  const currentFen = pgnData?.fen[currentMoveIndex]
    ?? 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

  // ── Ask Coach ──────────────────────────────────────────────────────────────

  const handleAskCoach = useCallback(async () => {
    if (!coachQuestion.trim() || !pgnData) return;
    setCoachLoading(true);
    setCoachAnswer(null);
    try {
      const answer = await askChessMentor(coachQuestion, {
        gameInfo: {
          white_player: game.white_player,
          black_player: game.black_player,
          result: game.result,
          event: game.event,
          date: game.date,
        },
        currentPosition: currentFen,
        moveHistory: pgnData.moves.slice(0, currentMoveIndex),
        evaluation: engineAnalysis
          ? { evaluation: engineAnalysis.evaluation, isMate: engineAnalysis.isMate, bestMove: engineAnalysis.bestMove }
          : undefined,
      });
      setCoachAnswer(answer);
      setCoachQuestion('');
    } catch (err) {
      setCoachAnswer('⚠️ ' + (err instanceof Error ? err.message : 'Failed to get a response'));
    } finally {
      setCoachLoading(false);
    }
  }, [coachQuestion, pgnData, game, currentFen, currentMoveIndex, engineAnalysis]);

  // ── Keyboard navigation ────────────────────────────────────────────────────

  const handleKeyPress = useCallback((e: KeyboardEvent) => {
    if (!pgnData) return;
    const tag = (e.target as HTMLElement)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) return;
    switch (e.key) {
      case 'ArrowLeft':  e.preventDefault(); setCurrentMoveIndex(p => Math.max(0, p - 1)); break;
      case 'ArrowRight': e.preventDefault(); setCurrentMoveIndex(p => Math.min(pgnData.moves.length, p + 1)); break;
      case 'Home':       e.preventDefault(); setCurrentMoveIndex(0); break;
      case 'End':        e.preventDefault(); setCurrentMoveIndex(pgnData.moves.length); break;
    }
  }, [pgnData]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  if (!pgnData) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
        <LoadingSpinner text="Loading game..." />
      </div>
    );
  }

  // ── Nav helpers ────────────────────────────────────────────────────────────

  const atStart = currentMoveIndex === 0;
  const atEnd   = currentMoveIndex === pgnData.moves.length;

  const goToStart    = () => setCurrentMoveIndex(0);
  const goToPrevious = () => setCurrentMoveIndex(p => Math.max(0, p - 1));
  const goToNext     = () => setCurrentMoveIndex(p => Math.min(pgnData.moves.length, p + 1));
  const goToEnd      = () => setCurrentMoveIndex(pgnData.moves.length);

  const currentMove = currentMoveIndex > 0 ? pgnData.moves[currentMoveIndex - 1] : null;

  // ── Arrow overlay ──────────────────────────────────────────────────────────

  const arrowOverlay = useMemo(() => {
    if (!displayOptions.showBestMoveArrow || !engineAnalysis?.variations?.length) return null;
    return (
      <BoardArrows
        arrows={engineAnalysis.variations.map((v, idx) => ({
          from: v.move.substring(0, 2),
          to: v.move.substring(2, 4),
          opacity: idx === 0 ? 0.8 : (displayOptions.variationOpacity / 100) * (1 - idx * 0.2),
          color: idx === 0 ? '#4ade80' : '#60a5fa',
        }))}
        squareSize={squareSize}
      />
    );
  }, [displayOptions, engineAnalysis, squareSize]);

  // ── Shared sub-components ──────────────────────────────────────────────────

  // Move list (used in both desktop panel and mobile tab)
  const MoveList = () => (
    <div>
      <div className="cm-section-label" style={{ margin: '0 0 8px' }}>Moves</div>
      <div style={{ fontFamily: 'var(--font-family-mono)', fontSize: '13px' }}>
        {pgnData.moves.map((_: string, index: number) => {
          if (index % 2 !== 0) return null;
          const moveNum  = Math.floor(index / 2) + 1;
          const whiteMove = pgnData.moves[index];
          const blackMove = pgnData.moves[index + 1];
          const whiteCls  = classifications.get(index);
          const blackCls  = blackMove ? classifications.get(index + 1) : undefined;

          const moveBtnStyle = (active: boolean, cls?: MoveClassification): React.CSSProperties => {
            const info = cls ? CLASSIFICATION[cls] : null;
            return {
              background: active ? 'var(--cm-accent-dim)' : info ? info.dim : 'transparent',
              border: 'none',
              padding: '2px 5px',
              borderRadius: '3px',
              cursor: 'pointer',
              color: active ? 'var(--cm-accent)' : info ? info.color : 'var(--cm-text-primary)',
              fontWeight: active ? 600 : 400,
              fontFamily: 'var(--font-family-mono)',
              fontSize: '13px',
              transition: 'background 0.1s, color 0.1s',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '2px',
            };
          };

          return (
            <div key={index} className="cm-move-row">
              <span className="cm-move-num">{moveNum}.</span>
              <button
                onClick={() => setCurrentMoveIndex(index + 1)}
                style={moveBtnStyle(currentMoveIndex === index + 1, whiteCls)}
                title={whiteCls ? CLASSIFICATION[whiteCls].label : undefined}
              >
                {whiteMove}
                {whiteCls && CLASSIFICATION[whiteCls].symbol && (
                  <span style={{ fontSize: '10px' }}>{CLASSIFICATION[whiteCls].symbol}</span>
                )}
              </button>
              {blackMove && (
                <button
                  onClick={() => setCurrentMoveIndex(index + 2)}
                  style={moveBtnStyle(currentMoveIndex === index + 2, blackCls)}
                  title={blackCls ? CLASSIFICATION[blackCls].label : undefined}
                >
                  {blackMove}
                  {blackCls && CLASSIFICATION[blackCls].symbol && (
                    <span style={{ fontSize: '10px' }}>{CLASSIFICATION[blackCls].symbol}</span>
                  )}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  // Ask Coach input (used in both desktop panel and mobile tab)
  const CoachPanel = () => (
    <div>
      <div className="cm-section-label" style={{ margin: '0 0 8px' }}>Ask Coach</div>
      {coachAnswer && (
        <div style={{
          marginBottom: '8px',
          padding: '8px 10px',
          background: coachAnswer.startsWith('⚠️') ? 'var(--cm-error-dim)' : 'var(--cm-bg-hover)',
          border: `1px solid ${coachAnswer.startsWith('⚠️') ? 'rgba(232,85,74,0.25)' : 'var(--cm-border-subtle)'}`,
          borderRadius: '6px',
          fontSize: '12px',
          color: coachAnswer.startsWith('⚠️') ? 'var(--cm-error)' : 'var(--cm-text-primary)',
          lineHeight: 1.55,
          maxHeight: '220px',
          overflowY: 'auto',
        }}>
          {coachAnswer.startsWith('⚠️')
            ? coachAnswer
            : <MarkdownRenderer content={coachAnswer} />
          }
        </div>
      )}
      <div style={{ display: 'flex', gap: '6px' }}>
        <input
          type="text"
          value={coachQuestion}
          onChange={e => setCoachQuestion(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleAskCoach(); }}
          placeholder="Ask about this position…"
          disabled={coachLoading}
          className="cm-text-input"
          style={{ flex: 1, minWidth: 0 }}
        />
        <button
          onClick={handleAskCoach}
          disabled={coachLoading || !coachQuestion.trim()}
          style={{
            padding: '6px 10px',
            background: coachLoading || !coachQuestion.trim() ? 'var(--cm-bg-hover)' : 'var(--cm-accent)',
            border: '1px solid transparent',
            borderRadius: '6px',
            color: coachLoading || !coachQuestion.trim() ? 'var(--cm-text-muted)' : 'var(--cm-text-inverse)',
            cursor: coachLoading || !coachQuestion.trim() ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            flexShrink: 0,
            transition: 'all 0.15s',
          }}
        >
          {coachLoading ? <LoadingSpinner size="sm" /> : <Send size={13} />}
        </button>
      </div>
    </div>
  );

  // Eval value display (compact — used in mobile eval bar)
  const evalColor = engineAnalysis?.isMate
    ? 'var(--cm-warning)'
    : engineAnalysis && parseFloat(engineAnalysis.evaluation) > 0.2
    ? '#4ade80'
    : engineAnalysis && parseFloat(engineAnalysis.evaluation) < -0.2
    ? '#ef4444'
    : 'var(--cm-text-primary)';

  // ── Shared engine panel props ──────────────────────────────────────────────

  const enginePanelProps = {
    fen: currentFen,
    pgnData,
    currentMoveIndex,
    onAnalysis: setEngineAnalysis,
    onClassifications: (map: Map<number, MoveClassification>, evals: number[]) => {
      setClassifications(map);
      setGameEvals(evals);
    },
    onSeek: setCurrentMoveIndex,
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="gv-layout">
      {/* ── Game header ───────────────────────────────────────────────────── */}
      <div style={{
        padding: isMobile ? '12px 14px' : '14px 20px',
        borderBottom: '1px solid var(--cm-border-subtle)',
        background: 'var(--cm-bg-surface)',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
          <div style={{ minWidth: 0 }}>
            <h2 style={{
              fontSize: isMobile ? '14px' : '16px',
              fontWeight: 600,
              marginBottom: '2px',
              color: 'var(--cm-text-primary)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {game.white_player || 'White'}
              {' '}
              <span style={{ color: 'var(--cm-text-muted)', fontWeight: 400 }}>vs</span>
              {' '}
              {game.black_player || 'Black'}
            </h2>
            <p style={{ fontSize: '11px', color: 'var(--cm-text-muted)', margin: 0 }}>
              {[game.event, game.date, game.result ? `Result: ${game.result}` : null]
                .filter(Boolean)
                .join(' · ')}
            </p>
            {opening && (
              <p style={{
                fontSize: '11px',
                color: 'var(--cm-accent)',
                margin: '3px 0 0',
                fontWeight: 500,
              }}>
                <span style={{ color: 'var(--cm-text-muted)', fontWeight: 400 }}>{opening.eco} · </span>
                {opening.name}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Mobile eval bar ───────────────────────────────────────────────── */}
      <div className="gv-eval-bar">
        {engineAnalysis ? (
          <>
            {/* Mini eval gradient bar */}
            <div style={{
              flex: 1,
              height: '8px',
              background: 'var(--cm-bg-hover)',
              borderRadius: '4px',
              overflow: 'hidden',
              position: 'relative',
            }}>
              {(() => {
                const pct = engineAnalysis.isMate
                  ? (engineAnalysis.evaluation.startsWith('-') ? 0 : 100)
                  : Math.max(5, Math.min(95, 50 + parseFloat(engineAnalysis.evaluation) * 8));
                return (
                  <>
                    <div style={{ position: 'absolute', inset: 0, background: '#1A1A1A' }} />
                    <div style={{
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      bottom: 0,
                      width: `${pct}%`,
                      background: '#F0F0F0',
                      transition: 'width 0.35s ease',
                    }} />
                  </>
                );
              })()}
            </div>
            <span style={{
              fontSize: '13px',
              fontWeight: 700,
              fontFamily: 'var(--font-family-mono)',
              color: evalColor,
              minWidth: '44px',
              textAlign: 'right',
            }}>
              {engineAnalysis.evaluation}
            </span>
            <span style={{ fontSize: '10px', color: 'var(--cm-text-muted)' }}>
              d{engineAnalysis.depth}
            </span>
          </>
        ) : (
          <span style={{ fontSize: '11px', color: 'var(--cm-text-muted)', flex: 1 }}>Engine analyzing…</span>
        )}
      </div>

      {/* ── Board + panels row ────────────────────────────────────────────── */}
      <div className="gv-board-row">
        {/* Vertical eval gauge — desktop only */}
        {displayOptions.showEvaluationGauge && (
          <div className="gv-gauge-col" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {engineAnalysis ? (
              <EvaluationGauge
                evaluation={engineAnalysis.evaluation}
                isMate={engineAnalysis.isMate}
                moveNumber={currentMoveIndex}
                height={boardPx}
              />
            ) : (
              <div style={{
                width: '28px',
                height: boardPx,
                background: 'var(--cm-bg-elevated)',
                borderRadius: '4px',
                border: '1px solid var(--cm-border-default)',
              }} />
            )}
          </div>
        )}

        {/* Board */}
        <div className="gv-board-wrap">
          <ChessBoard
            fen={currentFen}
            squareSize={squareSize}
            arrowOverlay={arrowOverlay}
          />
        </div>

        {/* Right panel — desktop only */}
        <div className="gv-right-panel">
          <DisplaySettings options={displayOptions} onChange={setDisplayOptions} />
          <EnginePanel {...enginePanelProps} />

          {/* Navigator */}
          <div className="cm-panel">
            <div className="cm-section-label">Navigator</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
              <button onClick={goToStart}    disabled={atStart} className="cm-icon-btn"><SkipBack size={14} /></button>
              <button onClick={goToPrevious} disabled={atStart} className="cm-icon-btn"><ChevronLeft size={14} /></button>
              <button onClick={goToNext}     disabled={atEnd}   className="cm-icon-btn"><ChevronRight size={14} /></button>
              <button onClick={goToEnd}      disabled={atEnd}   className="cm-icon-btn"><SkipForward size={14} /></button>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--cm-text-secondary)', textAlign: 'center' }}>
              Move {currentMoveIndex} / {pgnData.moves.length}
              {currentMove && (
                <span style={{ color: 'var(--cm-accent)', marginLeft: '6px', fontWeight: 600, fontFamily: 'var(--font-family-mono)' }}>
                  {currentMove}
                </span>
              )}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--cm-text-muted)', textAlign: 'center', marginTop: '4px' }}>
              ← → keys to navigate
            </div>
          </div>

          {/* Ask Coach */}
          <div className="cm-panel"><CoachPanel /></div>

          {/* Move list */}
          <div className="cm-panel" style={{ maxHeight: '260px', overflowY: 'auto' }}>
            <MoveList />
          </div>
        </div>
      </div>

      {/* ── Mobile: sticky nav bar below board ────────────────────────────── */}
      {isMobile && (
        <div className="gv-nav-row">
          <button onClick={goToStart}    disabled={atStart} className="cm-icon-btn"><SkipBack size={16} /></button>
          <button onClick={goToPrevious} disabled={atStart} className="cm-icon-btn"><ChevronLeft size={16} /></button>
          <div style={{ flex: 1, textAlign: 'center', fontSize: '12px', color: 'var(--cm-text-secondary)' }}>
            {currentMoveIndex} / {pgnData.moves.length}
            {currentMove && (
              <span style={{ color: 'var(--cm-accent)', marginLeft: '6px', fontWeight: 600, fontFamily: 'var(--font-family-mono)' }}>
                {currentMove}
              </span>
            )}
          </div>
          <button onClick={goToNext} disabled={atEnd} className="cm-icon-btn"><ChevronRight size={16} /></button>
          <button onClick={goToEnd}  disabled={atEnd} className="cm-icon-btn"><SkipForward size={16} /></button>
        </div>
      )}

      {/* ── Mobile: tab strip ─────────────────────────────────────────────── */}
      {isMobile && (
        <>
          <div className="gv-tabs">
            {([
              { id: 'engine' as MobileTab, label: 'Engine', icon: <Zap size={14} /> },
              { id: 'moves'  as MobileTab, label: 'Moves',  icon: <List size={14} /> },
              { id: 'coach'  as MobileTab, label: 'Coach',  icon: <MessageCircle size={14} /> },
            ] as const).map(tab => (
              <button
                key={tab.id}
                onClick={() => setMobileTab(tab.id)}
                className={`gv-tab-btn${mobileTab === tab.id ? ' gv-tab-btn--active' : ''}`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Mobile tab content */}
          <div className="gv-tab-content">
            {mobileTab === 'engine' && (
              <EnginePanel {...enginePanelProps} />
            )}
            {mobileTab === 'moves' && (
              <div className="cm-panel" style={{ maxHeight: 'none' }}>
                <MoveList />
              </div>
            )}
            {mobileTab === 'coach' && (
              <div className="cm-panel">
                <CoachPanel />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
