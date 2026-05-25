import { useState, useEffect, useCallback } from 'react';
import { ChessBoard } from '../chess/ChessBoard';
import { BoardArrows } from '../chess/BoardArrows';
import { EvaluationGauge } from '../chess/EvaluationGauge';
import { DisplaySettings, DisplayOptions } from '../analysis/DisplaySettings';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { ChevronLeft, ChevronRight, SkipBack, SkipForward } from 'lucide-react';
import type { Game } from '../../lib/supabase';
import { parsePGN, PGNData } from '../../lib/pgn';
import { StockfishEngine } from '../../lib/stockfish';

interface StockfishAnalysis {
  bestMove: string;
  evaluation: string;
  isMate: boolean;
  depth: number;
  fen: string;
  variations: Array<{
    move: string;
    score: number;
    isMate: boolean;
    pv: string[];
  }>;
}

interface GameViewerProps {
  game: Game;
  onAskQuestion?: (question: string, context: Record<string, unknown>) => void;
}

export function GameViewer({ game }: GameViewerProps) {
  const [currentMoveIndex, setCurrentMoveIndex] = useState(0);
  const [pgnData, setPgnData] = useState<PGNData | null>(null);
  // Own engine instance — avoids singleton race with BulkAnalysis
  const [engine] = useState(() => new StockfishEngine());
  const [evaluation, setEvaluation] = useState<StockfishAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [displayOptions, setDisplayOptions] = useState<DisplayOptions>({
    showAnnotations: true,
    showBestMoveArrow: true,
    showEvaluationGauge: true,
    showFishnetAnalysis: true,
    inlineNotation: false,
    variationOpacity: 70
  });

  // Terminate engine on unmount
  useEffect(() => () => engine.terminate(), [engine]);

  useEffect(() => {
    try {
      const parsed = parsePGN(game.pgn);
      setPgnData(parsed);
      setCurrentMoveIndex(0);
      setEvaluation(null);
      setAnalyzing(false);
    } catch (error) {
      console.error('Failed to parse PGN:', error);
    }
  }, [game.id, game.pgn]);

  // currentFen derived directly from precomputed pgnData.fen — no chess mutation
  const currentFen = pgnData?.fen[currentMoveIndex] ?? 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

  const analyzeCurrentPosition = useCallback(async () => {
    if (!pgnData) return;
    setAnalyzing(true);
    setAnalysisError(null);
    const fen = pgnData.fen[currentMoveIndex] ?? 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    try {
      const result = await engine.analyzePosition(fen, 18, 3);
      setEvaluation(result);
    } catch (error) {
      console.error('Analysis failed:', error);
      setAnalysisError(
        error instanceof Error ? error.message : 'Engine analysis failed'
      );
    } finally {
      setAnalyzing(false);
    }
  }, [engine, pgnData, currentMoveIndex]);

  useEffect(() => {
    if (displayOptions.showFishnetAnalysis && pgnData) {
      const timer = setTimeout(() => {
        analyzeCurrentPosition();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [currentMoveIndex, displayOptions.showFishnetAnalysis, analyzeCurrentPosition, pgnData]);

  const handleKeyPress = useCallback((e: KeyboardEvent) => {
    if (!pgnData) return;

    // Don't intercept keyboard events when focus is inside a text-entry element
    const tag = (e.target as HTMLElement)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) return;

    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        setCurrentMoveIndex(prev => Math.max(0, prev - 1));
        break;
      case 'ArrowRight':
        e.preventDefault();
        setCurrentMoveIndex(prev => Math.min(pgnData.moves.length, prev + 1));
        break;
      case 'Home':
        e.preventDefault();
        setCurrentMoveIndex(0);
        break;
      case 'End':
        e.preventDefault();
        setCurrentMoveIndex(pgnData.moves.length);
        break;
      case 'a':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          analyzeCurrentPosition();
        }
        break;
    }
  }, [pgnData, analyzeCurrentPosition]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  if (!pgnData) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px', color: 'var(--cm-text-secondary)' }}>
        <LoadingSpinner text="Loading game..." />
      </div>
    );
  }

  const goToStart = () => setCurrentMoveIndex(0);
  const goToPrevious = () => setCurrentMoveIndex(prev => Math.max(0, prev - 1));
  const goToNext = () => setCurrentMoveIndex(prev => Math.min(pgnData.moves.length, prev + 1));
  const goToEnd = () => setCurrentMoveIndex(pgnData.moves.length);

  const currentMove = currentMoveIndex > 0 ? pgnData.moves[currentMoveIndex - 1] : null;

  const navBtnStyle = (disabled: boolean): React.CSSProperties => ({
    padding: '6px 8px',
    background: 'var(--cm-bg-hover)',
    border: '1px solid var(--cm-border-default)',
    borderRadius: '6px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.35 : 1,
    color: 'var(--cm-text-secondary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.15s',
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* Game header */}
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid var(--cm-border-subtle)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px',
        background: 'var(--cm-bg-surface)',
      }}>
        <div>
          <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '3px', color: 'var(--cm-text-primary)' }}>
            {game.white_player || 'White'}
            {' '}
            <span style={{ color: 'var(--cm-text-muted)', fontWeight: 400 }}>vs</span>
            {' '}
            {game.black_player || 'Black'}
          </h2>
          <p style={{ fontSize: '12px', color: 'var(--cm-text-muted)', margin: 0 }}>
            {[game.event, game.date, game.result ? `Result: ${game.result}` : null].filter(Boolean).join(' · ')}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
          {analysisError && (
            <span style={{
              fontSize: '11px',
              color: 'var(--cm-error)',
              background: 'var(--cm-error-dim)',
              border: '1px solid rgba(232,85,74,0.25)',
              borderRadius: '5px',
              padding: '3px 8px',
              maxWidth: '180px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
            title={analysisError}
            >
              ⚠ Engine error
            </span>
          )}
          <button
            onClick={analyzeCurrentPosition}
            disabled={analyzing}
            style={{
              padding: '7px 14px',
              background: analyzing ? 'var(--cm-bg-elevated)' : 'var(--cm-accent)',
              border: '1px solid transparent',
              borderRadius: '7px',
              color: analyzing ? 'var(--cm-text-secondary)' : 'var(--cm-text-inverse)',
              fontSize: '13px',
              fontWeight: 500,
              cursor: analyzing ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s',
            }}
          >
            {analyzing ? (
              <>
                <LoadingSpinner size="sm" />
                Analyzing...
              </>
            ) : (
              <>⚡ Analyze</>
            )}
          </button>
        </div>
      </div>

      {/* Main board area */}
      <div style={{
        display: 'flex',
        gap: '16px',
        padding: '16px 20px',
        flex: 1,
        overflow: 'auto',
        flexWrap: 'wrap',
        alignItems: 'flex-start',
      }}>
        {/* Eval gauge */}
        {displayOptions.showEvaluationGauge && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {evaluation ? (
              <EvaluationGauge
                evaluation={evaluation.evaluation}
                isMate={evaluation.isMate}
                moveNumber={currentMoveIndex}
              />
            ) : analyzing ? (
              <div style={{
                width: '28px',
                height: '480px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--cm-bg-elevated)',
                borderRadius: '4px',
                border: '1px solid var(--cm-border-default)',
              }}>
                <LoadingSpinner size="sm" />
              </div>
            ) : (
              <div style={{
                width: '28px',
                height: '480px',
                background: 'var(--cm-bg-elevated)',
                borderRadius: '4px',
                border: '1px solid var(--cm-border-default)',
              }} />
            )}
          </div>
        )}

        {/* Board */}
        <div style={{ position: 'relative' }}>
          <ChessBoard
            fen={currentFen}
            arrowOverlay={
              displayOptions.showBestMoveArrow && evaluation?.variations && evaluation.variations.length > 0 ? (
                <BoardArrows
                  arrows={evaluation.variations.map((v, idx) => {
                    const opacity = idx === 0 ? 0.8 : (displayOptions.variationOpacity / 100) * (1 - idx * 0.2);
                    return {
                      from: v.move.substring(0, 2),
                      to: v.move.substring(2, 4),
                      opacity,
                      color: idx === 0 ? '#4ade80' : '#60a5fa'
                    };
                  })}
                  squareSize={60}
                />
              ) : null
            }
          />
        </div>

        {/* Right panel */}
        <div style={{ flex: 1, minWidth: '200px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <DisplaySettings options={displayOptions} onChange={setDisplayOptions} />

          {/* Navigator */}
          <div style={{
            background: 'var(--cm-bg-elevated)',
            border: '1px solid var(--cm-border-subtle)',
            borderRadius: '8px',
            padding: '12px',
          }}>
            <div style={{
              fontSize: '11px',
              fontWeight: 600,
              color: 'var(--cm-text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: '10px',
            }}>
              Navigator
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
              <button onClick={goToStart} disabled={currentMoveIndex === 0} style={navBtnStyle(currentMoveIndex === 0)}>
                <SkipBack size={15} />
              </button>
              <button onClick={goToPrevious} disabled={currentMoveIndex === 0} style={navBtnStyle(currentMoveIndex === 0)}>
                <ChevronLeft size={15} />
              </button>
              <button onClick={goToNext} disabled={currentMoveIndex === pgnData.moves.length} style={navBtnStyle(currentMoveIndex === pgnData.moves.length)}>
                <ChevronRight size={15} />
              </button>
              <button onClick={goToEnd} disabled={currentMoveIndex === pgnData.moves.length} style={navBtnStyle(currentMoveIndex === pgnData.moves.length)}>
                <SkipForward size={15} />
              </button>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--cm-text-secondary)', textAlign: 'center' }}>
              Move {currentMoveIndex} / {pgnData.moves.length}
              {currentMove && (
                <span style={{ color: 'var(--cm-accent)', marginLeft: '6px', fontWeight: 600, fontFamily: 'var(--font-family-mono)' }}>
                  {currentMove}
                </span>
              )}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--cm-text-muted)', textAlign: 'center', marginTop: '6px' }}>
              Arrow keys · Ctrl+A to analyze
            </div>
          </div>

          {/* Engine analysis */}
          {evaluation && (
            <div style={{
              background: 'var(--cm-bg-elevated)',
              border: '1px solid var(--cm-border-subtle)',
              borderRadius: '8px',
              padding: '12px',
            }}>
              <div style={{
                fontSize: '11px',
                fontWeight: 600,
                color: 'var(--cm-text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: '10px',
              }}>
                Engine
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', color: 'var(--cm-text-muted)' }}>Evaluation</span>
                  <span style={{
                    fontFamily: 'var(--font-family-mono)',
                    fontWeight: 700,
                    fontSize: '14px',
                    color: evaluation.isMate
                      ? 'var(--cm-warning)'
                      : parseFloat(evaluation.evaluation) > 0
                      ? 'var(--cm-success)'
                      : parseFloat(evaluation.evaluation) < 0
                      ? 'var(--cm-error)'
                      : 'var(--cm-text-primary)',
                  }}>
                    {evaluation.evaluation}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', color: 'var(--cm-text-muted)' }}>Best Move</span>
                  <span style={{ fontFamily: 'var(--font-family-mono)', fontSize: '13px', color: 'var(--cm-text-primary)' }}>
                    {evaluation.bestMove}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', color: 'var(--cm-text-muted)' }}>Depth</span>
                  <span style={{ fontSize: '13px', color: 'var(--cm-text-secondary)' }}>{evaluation.depth}</span>
                </div>
              </div>
            </div>
          )}

          {/* Move history */}
          <div style={{
            background: 'var(--cm-bg-elevated)',
            border: '1px solid var(--cm-border-subtle)',
            borderRadius: '8px',
            padding: '12px',
            flex: 1,
            overflowY: 'auto',
            maxHeight: '240px',
          }}>
            <div style={{
              fontSize: '11px',
              fontWeight: 600,
              color: 'var(--cm-text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: '10px',
            }}>
              Moves
            </div>
            <div style={{ fontFamily: 'var(--font-family-mono)', fontSize: '13px' }}>
              {pgnData.moves.map((_move: string, index: number) => {
                if (index % 2 !== 0) return null;
                const moveNum = Math.floor(index / 2) + 1;
                const whiteMove = pgnData.moves[index];
                const blackMove = pgnData.moves[index + 1];

                const btnStyle = (active: boolean): React.CSSProperties => ({
                  background: active ? 'var(--cm-accent-dim)' : 'transparent',
                  border: 'none',
                  padding: '2px 5px',
                  borderRadius: '3px',
                  cursor: 'pointer',
                  color: active ? 'var(--cm-accent)' : 'var(--cm-text-primary)',
                  fontWeight: active ? 600 : 400,
                  fontFamily: 'var(--font-family-mono)',
                  fontSize: '13px',
                  transition: 'background 0.1s, color 0.1s',
                });

                return (
                  <div key={index} style={{ display: 'flex', gap: '2px', alignItems: 'center', marginBottom: '1px' }}>
                    <span style={{ color: 'var(--cm-text-muted)', width: '26px', fontSize: '11px', flexShrink: 0 }}>
                      {moveNum}.
                    </span>
                    <button
                      onClick={() => setCurrentMoveIndex(index + 1)}
                      style={btnStyle(currentMoveIndex === index + 1)}
                    >
                      {whiteMove}
                    </button>
                    {blackMove && (
                      <button
                        onClick={() => setCurrentMoveIndex(index + 2)}
                        style={btnStyle(currentMoveIndex === index + 2)}
                      >
                        {blackMove}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
