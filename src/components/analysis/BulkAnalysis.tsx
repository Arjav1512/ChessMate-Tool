import { useState, useEffect, useCallback } from 'react';
import { Brain, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase, Game } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { StockfishEngine } from '../../lib/stockfish';
import { parsePGN } from '../../lib/pgn';
import { classifyMove, MoveClassification } from '../../utils/moveClassifier';
import { Chess } from 'chess.js';
import { LoadingSpinner } from '../ui/LoadingSpinner';

interface GameAnalysis {
  gameId: string;
  gameName: string;
  status: 'pending' | 'analyzing' | 'complete' | 'error';
  positions: number;
  analyzed: number;
  insights: {
    avgEvaluation: number;
    bestMoves: number;
    inaccuracies: number;
    mistakes: number;
    blunders: number;
    accuracy: number;
  } | null;
  error?: string;
}

export function BulkAnalysis() {
  const { user } = useAuth();
  const [games, setGames] = useState<Game[]>([]);
  const [analyses, setAnalyses] = useState<Map<string, GameAnalysis>>(new Map());
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [loading, setLoading] = useState(true);
  // Own engine instance — avoids singleton race with GameViewer
  const [engine] = useState(() => new StockfishEngine());
  useEffect(() => () => engine.terminate(), [engine]);

  const loadGames = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('games')
        .select('*')
        .eq('user_id', user.id)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      setGames(data || []);

      const initialAnalyses = new Map<string, GameAnalysis>();
      data?.forEach(game => {
        let positions = 0;
        try {
          const pgnData = parsePGN(game.pgn);
          positions = pgnData.moves.length;
        } catch {
          // keep positions = 0 for unparseable PGN
        }
        initialAnalyses.set(game.id, {
          gameId: game.id,
          gameName: `${game.white_player} vs ${game.black_player}`,
          status: 'pending',
          positions,
          analyzed: 0,
          insights: null,
        });
      });
      setAnalyses(initialAnalyses);
    } catch (error) {
      console.error('Error loading games:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadGames();
  }, [loadGames]);

  const analyzeGame = async (game: Game) => {
    const gameId = game.id;

    setAnalyses(prev => {
      const updated = new Map(prev);
      const analysis = updated.get(gameId)!;
      analysis.status = 'analyzing';
      analysis.analyzed = 0;
      return updated;
    });

    try {
      const pgnData = parsePGN(game.pgn);
      const chess = new Chess();

      const evaluations: number[] = [];
      const classCounts: Record<MoveClassification, number> = {
        best: 0, excellent: 0, good: 0, inaccuracy: 0, mistake: 0, blunder: 0,
      };
      let totalCpLoss = 0;
      let classifiedMoves = 0;

      for (let i = 0; i < pgnData.moves.length; i++) {
        chess.move(pgnData.moves[i]);

        try {
          const result = await engine.analyzePosition(chess.fen(), 15, 1);

          // Safely parse evaluation — result.evaluation can be "M3" (mate) which
          // parseFloat silently turns into NaN. Use ±100 as a proxy for mate.
          let evalNum: number;
          if (result.isMate) {
            const mateVal = parseInt(result.evaluation.replace('M', ''), 10);
            evalNum = isNaN(mateVal) ? 0 : (mateVal > 0 ? 100 : -100);
          } else {
            evalNum = parseFloat(result.evaluation);
            if (isNaN(evalNum)) evalNum = 0;
          }
          evaluations.push(evalNum);

          if (i > 0) {
            // Use Lichess-style cp-loss thresholds from moveClassifier rather
            // than the previous ad-hoc 0.3 / 1.0 split.
            const evalBeforeCp = evaluations[i - 1] * 100;
            const evalAfterCp = evaluations[i] * 100;
            const isWhiteMove = i % 2 === 0;
            const cpLoss = isWhiteMove
              ? Math.max(0, evalBeforeCp - evalAfterCp)
              : Math.max(0, evalAfterCp - evalBeforeCp);
            totalCpLoss += cpLoss;
            classCounts[classifyMove(evalBeforeCp, evalAfterCp, isWhiteMove)]++;
            classifiedMoves++;
          }

          setAnalyses(prev => {
            const updated = new Map(prev);
            const analysis = updated.get(gameId)!;
            analysis.analyzed = i + 1;
            return updated;
          });
        } catch (error) {
          console.error(`Error analyzing position ${i}:`, error);
        }
      }

      const avgEval = evaluations.length > 0
        ? evaluations.reduce((a, b) => a + b, 0) / evaluations.length
        : 0;
      const totalMoves = pgnData.moves.length;
      const bestMoves = classCounts.best;
      const goodMoves = classCounts.excellent + classCounts.good;
      // Split: mistakes column now holds the mistake bucket only;
      // inaccuracies live in their own column so ProgressBar can show
      // a real three-category pie.
      const inaccuracies = classCounts.inaccuracy;
      const mistakes = classCounts.mistake;
      const blunders = classCounts.blunder;
      // Accuracy = share of moves rated good or better.
      const accuracy = totalMoves > 0
        ? ((bestMoves + goodMoves) / totalMoves) * 100
        : 0;
      const avgCentipawnLoss = classifiedMoves > 0
        ? totalCpLoss / classifiedMoves
        : 0;

      // Persist analysis results so StatsDashboard and trigger can use them
      await supabase.from('game_analysis_results').upsert({
        game_id: gameId,
        user_id: user!.id,
        accuracy: Math.round(accuracy * 100) / 100,
        total_moves: totalMoves,
        mistakes,
        inaccuracies,
        blunders,
        good_moves: goodMoves,
        best_moves: bestMoves,
        average_centipawn_loss: Math.round(avgCentipawnLoss * 100) / 100,
      }, { onConflict: 'game_id' });

      setAnalyses(prev => {
        const updated = new Map(prev);
        const analysis = updated.get(gameId)!;
        analysis.status = 'complete';
        analysis.insights = {
          avgEvaluation: avgEval,
          bestMoves,
          inaccuracies,
          mistakes,
          blunders,
          accuracy,
        };
        return updated;
      });
    } catch (error) {
      console.error('Error analyzing game:', error);
      setAnalyses(prev => {
        const updated = new Map(prev);
        const analysis = updated.get(gameId)!;
        analysis.status = 'error';
        analysis.error = 'Failed to analyze game';
        return updated;
      });
    }
  };

  const startBulkAnalysis = async () => {
    setIsAnalyzing(true);

    for (const game of games) {
      await analyzeGame(game);
    }

    setIsAnalyzing(false);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px' }}>
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (games.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 20px' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>♟</div>
        <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '10px', color: 'var(--cm-text-primary)' }}>
          No Games Found
        </h2>
        <p style={{ color: 'var(--cm-text-secondary)', fontSize: '14px' }}>
          Import some games first to start analyzing them in bulk.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Header bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
        padding: '16px 20px',
        background: 'var(--cm-bg-elevated)',
        border: '1px solid var(--cm-border-subtle)',
        borderRadius: '10px',
      }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--cm-text-primary)', marginBottom: '3px' }}>
            Bulk Game Analysis
          </h3>
          <p style={{ margin: 0, fontSize: '12px', color: 'var(--cm-text-muted)' }}>
            Analyze {games.length} imported game{games.length !== 1 ? 's' : ''} with Stockfish engine
          </p>
        </div>
        <button
          onClick={startBulkAnalysis}
          disabled={isAnalyzing}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 16px',
            background: isAnalyzing ? 'var(--cm-bg-hover)' : 'var(--cm-accent)',
            border: '1px solid transparent',
            borderRadius: '7px',
            color: isAnalyzing ? 'var(--cm-text-secondary)' : 'var(--cm-text-inverse)',
            fontSize: '13px',
            fontWeight: 500,
            cursor: isAnalyzing ? 'not-allowed' : 'pointer',
            transition: 'all 0.15s',
          }}
        >
          {isAnalyzing ? (
            <>
              <LoadingSpinner size="sm" />
              Analyzing...
            </>
          ) : (
            <>
              <Brain size={15} />
              Analyze {games.length} Game{games.length !== 1 ? 's' : ''}
            </>
          )}
        </button>
      </div>

      {/* Game cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {Array.from(analyses.values()).map((analysis) => (
          <div
            key={analysis.gameId}
            style={{
              background: 'var(--cm-bg-elevated)',
              border: '1px solid var(--cm-border-subtle)',
              borderRadius: '10px',
              padding: '14px 16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: analysis.status === 'analyzing' || analysis.status === 'complete' ? '10px' : 0 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3 style={{ fontSize: '13px', fontWeight: 500, margin: '0 0 2px 0', color: 'var(--cm-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {analysis.gameName}
                </h3>
                <p style={{ fontSize: '11px', color: 'var(--cm-text-muted)', margin: 0 }}>
                  {analysis.positions} positions
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, marginLeft: '12px' }}>
                {analysis.status === 'pending' && (
                  <span style={{
                    fontSize: '11px',
                    color: 'var(--cm-text-muted)',
                    background: 'var(--cm-bg-hover)',
                    padding: '2px 8px',
                    borderRadius: '10px',
                    border: '1px solid var(--cm-border-subtle)',
                  }}>
                    Waiting
                  </span>
                )}
                {analysis.status === 'analyzing' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <LoadingSpinner size="sm" />
                    <span style={{ fontSize: '12px', color: 'var(--cm-accent)' }}>
                      {analysis.analyzed}/{analysis.positions}
                    </span>
                  </div>
                )}
                {analysis.status === 'complete' && (
                  <CheckCircle size={18} style={{ color: 'var(--cm-success)' }} />
                )}
                {analysis.status === 'error' && (
                  <AlertCircle size={18} style={{ color: 'var(--cm-error)' }} />
                )}
              </div>
            </div>

            {/* Progress bar */}
            {analysis.status === 'analyzing' && (
              <div style={{
                height: '4px',
                background: 'var(--cm-bg-hover)',
                borderRadius: '2px',
                overflow: 'hidden',
                marginBottom: '0',
              }}>
                <div style={{
                  height: '100%',
                  background: 'var(--cm-accent)',
                  width: `${(analysis.analyzed / analysis.positions) * 100}%`,
                  transition: 'width 0.3s ease',
                  borderRadius: '2px',
                }} />
              </div>
            )}

            {/* Results */}
            {analysis.status === 'complete' && analysis.insights && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
                gap: '8px',
                padding: '10px',
                background: 'var(--cm-bg-hover)',
                borderRadius: '8px',
              }}>
                {[
                  { label: 'Accuracy', value: `${analysis.insights.accuracy.toFixed(1)}%`, color: 'var(--cm-accent)' },
                  { label: 'Best Moves', value: String(analysis.insights.bestMoves), color: 'var(--cm-success)' },
                  { label: 'Mistakes', value: String(analysis.insights.mistakes), color: 'var(--cm-warning)' },
                  { label: 'Blunders', value: String(analysis.insights.blunders), color: 'var(--cm-error)' },
                ].map(stat => (
                  <div key={stat.label}>
                    <p style={{ fontSize: '10px', color: 'var(--cm-text-muted)', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                      {stat.label}
                    </p>
                    <p style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: stat.color }}>
                      {stat.value}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {analysis.status === 'error' && analysis.error && (
              <p style={{ fontSize: '12px', color: 'var(--cm-error)', margin: '8px 0 0', padding: '6px 10px', background: 'var(--cm-error-dim)', borderRadius: '6px' }}>
                {analysis.error}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
