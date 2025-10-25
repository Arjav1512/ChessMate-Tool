import { useEffect, useState, useCallback } from 'react';
import { TrendingUp, TrendingDown, Target, AlertCircle, CheckCircle, Zap } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface UserStats {
  total_games_analyzed: number;
  average_accuracy: number;
  total_mistakes: number;
  total_blunders: number;
  games_as_white: number;
  games_as_black: number;
  wins: number;
  losses: number;
  draws: number;
}

interface ProgressSnapshot {
  snapshot_date: string;
  average_accuracy: number;
  games_analyzed: number;
  mistakes_per_game: number;
  blunders_per_game: number;
}

interface RecentGame {
  id: string;
  white_player: string;
  black_player: string;
  result: string;
  uploaded_at: string;
  accuracy?: number;
  mistakes?: number;
  blunders?: number;
}

export function StatsDashboard({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [recentGames, setRecentGames] = useState<RecentGame[]>([]);
  const [progressData, setProgressData] = useState<ProgressSnapshot[]>([]);
  const [loading, setLoading] = useState(true);

  const loadStatistics = useCallback(async () => {
    try {
      setLoading(true);

      const [statsResult, gamesResult, progressResult] = await Promise.all([
        supabase
          .from('user_statistics')
          .select('*')
          .eq('user_id', user!.id)
          .maybeSingle(),
        supabase
          .from('games')
          .select(`
            id,
            white_player,
            black_player,
            result,
            uploaded_at,
            game_analysis_results(accuracy, mistakes, blunders)
          `)
          .eq('user_id', user!.id)
          .order('uploaded_at', { ascending: false })
          .limit(10),
        supabase
          .from('user_progress_snapshots')
          .select('*')
          .eq('user_id', user!.id)
          .order('snapshot_date', { ascending: false })
          .limit(30),
      ]);

      if (statsResult.data) {
        setStats(statsResult.data);
      }

      if (gamesResult.data) {
        const formattedGames = gamesResult.data.map((game: Record<string, unknown>) => ({
          id: game.id as string,
          white_player: game.white_player as string,
          black_player: game.black_player as string,
          result: game.result as string,
          uploaded_at: game.uploaded_at as string,
          accuracy: (game.game_analysis_results as Array<{ accuracy?: number }>)?.[0]?.accuracy,
          mistakes: (game.game_analysis_results as Array<{ mistakes?: number }>)?.[0]?.mistakes,
          blunders: (game.game_analysis_results as Array<{ blunders?: number }>)?.[0]?.blunders,
        }));
        setRecentGames(formattedGames);
      }

      if (progressResult.data) {
        setProgressData(progressResult.data);
      }
    } catch (error) {
      console.error('Failed to load statistics:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadStatistics();
    }
  }, [user, loadStatistics]);

  if (loading) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000
      }}>
        <div className="card" style={{ padding: 'var(--space-32)', textAlign: 'center' }}>
          <div className="spinner" style={{ margin: '0 auto var(--space-16)' }} />
          <p>Loading statistics...</p>
        </div>
      </div>
    );
  }

  const hasData = stats && stats.total_games_analyzed > 0;

  const getTrend = () => {
    if (progressData.length < 2) return null;
    const latest = progressData[0].average_accuracy;
    const previous = progressData[1].average_accuracy;
    const diff = latest - previous;
    return { direction: diff > 0 ? 'up' : 'down', value: Math.abs(diff) };
  };

  const trend = getTrend();

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000,
      padding: 'var(--space-16)',
      overflowY: 'auto'
    }}>
      <div className="card" style={{
        width: '100%',
        maxWidth: '1200px',
        maxHeight: '90vh',
        overflowY: 'auto',
        padding: 'var(--space-32)'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 'var(--space-24)'
        }}>
          <h2 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)' }}>
            Your Chess Statistics
          </h2>
          <button onClick={onClose} className="btn btn--secondary">Close</button>
        </div>

        {!hasData ? (
          <div style={{ textAlign: 'center', padding: 'var(--space-48)' }}>
            <Target size={48} style={{ color: 'var(--color-text-secondary)', margin: '0 auto var(--space-16)' }} />
            <h3 style={{ fontSize: 'var(--font-size-xl)', marginBottom: 'var(--space-8)' }}>No Data Yet</h3>
            <p style={{ color: 'var(--color-text-secondary)' }}>
              Analyze some games to see your statistics and track your progress!
            </p>
          </div>
        ) : (
          <>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: 'var(--space-16)',
              marginBottom: 'var(--space-32)'
            }}>
              <div className="card" style={{ padding: 'var(--space-20)', background: 'var(--color-primary-light)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-12)', marginBottom: 'var(--space-8)' }}>
                  <Target size={24} style={{ color: 'var(--color-primary)' }} />
                  <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                    Average Accuracy
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-8)' }}>
                  <span style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 'var(--font-weight-bold)' }}>
                    {stats.average_accuracy?.toFixed(1)}%
                  </span>
                  {trend && (
                    <span style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--space-4)',
                      fontSize: 'var(--font-size-sm)',
                      color: trend.direction === 'up' ? 'var(--color-success)' : 'var(--color-error)'
                    }}>
                      {trend.direction === 'up' ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                      {trend.value.toFixed(1)}%
                    </span>
                  )}
                </div>
              </div>

              <div className="card" style={{ padding: 'var(--space-20)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-12)', marginBottom: 'var(--space-8)' }}>
                  <CheckCircle size={24} style={{ color: 'var(--color-success)' }} />
                  <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                    Games Analyzed
                  </span>
                </div>
                <span style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 'var(--font-weight-bold)' }}>
                  {stats.total_games_analyzed}
                </span>
              </div>

              <div className="card" style={{ padding: 'var(--space-20)', background: 'rgba(var(--color-error-rgb), 0.1)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-12)', marginBottom: 'var(--space-8)' }}>
                  <AlertCircle size={24} style={{ color: 'var(--color-error)' }} />
                  <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                    Total Mistakes
                  </span>
                </div>
                <span style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 'var(--font-weight-bold)' }}>
                  {stats.total_mistakes}
                </span>
              </div>

              <div className="card" style={{ padding: 'var(--space-20)', background: 'rgba(var(--color-error-rgb), 0.15)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-12)', marginBottom: 'var(--space-8)' }}>
                  <Zap size={24} style={{ color: 'var(--color-error)' }} />
                  <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                    Total Blunders
                  </span>
                </div>
                <span style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 'var(--font-weight-bold)' }}>
                  {stats.total_blunders}
                </span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--space-24)' }}>
              <div>
                <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-semibold)', marginBottom: 'var(--space-16)' }}>
                  Game Results
                </h3>
                <div className="card" style={{ padding: 'var(--space-20)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-12)' }}>
                    <span>Wins</span>
                    <span style={{ fontWeight: 'var(--font-weight-bold)', color: 'var(--color-success)' }}>
                      {stats.wins}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-12)' }}>
                    <span>Losses</span>
                    <span style={{ fontWeight: 'var(--font-weight-bold)', color: 'var(--color-error)' }}>
                      {stats.losses}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Draws</span>
                    <span style={{ fontWeight: 'var(--font-weight-bold)' }}>
                      {stats.draws}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-semibold)', marginBottom: 'var(--space-16)' }}>
                  Color Distribution
                </h3>
                <div className="card" style={{ padding: 'var(--space-20)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-12)' }}>
                    <span>As White</span>
                    <span style={{ fontWeight: 'var(--font-weight-bold)' }}>
                      {stats.games_as_white}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>As Black</span>
                    <span style={{ fontWeight: 'var(--font-weight-bold)' }}>
                      {stats.games_as_black}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {recentGames.length > 0 && (
              <div style={{ marginTop: 'var(--space-32)' }}>
                <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-semibold)', marginBottom: 'var(--space-16)' }}>
                  Recent Games
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-12)' }}>
                  {recentGames.map((game) => (
                    <div key={game.id} className="card" style={{ padding: 'var(--space-16)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-12)' }}>
                        <div>
                          <div style={{ fontWeight: 'var(--font-weight-semibold)', marginBottom: 'var(--space-4)' }}>
                            {game.white_player} vs {game.black_player}
                          </div>
                          <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                            {new Date(game.uploaded_at).toLocaleDateString()}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 'var(--space-16)', alignItems: 'center' }}>
                          {game.accuracy !== undefined && (
                            <div style={{ textAlign: 'center' }}>
                              <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>Accuracy</div>
                              <div style={{ fontWeight: 'var(--font-weight-bold)' }}>{game.accuracy.toFixed(1)}%</div>
                            </div>
                          )}
                          {game.mistakes !== undefined && (
                            <div style={{ textAlign: 'center' }}>
                              <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>Mistakes</div>
                              <div style={{ fontWeight: 'var(--font-weight-bold)', color: 'var(--color-error)' }}>{game.mistakes}</div>
                            </div>
                          )}
                          {game.blunders !== undefined && (
                            <div style={{ textAlign: 'center' }}>
                              <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>Blunders</div>
                              <div style={{ fontWeight: 'var(--font-weight-bold)', color: 'var(--color-error)' }}>{game.blunders}</div>
                            </div>
                          )}
                          <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-bold)' }}>
                            {game.result}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
