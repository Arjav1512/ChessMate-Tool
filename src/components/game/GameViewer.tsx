import { useState, useEffect, useCallback, useMemo } from 'react';
import { ChessBoard } from '../chess/ChessBoard';
import { BoardArrows } from '../chess/BoardArrows';
import { EvaluationGauge } from '../chess/EvaluationGauge';
import { DisplaySettings, DisplayOptions } from '../analysis/DisplaySettings';
import { EnginePanel } from '../analysis/EnginePanel';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { MarkdownRenderer } from '../ui/MarkdownRenderer';
import { ChevronLeft, ChevronRight, SkipBack, SkipForward, Send } from 'lucide-react';
import type { Game } from '../../lib/supabase';
import { parsePGN, PGNData } from '../../lib/pgn';
import type { StockfishAnalysis } from '../../lib/stockfish';
import { askChessMentor } from '../../lib/gemini';
import { MoveClassification, CLASSIFICATION } from '../../utils/moveClassifier';

interface GameViewerProps {
  game: Game;
}

export function GameViewer({ game }: GameViewerProps) {
  const [currentMoveIndex, setCurrentMoveIndex] = useState(0);
  const [pgnData, setPgnData] = useState<PGNData | null>(null);

  // Engine analysis results — driven by EnginePanel via onAnalysis callback
  const [engineAnalysis, setEngineAnalysis] = useState<StockfishAnalysis | null>(null);

  // Full-game analysis results — driven by EnginePanel via onClassifications
  const [classifications, setClassifications] = useState<Map<number, MoveClassification>>(new Map());
  const [gameEvals, setGameEvals] = useState<number[]>([]);

  // Inline Ask Coach state
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

  // Current FEN derived from precomputed pgnData.fen — no chess mutation needed
  const currentFen = pgnData?.fen[currentMoveIndex]
    ?? 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

  // ── Ask Coach ───────────────────────────────────────────────────────────────

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
          ? {
              evaluation: engineAnalysis.evaluation,
              isMate: engineAnalysis.isMate,
              bestMove: engineAnalysis.bestMove,
            }
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

  // ── Keyboard navigation ─────────────────────────────────────────────────────

  const handleKeyPress = useCallback((e: KeyboardEvent) => {
    if (!pgnData) return;
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
    }
  }, [pgnData]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  // ── Early return ────────────────────────────────────────────────────────────

  if (!pgnData) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px',
        color: 'var(--cm-text-secondary)',
      }}>
        <LoadingSpinner text="Loading game..." />
      </div>
    );
  }

  // ── Navigation helpers ──────────────────────────────────────────────────────

  const goToStart    = () => setCurrentMoveIndex(0);
  const goToPrevious = () => setCurrentMoveIndex(prev => Math.max(0, prev - 1));
  const goToNext     = () => setCurrentMoveIndex(prev => Math.min(pgnData.moves.length, prev + 1));
  const goToEnd      = () => setCurrentMoveIndex(pgnData.moves.length);

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

  // ── Arrows from engine variations ─────────────────────────────────────────

  const arrows = useMemo(() => {
    if (!displayOptions.showBestMoveArrow || !engineAnalysis?.variations?.length) return null;
    return (
      <BoardArrows
        arrows={engineAnalysis.variations.map((v, idx) => ({
          from: v.move.substring(0, 2),
          to: v.move.substring(2, 4),
          opacity: idx === 0 ? 0.8 : (displayOptions.variationOpacity / 100) * (1 - idx * 0.2),
          color: idx === 0 ? '#4ade80' : '#60a5fa',
        }))}
        squareSize={60}
      />
    );
  }, [displayOptions.showBestMoveArrow, displayOptions.variationOpacity, engineAnalysis]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* ── Game header ─────────────────────────────────────────────────── */}
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
            {[game.event, game.date, game.result ? `Result: ${game.result}` : null]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
          <span style={{ fontSize: '11px', color: 'var(--cm-text-muted)' }}>
            Arrow keys to navigate
          </span>
        </div>
      </div>

      {/* ── Main board area ─────────────────────────────────────────────── */}
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
            {engineAnalysis ? (
              <EvaluationGauge
                evaluation={engineAnalysis.evaluation}
                isMate={engineAnalysis.isMate}
                moveNumber={currentMoveIndex}
              />
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
            arrowOverlay={arrows}
          />
        </div>

        {/* Right panel */}
        <div style={{ flex: 1, minWidth: '240px', maxWidth: '320px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <DisplaySettings options={displayOptions} onChange={setDisplayOptions} />

          {/* ── Lichess-style Engine Panel ── */}
          <EnginePanel
            fen={currentFen}
            pgnData={pgnData}
            currentMoveIndex={currentMoveIndex}
            onAnalysis={setEngineAnalysis}
            onClassifications={(map, evals) => {
              setClassifications(map);
              setGameEvals(evals);
            }}
            onSeek={setCurrentMoveIndex}
          />

          {/* ── Navigator ── */}
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
              <button onClick={goToStart}    disabled={currentMoveIndex === 0} style={navBtnStyle(currentMoveIndex === 0)}>
                <SkipBack size={15} />
              </button>
              <button onClick={goToPrevious} disabled={currentMoveIndex === 0} style={navBtnStyle(currentMoveIndex === 0)}>
                <ChevronLeft size={15} />
              </button>
              <button onClick={goToNext}     disabled={currentMoveIndex === pgnData.moves.length} style={navBtnStyle(currentMoveIndex === pgnData.moves.length)}>
                <ChevronRight size={15} />
              </button>
              <button onClick={goToEnd}      disabled={currentMoveIndex === pgnData.moves.length} style={navBtnStyle(currentMoveIndex === pgnData.moves.length)}>
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
            <div style={{ fontSize: '11px', color: 'var(--cm-text-muted)', textAlign: 'center', marginTop: '4px' }}>
              ← → keys to navigate
            </div>
          </div>

          {/* ── Ask Coach (Gemini context-aware) ── */}
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
              marginBottom: '8px',
            }}>
              Ask Coach
            </div>
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
                maxHeight: '160px',
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
                style={{
                  flex: 1,
                  padding: '6px 10px',
                  background: 'var(--cm-bg-base)',
                  border: '1px solid var(--cm-border-default)',
                  borderRadius: '6px',
                  color: 'var(--cm-text-primary)',
                  fontSize: '12px',
                  outline: 'none',
                  fontFamily: 'inherit',
                  transition: 'border-color 0.15s',
                  minWidth: 0,
                }}
                onFocus={e => (e.currentTarget.style.borderColor = 'var(--cm-accent)')}
                onBlur={e => (e.currentTarget.style.borderColor = 'var(--cm-border-default)')}
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

          {/* ── Move list with classification badges ── */}
          <div style={{
            background: 'var(--cm-bg-elevated)',
            border: '1px solid var(--cm-border-subtle)',
            borderRadius: '8px',
            padding: '12px',
            overflowY: 'auto',
            maxHeight: '260px',
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
                const whiteClass = classifications.get(index);
                const blackClass = blackMove ? classifications.get(index + 1) : undefined;

                const btnStyle = (active: boolean, cls?: MoveClassification): React.CSSProperties => {
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
                  <div key={index} style={{ display: 'flex', gap: '2px', alignItems: 'center', marginBottom: '1px' }}>
                    <span style={{ color: 'var(--cm-text-muted)', width: '26px', fontSize: '11px', flexShrink: 0 }}>
                      {moveNum}.
                    </span>
                    <button
                      onClick={() => setCurrentMoveIndex(index + 1)}
                      style={btnStyle(currentMoveIndex === index + 1, whiteClass)}
                      title={whiteClass ? CLASSIFICATION[whiteClass].label : undefined}
                    >
                      {whiteMove}
                      {whiteClass && CLASSIFICATION[whiteClass].symbol && (
                        <span style={{ fontSize: '10px', opacity: 0.9 }}>
                          {CLASSIFICATION[whiteClass].symbol}
                        </span>
                      )}
                    </button>
                    {blackMove && (
                      <button
                        onClick={() => setCurrentMoveIndex(index + 2)}
                        style={btnStyle(currentMoveIndex === index + 2, blackClass)}
                        title={blackClass ? CLASSIFICATION[blackClass].label : undefined}
                      >
                        {blackMove}
                        {blackClass && CLASSIFICATION[blackClass].symbol && (
                          <span style={{ fontSize: '10px', opacity: 0.9 }}>
                            {CLASSIFICATION[blackClass].symbol}
                          </span>
                        )}
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
