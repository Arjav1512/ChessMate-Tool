import { useState, useEffect, useCallback } from 'react';
import { Chess } from 'chess.js';
import { ChessBoard } from './ChessBoard';
import { BoardArrows } from './BoardArrows';
import { EvaluationGauge } from './EvaluationGauge';
import { DisplaySettings, DisplayOptions } from './DisplaySettings';
import { ChevronLeft, ChevronRight, SkipBack, SkipForward, Loader } from 'lucide-react';
import type { Game } from '../lib/supabase';
import { parsePGN, PGNData } from '../lib/pgn';
import { stockfish } from '../lib/stockfish';

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
  const [chess] = useState(() => new Chess());
  const [evaluation, setEvaluation] = useState<StockfishAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [displayOptions, setDisplayOptions] = useState<DisplayOptions>({
    showAnnotations: true,
    showBestMoveArrow: true,
    showEvaluationGauge: true,
    showFishnetAnalysis: true,
    inlineNotation: false,
    variationOpacity: 70
  });

  useEffect(() => {
    try {
      const parsed = parsePGN(game.pgn);
      setPgnData(parsed);
      chess.reset();
      setCurrentMoveIndex(0);
      setEvaluation(null);
      setAnalyzing(false);
    } catch (error) {
      console.error('Failed to parse PGN:', error);
    }
  }, [game.id, game.pgn, chess]);

  useEffect(() => {
    if (!pgnData) return;

    chess.reset();

    for (let i = 0; i < currentMoveIndex; i++) {
      const move = pgnData.moves[i];
      chess.move(move);
    }
  }, [currentMoveIndex, pgnData, chess]);

  const analyzeCurrentPosition = useCallback(async () => {
    setAnalyzing(true);
    try {
      const result = await stockfish.analyzePosition(chess.fen(), 18, 3);
      setEvaluation(result);
    } catch (error) {
      console.error('Analysis failed:', error);
    } finally {
      setAnalyzing(false);
    }
  }, [chess]);

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
    return <div style={{ color: 'var(--color-text)' }}>Loading game...</div>;
  }

  const goToStart = () => setCurrentMoveIndex(0);
  const goToPrevious = () => setCurrentMoveIndex(prev => Math.max(0, prev - 1));
  const goToNext = () => setCurrentMoveIndex(prev => Math.min(pgnData.moves.length, prev + 1));
  const goToEnd = () => setCurrentMoveIndex(pgnData.moves.length);

  const currentMove = currentMoveIndex > 0 ? pgnData.moves[currentMoveIndex - 1] : null;

  return (
    <div>
      <div className="card">
        <div className="card__header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 'var(--space-16)' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h2 style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 'var(--font-weight-bold)', marginBottom: 'var(--space-4)' }}>
                {game.white_player || 'White'} vs {game.black_player || 'Black'}
              </h2>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                {game.event && `${game.event} • `}
                {game.date} • Result: {game.result}
              </p>
            </div>
            <button
              onClick={analyzeCurrentPosition}
              disabled={analyzing}
              className="btn btn--primary"
              style={{ flexShrink: 0 }}
            >
              {analyzing ? (
                <>
                  <Loader style={{ width: '16px', height: '16px' }} className="loading" />
                  <span style={{ marginLeft: 'var(--space-8)' }}>Analyzing...</span>
                </>
              ) : (
                'Analyze Position'
              )}
            </button>
          </div>
        </div>

        <div className="card__body">
          <div style={{ display: 'flex', gap: 'var(--space-24)' }}>
            {displayOptions.showEvaluationGauge && (
              <div style={{ position: 'relative' }}>
                {evaluation ? (
                  <EvaluationGauge
                    evaluation={evaluation.evaluation}
                    isMate={evaluation.isMate}
                    moveNumber={currentMoveIndex}
                  />
                ) : analyzing ? (
                  <div style={{
                    width: '48px',
                    height: '512px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '2px solid var(--color-border)',
                    borderRadius: 'var(--radius-base)',
                    background: 'var(--color-bg-2)'
                  }}>
                    <Loader style={{ width: '24px', height: '24px' }} className="loading" />
                  </div>
                ) : (
                  <div style={{
                    width: '48px',
                    height: '512px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '2px solid var(--color-border)',
                    borderRadius: 'var(--radius-base)',
                    background: 'var(--color-bg-2)',
                    fontSize: 'var(--font-size-xs)',
                    color: 'var(--color-text-secondary)',
                    textAlign: 'center',
                    padding: 'var(--space-8)'
                  }}>
                    No analysis
                  </div>
                )}
              </div>
            )}

            <div style={{ position: 'relative' }}>
              <ChessBoard
                fen={chess.fen()}
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
                      squareSize={64}
                    />
                  ) : null
                }
              />
            </div>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--space-16)' }}>
              <DisplaySettings options={displayOptions} onChange={setDisplayOptions} />
              <div className="card" style={{ background: 'var(--color-bg-1)', padding: 'var(--space-16)' }}>
                <h3 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)', marginBottom: 'var(--space-12)' }}>Move Navigator</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-8)' }}>
                  <button
                    onClick={goToStart}
                    disabled={currentMoveIndex === 0}
                    className="btn btn--secondary btn--sm"
                  >
                    <SkipBack style={{ width: '20px', height: '20px' }} />
                  </button>
                  <button
                    onClick={goToPrevious}
                    disabled={currentMoveIndex === 0}
                    className="btn btn--secondary btn--sm"
                  >
                    <ChevronLeft style={{ width: '20px', height: '20px' }} />
                  </button>
                  <div style={{ flex: 1, textAlign: 'center' }}>
                    <span style={{ fontFamily: 'var(--font-family-mono)' }}>
                      Move {currentMoveIndex} of {pgnData.moves.length}
                    </span>
                    {currentMove && (
                      <span style={{ marginLeft: 'var(--space-8)', color: 'var(--color-primary)', fontWeight: 'var(--font-weight-bold)' }}>{currentMove}</span>
                    )}
                  </div>
                  <button
                    onClick={goToNext}
                    disabled={currentMoveIndex === pgnData.moves.length}
                    className="btn btn--secondary btn--sm"
                  >
                    <ChevronRight style={{ width: '20px', height: '20px' }} />
                  </button>
                  <button
                    onClick={goToEnd}
                    disabled={currentMoveIndex === pgnData.moves.length}
                    className="btn btn--secondary btn--sm"
                  >
                    <SkipForward style={{ width: '20px', height: '20px' }} />
                  </button>
                </div>
                <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', marginTop: 'var(--space-8)', textAlign: 'center' }}>
                  Use arrow keys or buttons • Press Ctrl+A to analyze
                </p>
              </div>

              {evaluation && (
                <div className="card" style={{ background: 'var(--color-bg-1)', padding: 'var(--space-16)' }}>
                  <h3 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)', marginBottom: 'var(--space-12)' }}>Engine Analysis</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--color-text-secondary)' }}>Evaluation:</span>
                      <span style={{
                        fontFamily: 'var(--font-family-mono)',
                        fontWeight: 'var(--font-weight-bold)',
                        color: evaluation.isMate
                          ? 'var(--color-warning)'
                          : parseFloat(evaluation.evaluation) > 0
                          ? 'var(--color-success)'
                          : parseFloat(evaluation.evaluation) < 0
                          ? 'var(--color-error)'
                          : 'var(--color-text)'
                      }}>
                        {evaluation.evaluation}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--color-text-secondary)' }}>Best Move:</span>
                      <span style={{ fontFamily: 'var(--font-family-mono)' }}>{evaluation.bestMove}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--color-text-secondary)' }}>Depth:</span>
                      <span>{evaluation.depth}</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="card" style={{ background: 'var(--color-bg-1)', padding: 'var(--space-16)', maxHeight: '250px', overflowY: 'auto' }}>
                <h3 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)', marginBottom: 'var(--space-12)' }}>Move History</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-8)' }}>
                  {pgnData.moves.map((_move: string, index: number) => {
                    if (index % 2 === 0) {
                      const moveNum = Math.floor(index / 2) + 1;
                      const whiteMove = pgnData.moves[index];
                      const blackMove = pgnData.moves[index + 1];

                      return (
                        <div key={index} style={{ display: 'flex', gap: 'var(--space-8)', fontSize: 'var(--font-size-sm)' }}>
                          <span style={{ color: 'var(--color-text-secondary)', width: '32px' }}>{moveNum}.</span>
                          <button
                            onClick={() => setCurrentMoveIndex(index + 1)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              padding: 0,
                              cursor: 'pointer',
                              color: currentMoveIndex === index + 1 ? 'var(--color-primary)' : 'var(--color-text)',
                              fontWeight: currentMoveIndex === index + 1 ? 'var(--font-weight-bold)' : 'var(--font-weight-normal)'
                            }}
                          >
                            {whiteMove}
                          </button>
                          {blackMove && (
                            <button
                              onClick={() => setCurrentMoveIndex(index + 2)}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                padding: 0,
                                cursor: 'pointer',
                                color: currentMoveIndex === index + 2 ? 'var(--color-primary)' : 'var(--color-text)',
                                fontWeight: currentMoveIndex === index + 2 ? 'var(--font-weight-bold)' : 'var(--font-weight-normal)'
                              }}
                            >
                              {blackMove}
                            </button>
                          )}
                        </div>
                      );
                    }
                    return null;
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
