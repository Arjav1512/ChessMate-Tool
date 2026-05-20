import { useEffect, useState, useCallback } from 'react';
import { TrendingUp, TrendingDown, Target, AlertCircle, CheckCircle, Zap, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { LoadingSpinner } from '../ui/LoadingSpinner';

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

      const [statsResult, gamesResult, progressResult, allGamesResult] = await Promise.allSettled([
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
        // Fetch all games to compute wins/losses/draws/color distribution
        supabase
          .from('games')
          .select('white_player, black_player, result')
          .eq('user_id', user!.id),
      ]);

      // Build user stats, merging DB stats with live game counts
      const dbStats = statsResult.status === 'fulfilled' ? statsResult.value.data : null;
      const allGames = allGamesResult.status === 'fulfilled'
        ? (allGamesResult.value.data || [])
        : [];

      if (dbStats || allGames.length > 0) {
        // Compute wins/losses/draws from raw game results
        let wins = 0, losses = 0, draws = 0;
        for (const g of allGames) {
          if (g.result === '1-0') wins++;
          else if (g.result === '0-1') losses++;
          else if (g.result === '1/2-1/2') draws++;
        }

        setStats({
          total_games_analyzed: dbStats?.total_games_analyzed ?? 0,
          average_accuracy: dbStats?.average_accuracy ?? 0,
          total_mistakes: dbStats?.total_mistakes ?? 0,
          total_blunders: dbStats?.total_blunders ?? 0,
          games_as_white: Math.ceil(allGames.length / 2),
          games_as_black: Math.floor(allGames.length / 2),
          wins,
          losses,
          draws,
        });
      }

      if (gamesResult.status === 'fulfilled' && gamesResult.value.data) {
        const formattedGames = gamesResult.value.data.map((game: Record<string, unknown>) => ({
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

      if (progressResult.status === 'fulfilled' && progressResult.value.data) {
        setProgressData(progressResult.value.data);
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

  const backdropStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.65)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2000,
    padding: '16px',
  };

  if (loading) {
    return (
      <div style={backdropStyle}>
        <div style={{
          background: 'var(--cm-bg-elevated)',
          border: '1px solid var(--cm-border-default)',
          borderRadius: '12px',
          padding: '40px',
          textAlign: 'center',
          boxShadow: '0 24px 48px rgba(0,0,0,0.4)',
        }}>
          <LoadingSpinner size="lg" />
          <p style={{ marginTop: '16px', color: 'var(--cm-text-secondary)', fontSize: '13px' }}>
            Loading statistics...
          </p>
        </div>
      </div>
    );
  }

  const hasData = stats && (stats.wins + stats.losses + stats.draws) > 0;

  const getTrend = () => {
    if (progressData.length < 2) return null;
    const latest = progressData[0].average_accuracy;
    const previous = progressData[1].average_accuracy;
    const diff = latest - previous;
    return { direction: diff > 0 ? 'up' : 'down', value: Math.abs(diff) };
  };

  const trend = getTrend();

  return (
    <div style={backdropStyle} onClick={onClose}>
      <div
        style={{
          background: 'var(--cm-bg-surface)',
          border: '1px solid var(--cm-border-default)',
          borderRadius: '12px',
          boxShadow: '0 24px 48px rgba(0,0,0,0.4)',
          width: '100%',
          maxWidth: '900px',
          maxHeight: '90vh',
          overflow: 'auto',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: '1px solid var(--cm-border-subtle)',
          position: 'sticky',
          top: 0,
          background: 'var(--cm-bg-surface)',
          zIndex: 1,
        }}>
          <span style={{ fontWeight: 600, fontSize: '15px', color: 'var(--cm-text-primary)' }}>
            Chess Statistics
          </span>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--cm-text-muted)',
              padding: '4px',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              transition: 'color 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--cm-text-primary)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--cm-text-muted)')}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '20px' }}>
          {!hasData ? (
            <div style={{ textAlign: 'center', padding: '48px 20px' }}>
              <Target size={40} style={{ color: 'var(--cm-text-muted)', margin: '0 auto 16px', display: 'block' }} />
              <h3 style={{ fontSize: '17px', marginBottom: '8px', color: 'var(--cm-text-primary)' }}>No Data Yet</h3>
              <p style={{ color: 'var(--cm-text-secondary)', fontSize: '14px' }}>
                Analyze some games to see your statistics and track your progress!
              </p>
            </div>
          ) : (
            <>
              {/* Stat cards grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '12px',
                marginBottom: '24px',
              }}>
                <div style={{ background: 'var(--cm-bg-elevated)', border: '1px solid var(--cm-border-subtle)', borderRadius: '10px', padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                    <Target size={15} style={{ color: 'var(--cm-text-muted)', flexShrink: 0 }} />
                    <span style={{ fontSize: '11px', color: 'var(--cm-text-muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                      Avg Accuracy
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                    <span style={{ fontSize: '28px', fontWeight: 700, color: 'var(--cm-text-primary)' }}>
                      {stats.average_accuracy?.toFixed(1)}%
                    </span>
                    {trend && (
                      <span style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3px',
                        fontSize: '12px',
                        color: trend.direction === 'up' ? 'var(--cm-success)' : 'var(--cm-error)',
                      }}>
                        {trend.direction === 'up' ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                        {trend.value.toFixed(1)}%
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ background: 'var(--cm-bg-elevated)', border: '1px solid var(--cm-border-subtle)', borderRadius: '10px', padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                    <CheckCircle size={15} style={{ color: 'var(--cm-success)', flexShrink: 0 }} />
                    <span style={{ fontSize: '11px', color: 'var(--cm-text-muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                      Games Analyzed
                    </span>
                  </div>
                  <span style={{ fontSize: '28px', fontWeight: 700, color: 'var(--cm-text-primary)' }}>
                    {stats.total_games_analyzed}
                  </span>
                </div>

                <div style={{ background: 'var(--cm-bg-elevated)', border: '1px solid var(--cm-border-subtle)', borderRadius: '10px', padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                    <AlertCircle size={15} style={{ color: 'var(--cm-warning)', flexShrink: 0 }} />
                    <span style={{ fontSize: '11px', color: 'var(--cm-text-muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                      Mistakes
                    </span>
                  </div>
                  <span style={{ fontSize: '28px', fontWeight: 700, color: 'var(--cm-text-primary)' }}>
                    {stats.total_mistakes}
                  </span>
                </div>

                <div style={{ background: 'var(--cm-bg-elevated)', border: '1px solid var(--cm-border-subtle)', borderRadius: '10px', padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                    <Zap size={15} style={{ color: 'var(--cm-error)', flexShrink: 0 }} />
                    <span style={{ fontSize: '11px', color: 'var(--cm-text-muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                      Blunders
                    </span>
                  </div>
                  <span style={{ fontSize: '28px', fontWeight: 700, color: 'var(--cm-text-primary)' }}>
                    {stats.total_blunders}
                  </span>
                </div>
              </div>

              {/* Results & Color distribution */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                <div>
                  <h3 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--cm-text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '10px' }}>
                    Game Results
                  </h3>
                  <div style={{ background: 'var(--cm-bg-elevated)', border: '1px solid var(--cm-border-subtle)', borderRadius: '10px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {[
                      { label: 'Wins', value: stats.wins, color: 'var(--cm-success)' },
                      { label: 'Losses', value: stats.losses, color: 'var(--cm-error)' },
                      { label: 'Draws', value: stats.draws, color: 'var(--cm-text-secondary)' },
                    ].map(item => (
                      <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '13px', color: 'var(--cm-text-secondary)' }}>{item.label}</span>
                        <span style={{ fontWeight: 700, fontSize: '15px', color: item.color }}>{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--cm-text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '10px' }}>
                    Color Distribution
                  </h3>
                  <div style={{ background: 'var(--cm-bg-elevated)', border: '1px solid var(--cm-border-subtle)', borderRadius: '10px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {[
                      { label: 'As White', value: stats.games_as_white },
                      { label: 'As Black', value: stats.games_as_black },
                    ].map(item => (
                      <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '13px', color: 'var(--cm-text-secondary)' }}>{item.label}</span>
                        <span style={{ fontWeight: 700, fontSize: '15px', color: 'var(--cm-text-primary)' }}>{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Recent games */}
              {recentGames.length > 0 && (
                <div>
                  <h3 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--cm-text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '10px' }}>
                    Recent Games
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {recentGames.map((game) => (
                      <div key={game.id} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '10px 14px',
                        background: 'var(--cm-bg-elevated)',
                        border: '1px solid var(--cm-border-subtle)',
                        borderRadius: '8px',
                        flexWrap: 'wrap',
                        gap: '8px',
                      }}>
                        <div>
                          <div style={{ fontWeight: 500, fontSize: '13px', marginBottom: '2px', color: 'var(--cm-text-primary)' }}>
                            {game.white_player} vs {game.black_player}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--cm-text-muted)' }}>
                            {new Date(game.uploaded_at).toLocaleDateString()}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                          {game.accuracy !== undefined && (
                            <div style={{ textAlign: 'center' }}>
                              <div style={{ fontSize: '10px', color: 'var(--cm-text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Accuracy</div>
                              <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--cm-text-primary)' }}>{game.accuracy.toFixed(1)}%</div>
                            </div>
                          )}
                          {game.mistakes !== undefined && (
                            <div style={{ textAlign: 'center' }}>
                              <div style={{ fontSize: '10px', color: 'var(--cm-text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Mistakes</div>
                              <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--cm-warning)' }}>{game.mistakes}</div>
                            </div>
                          )}
                          {game.blunders !== undefined && (
                            <div style={{ textAlign: 'center' }}>
                              <div style={{ fontSize: '10px', color: 'var(--cm-text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Blunders</div>
                              <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--cm-error)' }}>{game.blunders}</div>
                            </div>
                          )}
                          <div style={{
                            fontSize: '13px',
                            fontWeight: 700,
                            padding: '2px 8px',
                            background: 'var(--cm-bg-hover)',
                            borderRadius: '4px',
                            color: 'var(--cm-text-secondary)',
                            border: '1px solid var(--cm-border-subtle)',
                          }}>
                            {game.result}
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
    </div>
  );
}
