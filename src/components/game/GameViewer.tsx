import { useState, useEffect, useCallback, useMemo } from 'react';
import { ChessBoard } from '../chess/ChessBoard';
import { BoardArrows } from '../chess/BoardArrows';
import { EvaluationGauge } from '../chess/EvaluationGauge';
import { DisplaySettings, DisplayOptions } from '../analysis/DisplaySettings';
import { useStockfishAnalysis } from '../../hooks/useStockfishAnalysis';
import { EvalGraph } from '../analysis/engine/EvalGraph';
import { EngineEval, PvLines, EngineControls, MoveQualitySummary, FullGameAnalysis } from '../analysis/engine/EngineSections';
import { SegmentedControl } from '../ui/SegmentedControl';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { MarkdownRenderer } from '../ui/MarkdownRenderer';
import { ChevronLeft, ChevronRight, SkipBack, SkipForward, Send, Zap, List, MessageCircle, RotateCw, Sparkles } from 'lucide-react';
import type { Game } from '../../lib/supabase';
import { parsePGN, PGNData } from '../../lib/pgn';
import type { StockfishAnalysis } from '../../lib/stockfish';
import { askChessMentor } from '../../lib/gemini';
import { COACH_STARTER_PROMPTS } from '../../lib/sampleData';
import { MoveClassification, CLASSIFICATION } from '../../utils/moveClassifier';
import { detectOpening } from '../../lib/openings';
import { useBreakpoint } from '../../hooks/useResponsive';
import { useToast } from '../../contexts/ToastContext';

// ─── Right-panel tab type (shared desktop + mobile) ─────────────────────────
type RightTab = 'insights' | 'coach' | 'moves' | 'lines';

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
  const [rightTab, setRightTab] = useState<RightTab>('insights');

  // Engine analysis results — fed by the useStockfishAnalysis hook (below).
  const [engineAnalysis, setEngineAnalysis] = useState<StockfishAnalysis | null>(null);

  // Full-game analysis results
  const [classifications, setClassifications] = useState<Map<number, MoveClassification>>(new Map());

  // Ask Coach state
  const [coachQuestion, setCoachQuestion] = useState('');
  const [coachAnswer, setCoachAnswer] = useState<string | null>(null);
  const [coachLoading, setCoachLoading] = useState(false);
  const [coachLastQuestion, setCoachLastQuestion] = useState<string | null>(null);
  // Last failed question — drives the Retry pill. Cleared on success.
  const [coachLastFailed, setCoachLastFailed] = useState<string | null>(null);
  const [coachError, setCoachError] = useState<string | null>(null);
  const { showToast } = useToast();

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
    } catch (error) {
      console.error('Failed to parse PGN:', error);
    }
  }, [game.id, game.pgn]);

  // Current FEN from precomputed array
  const currentFen = pgnData?.fen[currentMoveIndex]
    ?? 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

  // Single Stockfish instance owned here so every right-panel tab reads the
  // same engine state — switching tabs never remounts the engine or
  // re-triggers analysis. Feeds the existing engineAnalysis/classifications
  // state used by the eval bar, gauge, arrows, and move list.
  const engine = useStockfishAnalysis({
    fen: currentFen,
    pgnData,
    onAnalysis: setEngineAnalysis,
    onClassifications: (map) => setClassifications(map),
    autoAnalysis: displayOptions.showFishnetAnalysis,
  });

  // ── Ask Coach ──────────────────────────────────────────────────────────────

  const askCoach = useCallback(async (text: string) => {
    if (!text.trim() || !pgnData) return;
    setCoachLoading(true);
    setCoachAnswer(null);
    try {
      const answer = await askChessMentor(text, {
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
      setCoachLastQuestion(text);
      setCoachQuestion('');
      setCoachLastFailed(null);
      setCoachError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to get a response';
      // Surface as toast and remember the question for the Retry pill.
      // Don't write the failure into setCoachAnswer — the previous
      // success (if any) stays visible while the toast informs the user.
      showToast(message, 'error');
      setCoachLastFailed(text);
      setCoachError(message);
      setCoachQuestion(text);
    } finally {
      setCoachLoading(false);
    }
  }, [pgnData, game, currentFen, currentMoveIndex, engineAnalysis, showToast]);

  const handleAskCoach = useCallback(() => {
    askCoach(coachQuestion);
  }, [askCoach, coachQuestion]);

  const handleRetryCoach = useCallback(() => {
    if (coachLastFailed) askCoach(coachLastFailed);
  }, [askCoach, coachLastFailed]);

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

  // ── Arrow overlay ──────────────────────────────────────────────────────────
  // Computed before the `pgnData` early-return so the hook order stays
  // stable across renders (Rules of Hooks).
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

  // ── Shared sub-components ──────────────────────────────────────────────────

  // Move list — respects showAnnotations and inlineNotation from displayOptions
  const MoveList = () => {
    const showAnnotations = displayOptions.showAnnotations;
    const inline = displayOptions.inlineNotation;

    const moveBtnStyle = (active: boolean, cls?: MoveClassification): React.CSSProperties => {
      const info = (showAnnotations && cls) ? CLASSIFICATION[cls] : null;
      return {
        background: active ? 'var(--cm-accent-dim)' : info ? info.dim : 'transparent',
        border: 'none',
        padding: inline ? '1px 4px' : '2px 5px',
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
        outline: active ? '1px solid var(--cm-accent-ring)' : 'none',
      };
    };

    if (inline) {
      // Inline mode: all moves on one flowing paragraph
      return (
        <div>
          <div className="cm-section-label" style={{ margin: '0 0 8px' }}>Moves</div>
          <div style={{
            fontFamily: 'var(--font-family-mono)',
            fontSize: '13px',
            lineHeight: 1.8,
            display: 'flex',
            flexWrap: 'wrap',
            gap: '1px 0',
          }}>
            {pgnData.moves.map((move: string, index: number) => {
              const cls = classifications.get(index);
              const isWhite = index % 2 === 0;
              const moveNum = Math.floor(index / 2) + 1;
              return (
                <span key={index} style={{ display: 'inline-flex', alignItems: 'center' }}>
                  {isWhite && (
                    <span style={{ color: 'var(--cm-text-muted)', marginRight: '2px', fontSize: '11px' }}>
                      {moveNum}.
                    </span>
                  )}
                  <button
                    onClick={() => setCurrentMoveIndex(index + 1)}
                    style={moveBtnStyle(currentMoveIndex === index + 1, cls)}
                    title={showAnnotations && cls ? CLASSIFICATION[cls].label : undefined}
                  >
                    {move}
                    {showAnnotations && cls && CLASSIFICATION[cls].symbol && (
                      <span style={{ fontSize: '9px' }}>{CLASSIFICATION[cls].symbol}</span>
                    )}
                  </button>
                  {!isWhite && <span style={{ width: '4px', display: 'inline-block' }} />}
                </span>
              );
            })}
          </div>
        </div>
      );
    }

    // Table mode: one row per move pair (default)
    return (
      <div>
        <div className="cm-section-label" style={{ margin: '0 0 8px' }}>Moves</div>
        <div style={{ fontFamily: 'var(--font-family-mono)', fontSize: '13px' }}>
          {pgnData.moves.map((_: string, index: number) => {
            if (index % 2 !== 0) return null;
            const moveNum   = Math.floor(index / 2) + 1;
            const whiteMove = pgnData.moves[index];
            const blackMove = pgnData.moves[index + 1];
            const whiteCls  = classifications.get(index);
            const blackCls  = blackMove ? classifications.get(index + 1) : undefined;

            return (
              <div key={index} className="cm-move-row">
                <span className="cm-move-num">{moveNum}.</span>
                <button
                  onClick={() => setCurrentMoveIndex(index + 1)}
                  style={moveBtnStyle(currentMoveIndex === index + 1, whiteCls)}
                  title={showAnnotations && whiteCls ? CLASSIFICATION[whiteCls].label : undefined}
                >
                  {whiteMove}
                  {showAnnotations && whiteCls && CLASSIFICATION[whiteCls].symbol && (
                    <span style={{ fontSize: '10px' }}>{CLASSIFICATION[whiteCls].symbol}</span>
                  )}
                </button>
                {blackMove && (
                  <button
                    onClick={() => setCurrentMoveIndex(index + 2)}
                    style={moveBtnStyle(currentMoveIndex === index + 2, blackCls)}
                    title={showAnnotations && blackCls ? CLASSIFICATION[blackCls].label : undefined}
                  >
                    {blackMove}
                    {showAnnotations && blackCls && CLASSIFICATION[blackCls].symbol && (
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
  };

  // Ask Coach input (used in both desktop panel and mobile tab)
  const CoachPanel = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '10px' }}>
        <div style={{
          width: '22px',
          height: '22px',
          borderRadius: '6px',
          background: 'linear-gradient(135deg, var(--cm-accent-dim) 0%, rgba(74,222,128,0.05) 100%)',
          border: '1px solid var(--cm-accent)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '12px',
          flexShrink: 0,
        }}>
          ♟
        </div>
        <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--cm-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Chess Coach
        </span>
        <span style={{
          marginLeft: 'auto',
          padding: '1px 6px',
          background: 'rgba(74,222,128,0.1)',
          border: '1px solid rgba(74,222,128,0.2)',
          borderRadius: '999px',
          fontSize: '9px',
          color: 'rgba(74,222,128,0.8)',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}>
          Gemini AI
        </span>
      </div>

      {/* Conversation area */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '10px', minHeight: '32px' }}>
        {/* Loading state */}
        {coachLoading && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '7px' }}>
            <div style={{
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              background: 'var(--cm-accent-dim)',
              border: '1px solid var(--cm-accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '10px',
              flexShrink: 0,
              marginTop: '1px',
            }}>
              ♟
            </div>
            <div style={{
              padding: '8px 11px',
              background: 'var(--cm-bg-elevated)',
              border: '1px solid var(--cm-border-subtle)',
              borderRadius: '0 8px 8px 8px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}>
              {[0, 1, 2].map(i => (
                <div
                  key={i}
                  style={{
                    width: '5px',
                    height: '5px',
                    borderRadius: '50%',
                    background: 'var(--cm-text-muted)',
                    animation: `typingBounce 1.2s ease-in-out ${i * 0.2}s infinite`,
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Conversation pair: user question + coach answer */}
        {!coachLoading && coachAnswer && coachLastQuestion && (
          <>
            {/* User bubble */}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <div style={{
                padding: '6px 10px',
                background: 'var(--cm-accent-dim)',
                border: '1px solid var(--cm-accent)',
                borderRadius: '8px 0 8px 8px',
                fontSize: '12px',
                color: 'var(--cm-accent)',
                maxWidth: '85%',
                lineHeight: 1.4,
              }}>
                {coachLastQuestion}
              </div>
            </div>
            {/* Coach bubble */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '7px' }}>
              <div style={{
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                background: 'var(--cm-accent-dim)',
                border: '1px solid var(--cm-accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '10px',
                flexShrink: 0,
                marginTop: '1px',
              }}>
                ♟
              </div>
              <div style={{
                padding: '8px 11px',
                background: 'var(--cm-bg-elevated)',
                border: '1px solid var(--cm-border-subtle)',
                borderRadius: '0 8px 8px 8px',
                fontSize: '12px',
                color: 'var(--cm-text-primary)',
                lineHeight: 1.55,
                maxHeight: '200px',
                overflowY: 'auto',
                flex: 1,
                minWidth: 0,
              }}>
                <MarkdownRenderer content={coachAnswer} />
              </div>
            </div>
          </>
        )}

        {/* Answer without question (edge case) */}
        {!coachLoading && coachAnswer && !coachLastQuestion && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '7px' }}>
            <div style={{
              width: '20px', height: '20px', borderRadius: '50%',
              background: 'var(--cm-accent-dim)', border: '1px solid var(--cm-accent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '10px', flexShrink: 0, marginTop: '1px',
            }}>♟</div>
            <div style={{
              padding: '8px 11px', background: 'var(--cm-bg-elevated)',
              border: '1px solid var(--cm-border-subtle)', borderRadius: '0 8px 8px 8px',
              fontSize: '12px', color: 'var(--cm-text-primary)', lineHeight: 1.55,
              maxHeight: '200px', overflowY: 'auto', flex: 1, minWidth: 0,
            }}>
              <MarkdownRenderer content={coachAnswer} />
            </div>
          </div>
        )}

        {/* Error state */}
        {coachLastFailed && !coachLoading && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: '8px', padding: '7px 10px', background: 'var(--cm-error-dim)',
            border: '1px solid rgba(232,85,74,0.25)', borderRadius: '8px',
          }}>
            <span style={{ fontSize: '11px', color: 'var(--cm-error)' }}>{coachError || 'Request failed.'}</span>
            <button
              type="button"
              onClick={handleRetryCoach}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '4px',
                padding: '3px 8px', background: 'var(--cm-error)',
                border: 'none', borderRadius: '5px',
                color: '#fff', fontSize: '11px', fontWeight: 500, cursor: 'pointer',
              }}
            >
              <RotateCw size={10} />
              Retry
            </button>
          </div>
        )}

        {/* Starter prompts — shown when idle and no conversation yet */}
        {!coachAnswer && !coachLoading && !coachLastFailed && (
          <div>
            <div style={{ fontSize: '10px', color: 'var(--cm-text-muted)', letterSpacing: '0.5px', marginBottom: '6px' }}>
              Try asking…
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
              {COACH_STARTER_PROMPTS.slice(0, 3).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => { setCoachQuestion(p); askCoach(p); }}
                  disabled={coachLoading}
                  style={{
                    padding: '4px 9px',
                    background: 'var(--cm-bg-elevated)',
                    border: '1px solid var(--cm-border-subtle)',
                    borderRadius: '999px',
                    color: 'var(--cm-text-secondary)',
                    fontSize: '11px',
                    cursor: coachLoading ? 'not-allowed' : 'pointer',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--cm-accent)';
                    e.currentTarget.style.color = 'var(--cm-accent)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--cm-border-subtle)';
                    e.currentTarget.style.color = 'var(--cm-text-secondary)';
                  }}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Input row */}
      <div style={{
        display: 'flex',
        gap: '6px',
        paddingTop: (coachAnswer || coachLoading || coachLastFailed) ? '8px' : '0',
        borderTop: (coachAnswer || coachLoading || coachLastFailed) ? '1px solid var(--cm-border-subtle)' : 'none',
      }}>
        <input
          type="text"
          value={coachQuestion}
          onChange={e => setCoachQuestion(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleAskCoach(); }}
          placeholder={coachAnswer ? 'Ask a follow-up…' : 'Ask about this position…'}
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

  // ── Right-panel tabs (Insights → Coach → Moves → Lines) ────────────────────

  const rightTabItems = [
    { id: 'insights', label: 'Insights', icon: <Sparkles size={13} /> },
    { id: 'coach',    label: 'Coach',    icon: <MessageCircle size={13} /> },
    { id: 'moves',    label: 'Moves',    icon: <List size={13} /> },
    { id: 'lines',    label: 'Lines',    icon: <Zap size={13} /> },
  ];

  const renderTabContent = (tab: RightTab) => {
    switch (tab) {
      case 'insights':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <EngineEval engine={engine} autoAnalysis={displayOptions.showFishnetAnalysis} />
            <FullGameAnalysis engine={engine} pgnData={pgnData} />
            <MoveQualitySummary engine={engine} />
            {engine.bulkEvals.length > 1 && (
              <div style={{ background: 'var(--cm-bg-elevated)', border: '1px solid var(--cm-border-subtle)', borderRadius: '8px', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div className="cm-section-label">Evaluation Graph</div>
                <EvalGraph evals={engine.bulkEvals} currentIndex={currentMoveIndex} onSeek={setCurrentMoveIndex} />
              </div>
            )}
          </div>
        );
      case 'coach':
        return <div className="cm-panel"><CoachPanel /></div>;
      case 'moves':
        return <div className="cm-panel" style={{ maxHeight: '460px', overflowY: 'auto' }}><MoveList /></div>;
      case 'lines':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <EngineEval engine={engine} autoAnalysis={displayOptions.showFishnetAnalysis} />
            <PvLines engine={engine} />
            <EngineControls engine={engine} />
            <DisplaySettings options={displayOptions} onChange={setDisplayOptions} />
          </div>
        );
    }
  };

  // Move navigation row — placed under the board (desktop) and as the mobile
  // sticky bar. Shared markup so the two stay in sync.
  const navControls = (size: number) => (
    <>
      <button onClick={goToStart}    disabled={atStart} className="cm-icon-btn" title="Start"><SkipBack size={size} /></button>
      <button onClick={goToPrevious} disabled={atStart} className="cm-icon-btn" title="Previous (←)"><ChevronLeft size={size} /></button>
      <div style={{ flex: 1, textAlign: 'center' }}>
        {currentMove ? (
          <span style={{ fontSize: '13px', fontWeight: 700, fontFamily: 'var(--font-family-mono)', color: 'var(--cm-accent)' }}>{currentMove}</span>
        ) : (
          <span style={{ fontSize: '11px', color: 'var(--cm-text-muted)' }}>Start</span>
        )}
        <span style={{ fontSize: '10px', color: 'var(--cm-text-muted)', marginLeft: '6px' }}>
          {currentMoveIndex}/{pgnData.moves.length}
        </span>
      </div>
      <button onClick={goToNext} disabled={atEnd} className="cm-icon-btn" title="Next (→)"><ChevronRight size={size} /></button>
      <button onClick={goToEnd}  disabled={atEnd} className="cm-icon-btn" title="End"><SkipForward size={size} /></button>
    </>
  );

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="gv-layout">
      {/* ── Game header ───────────────────────────────────────────────────── */}
      <div style={{
        padding: isMobile ? '10px 14px' : '12px 20px',
        borderBottom: '1px solid var(--cm-border-subtle)',
        background: 'var(--cm-bg-surface)',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
          {/* Players */}
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '5px' }}>
            {([
              { colorKey: 'black', name: game.black_player || 'Black', isUser: game.user_color === 'black' },
              { colorKey: 'white', name: game.white_player || 'White', isUser: game.user_color === 'white' },
            ] as const).map(({ colorKey, name, isUser }) => (
              <div key={colorKey} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '13px',
                  height: '13px',
                  borderRadius: '3px',
                  background: colorKey === 'white' ? '#ede8e0' : '#1c1c2a',
                  border: '1.5px solid var(--cm-border-default)',
                  flexShrink: 0,
                }} />
                <span style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'var(--cm-text-primary)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: isMobile ? '120px' : '180px',
                }}>
                  {name}
                </span>
                {isUser && (
                  <span style={{
                    padding: '1px 6px',
                    background: 'var(--cm-accent-dim)',
                    border: '1px solid var(--cm-accent)',
                    borderRadius: '999px',
                    fontSize: '10px',
                    color: 'var(--cm-accent)',
                    fontWeight: 600,
                    flexShrink: 0,
                    lineHeight: '14px',
                  }}>
                    You
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Right column: result + opening badge */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '5px', flexShrink: 0 }}>
            {(() => {
              const resultMap: Record<string, { label: string; color: string; bg: string }> = {
                '1-0':     { label: '1-0',  color: '#4ade80', bg: 'rgba(74,222,128,0.12)' },
                '0-1':     { label: '0-1',  color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
                '1/2-1/2': { label: '½-½',  color: 'var(--cm-warning)', bg: 'rgba(240,168,64,0.12)' },
              };
              const r = game.result ? resultMap[game.result] : null;
              return r ? (
                <span style={{
                  padding: '3px 10px',
                  background: r.bg,
                  border: `1px solid ${r.color}50`,
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: r.color,
                  fontFamily: 'var(--font-family-mono)',
                  letterSpacing: '0.5px',
                }}>
                  {r.label}
                </span>
              ) : null;
            })()}
            {opening && (
              <span style={{
                padding: '2px 8px',
                background: 'rgba(74,222,128,0.07)',
                border: '1px solid rgba(74,222,128,0.18)',
                borderRadius: '999px',
                fontSize: '10px',
                color: 'rgba(74,222,128,0.75)',
                fontWeight: 500,
                maxWidth: isMobile ? '130px' : '190px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                textAlign: 'right',
              }}>
                {opening.eco} · {opening.name}
              </span>
            )}
          </div>
        </div>

        {/* Metadata row */}
        {(game.event || game.date) && (
          <div style={{ display: 'flex', gap: '8px', marginTop: '7px', flexWrap: 'wrap' }}>
            {game.event && game.event !== '?' && (
              <span style={{ fontSize: '11px', color: 'var(--cm-text-muted)' }}>{game.event}</span>
            )}
            {game.date && game.date !== '????.??.??' && (
              <span style={{ fontSize: '11px', color: 'var(--cm-text-muted)' }}>{game.date}</span>
            )}
          </div>
        )}
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

        {/* Board + move navigation directly beneath it (desktop) */}
        <div className="gv-board-col">
          <div className="gv-board-wrap">
            <ChessBoard
              fen={currentFen}
              squareSize={squareSize}
              arrowOverlay={arrowOverlay}
            />
          </div>
          {!isMobile && (
            <div className="gv-board-nav" style={{ width: boardPx, maxWidth: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                {navControls(15)}
              </div>
              <div style={{ marginTop: '8px', height: '3px', background: 'var(--cm-bg-hover)', borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{
                  width: pgnData.moves.length > 0 ? `${(currentMoveIndex / pgnData.moves.length) * 100}%` : '0%',
                  height: '100%', background: 'var(--cm-accent)', borderRadius: '2px', transition: 'width 0.15s ease',
                }} />
              </div>
            </div>
          )}
        </div>

        {/* Right panel — desktop only: one contextual panel, tabbed */}
        {!isMobile && (
          <div className="gv-right-panel">
            <div style={{ padding: '2px 2px 10px' }}>
              <SegmentedControl
                items={rightTabItems}
                value={rightTab}
                onChange={id => setRightTab(id as RightTab)}
                ariaLabel="Analysis panel"
              />
            </div>
            {renderTabContent(rightTab)}
          </div>
        )}
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

      {/* ── Mobile: same tabbed panel (Insights → Coach → Moves → Lines) ──── */}
      {isMobile && (
        <>
          <div className="gv-tabs" style={{ padding: '0 14px' }}>
            <SegmentedControl
              items={rightTabItems}
              value={rightTab}
              onChange={id => setRightTab(id as RightTab)}
              ariaLabel="Analysis panel"
            />
          </div>
          <div className="gv-tab-content">
            {renderTabContent(rightTab)}
          </div>
        </>
      )}
    </div>
  );
}
