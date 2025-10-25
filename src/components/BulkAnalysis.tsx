import { useState, useEffect, useCallback } from 'react';
import { Brain, Loader, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase, Game } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { stockfish } from '../lib/stockfish';
import { parsePGN } from '../lib/pgn';
import { Chess } from 'chess.js';

interface GameAnalysis {
  gameId: string;
  gameName: string;
  status: 'pending' | 'analyzing' | 'complete' | 'error';
  positions: number;
  analyzed: number;
  insights: {
    avgEvaluation: number;
    bestMoves: number;
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

  const loadGames = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('games')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setGames(data || []);

      const initialAnalyses = new Map<string, GameAnalysis>();
      data?.forEach(game => {
        const pgnData = parsePGN(game.pgn);
        initialAnalyses.set(game.id, {
          gameId: game.id,
          gameName: `${game.white_player} vs ${game.black_player}`,
          status: 'pending',
          positions: pgnData.moves.length,
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
      let bestMoves = 0;
      let mistakes = 0;
      let blunders = 0;

      for (let i = 0; i < pgnData.moves.length; i++) {
        chess.move(pgnData.moves[i]);

        try {
          const result = await stockfish.analyzePosition(chess.fen(), 15, 1);
          const evalNum = parseFloat(result.evaluation);
          evaluations.push(evalNum);

          if (i > 0) {
            const evalDiff = Math.abs(evaluations[i] - evaluations[i - 1]);
            if (evalDiff < 0.3) bestMoves++;
            else if (evalDiff < 1.0) mistakes++;
            else blunders++;
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

      const avgEval = evaluations.reduce((a, b) => a + b, 0) / evaluations.length;
      const totalMoves = pgnData.moves.length;
      const accuracy = totalMoves > 0 ? (bestMoves / totalMoves) * 100 : 0;

      setAnalyses(prev => {
        const updated = new Map(prev);
        const analysis = updated.get(gameId)!;
        analysis.status = 'complete';
        analysis.insights = {
          avgEvaluation: avgEval,
          bestMoves,
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-32)' }}>
        <Loader className="animate-spin" style={{ width: '32px', height: '32px', color: 'var(--color-primary)' }} />
      </div>
    );
  }

  if (games.length === 0) {
    return (
      <div style={{ padding: 'var(--space-32)', textAlign: 'center' }}>
        <h2 style={{ fontSize: 'var(--font-size-2xl)', marginBottom: 'var(--space-16)' }}>No Games Found</h2>
        <p style={{ color: 'var(--color-text-secondary)' }}>
          Import some games first to start analyzing them in bulk.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 'var(--space-24)',
        padding: 'var(--space-24)',
        background: 'var(--color-bg-1)',
        borderRadius: 'var(--border-radius)',
        border: '1px solid var(--color-border)'
      }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 'var(--font-size-lg)' }}>Bulk Game Analysis</h3>
          <p style={{ margin: 'var(--space-4) 0 0 0', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
            Analyze {games.length} imported game{games.length !== 1 ? 's' : ''} with Stockfish engine
          </p>
        </div>
        <button
          onClick={startBulkAnalysis}
          disabled={isAnalyzing}
          className="btn btn--primary"
          style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-8)' }}
        >
          {isAnalyzing ? (
            <>
              <Loader className="animate-spin" style={{ width: '16px', height: '16px' }} />
              <span>Analyzing...</span>
            </>
          ) : (
            <>
              <Brain style={{ width: '16px', height: '16px' }} />
              <span>Start Analysis</span>
            </>
          )}
        </button>
      </div>

      <div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-16)' }}>
          {Array.from(analyses.values()).map((analysis) => (
            <div
              key={analysis.gameId}
              className="card"
              style={{
                padding: 'var(--space-16)',
                background: 'var(--color-bg-1)',
                border: '1px solid var(--color-border)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between', marginBottom: 'var(--space-12)' }}>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: 'var(--font-size-base)', margin: '0 0 var(--space-4) 0' }}>
                    {analysis.gameName}
                  </h3>
                  <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', margin: 0 }}>
                    {analysis.positions} positions
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-8)' }}>
                  {analysis.status === 'pending' && (
                    <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                      Waiting...
                    </span>
                  )}
                  {analysis.status === 'analyzing' && (
                    <>
                      <Loader className="animate-spin" style={{ width: '16px', height: '16px', color: 'var(--color-primary)' }} />
                      <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-primary)' }}>
                        {analysis.analyzed}/{analysis.positions}
                      </span>
                    </>
                  )}
                  {analysis.status === 'complete' && (
                    <CheckCircle style={{ width: '20px', height: '20px', color: 'var(--color-success)' }} />
                  )}
                  {analysis.status === 'error' && (
                    <AlertCircle style={{ width: '20px', height: '20px', color: 'var(--color-error)' }} />
                  )}
                </div>
              </div>

              {analysis.status === 'analyzing' && (
                <div style={{
                  height: '4px',
                  background: 'var(--color-border)',
                  borderRadius: '2px',
                  overflow: 'hidden'
                }}>
                  <div
                    style={{
                      height: '100%',
                      background: 'var(--color-primary)',
                      width: `${(analysis.analyzed / analysis.positions) * 100}%`,
                      transition: 'width 0.3s ease'
                    }}
                  />
                </div>
              )}

              {analysis.status === 'complete' && analysis.insights && (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                  gap: 'var(--space-12)',
                  marginTop: 'var(--space-12)',
                  padding: 'var(--space-12)',
                  background: 'var(--color-bg-2)',
                  borderRadius: 'var(--border-radius)'
                }}>
                  <div>
                    <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', margin: '0 0 var(--space-4) 0' }}>
                      Accuracy
                    </p>
                    <p style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-semibold)', margin: 0, color: 'var(--color-primary)' }}>
                      {analysis.insights.accuracy.toFixed(1)}%
                    </p>
                  </div>
                  <div>
                    <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', margin: '0 0 var(--space-4) 0' }}>
                      Best Moves
                    </p>
                    <p style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-semibold)', margin: 0, color: 'var(--color-success)' }}>
                      {analysis.insights.bestMoves}
                    </p>
                  </div>
                  <div>
                    <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', margin: '0 0 var(--space-4) 0' }}>
                      Mistakes
                    </p>
                    <p style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-semibold)', margin: 0, color: 'var(--color-warning)' }}>
                      {analysis.insights.mistakes}
                    </p>
                  </div>
                  <div>
                    <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', margin: '0 0 var(--space-4) 0' }}>
                      Blunders
                    </p>
                    <p style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-semibold)', margin: 0, color: 'var(--color-error)' }}>
                      {analysis.insights.blunders}
                    </p>
                  </div>
                </div>
              )}

              {analysis.status === 'error' && analysis.error && (
                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-error)', margin: 'var(--space-8) 0 0 0' }}>
                  {analysis.error}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
