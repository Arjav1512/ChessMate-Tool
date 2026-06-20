import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { parsePGN } from '../../lib/pgn';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { WeaknessProfile } from './WeaknessProfile';
import { useWeaknessProfile } from '../../hooks/useWeaknessProfile';

interface AnalysisResult {
  game_id: string;
  accuracy: number;
  mistakes: number;
  inaccuracies: number | null;
  blunders: number;
  good_moves: number;
  best_moves: number;
}

interface GameRow {
  id: string;
  result: string;
  date: string;
  uploaded_at: string;
  pgn: string;
  white_player: string;
  black_player: string;
  user_color: 'white' | 'black' | null;
}

interface GameStats {
  totalGames: number;
  ratingData: Array<{ date: string; rating: number }>;
  mistakeBreakdown: {
    blunders: number;
    mistakes: number;
    inaccuracies: number;
  };
  openingPerformance: Array<{ opening: string; winRate: number; games: number }>;
  areasForImprovement: Array<{ area: string; score: number }>;
}

export function ProgressBar() {
  const { user } = useAuth();
  const weakness = useWeaknessProfile();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<GameStats>({
    totalGames: 0,
    ratingData: [],
    mistakeBreakdown: { blunders: 0, mistakes: 0, inaccuracies: 0 },
    openingPerformance: [],
    areasForImprovement: []
  });

  const loadStats = useCallback(async () => {
    if (!user) return;

    const [gamesRes, analysisRes] = await Promise.allSettled([
      supabase
        .from('games')
        .select('id, result, date, uploaded_at, pgn, white_player, black_player, user_color')
        .eq('user_id', user.id)
        .order('uploaded_at', { ascending: true }),
      supabase
        .from('game_analysis_results')
        .select('game_id, accuracy, mistakes, inaccuracies, blunders, good_moves, best_moves')
        .eq('user_id', user.id),
    ]);

    const games: GameRow[] = gamesRes.status === 'fulfilled' ? (gamesRes.value.data || []) : [];
    const analyses: AnalysisResult[] = analysisRes.status === 'fulfilled' ? (analysisRes.value.data || []) : [];

    if (games.length === 0) {
      setLoading(false);
      return;
    }

    // Score trend: cumulative score over time. Only games with a known
    // user_color contribute — unresolved games leave the cumulative
    // line flat so the chart never shows fabricated wins.
    let cumulative = 0;
    const ratingData = games.map((game, idx) => {
      const isWhite = game.user_color === 'white';
      const isBlack = game.user_color === 'black';
      const userWon =
        (isWhite && game.result === '1-0') ||
        (isBlack && game.result === '0-1');
      const userLost =
        (isWhite && game.result === '0-1') ||
        (isBlack && game.result === '1-0');
      if (userWon) cumulative += 1;
      else if (userLost) cumulative -= 1;
      const label = game.date && game.date !== '??'
        ? game.date.replace(/\.\d+$/, '')
        : `#${idx + 1}`;
      return { date: label, rating: cumulative };
    });

    // Real Lichess-style breakdown from per-game analysis. After the
    // 20260615010000 migration, inaccuracies live in their own column;
    // for older rows analysed before that split, inaccuracies is NULL
    // and the inaccuracy count is rolled into mistakes — we keep it
    // there rather than guessing.
    const totalMistakes = analyses.reduce((s, a) => s + (a.mistakes || 0), 0);
    const totalBlunders = analyses.reduce((s, a) => s + (a.blunders || 0), 0);
    const totalInaccuracies = analyses.reduce((s, a) => s + (a.inaccuracies ?? 0), 0);
    const mistakeBreakdown = analyses.length > 0
      ? {
          blunders: totalBlunders,
          mistakes: totalMistakes,
          inaccuracies: totalInaccuracies,
        }
      : { blunders: 0, mistakes: 0, inaccuracies: 0 };

    // Opening performance from PGN first-move extraction (user-color-aware win rate)
    const openingMap = new Map<string, { wins: number; total: number }>();
    for (const game of games) {
      let firstMove = '';
      try {
        const pgn = parsePGN(game.pgn);
        firstMove = pgn.moves[0] || '';
      } catch {
        continue;
      }
      const openingName = classifyOpening(firstMove);
      const existing = openingMap.get(openingName) || { wins: 0, total: 0 };
      existing.total += 1;

      // Only resolved-color games contribute to win rates — otherwise
      // we'd inflate the rate with games where we don't know which side
      // the user was on.
      const isWhite = game.user_color === 'white';
      const isBlack = game.user_color === 'black';
      const userWon =
        (isWhite && game.result === '1-0') ||
        (isBlack && game.result === '0-1');
      if (userWon) existing.wins += 1;

      openingMap.set(openingName, existing);
    }
    const openingPerformance = Array.from(openingMap.entries())
      .filter(([, v]) => v.total > 0)
      .map(([opening, v]) => ({
        opening,
        winRate: Math.round((v.wins / v.total) * 100),
        games: v.total,
      }))
      .sort((a, b) => b.games - a.games)
      .slice(0, 5);

    // Areas for improvement from analysis accuracy
    const avgAccuracy = analyses.length > 0
      ? analyses.reduce((s, a) => s + (a.accuracy || 0), 0) / analyses.length
      : 0;
    const avgMistakesPerGame = analyses.length > 0 ? totalMistakes / analyses.length : 0;
    const avgBlundersPerGame = analyses.length > 0 ? totalBlunders / analyses.length : 0;
    const areasForImprovement = analyses.length > 0
      ? [
          { area: 'Move Accuracy', score: Math.round(avgAccuracy) },
          { area: 'Avoiding Mistakes', score: Math.max(0, Math.round(100 - avgMistakesPerGame * 10)) },
          { area: 'Avoiding Blunders', score: Math.max(0, Math.round(100 - avgBlundersPerGame * 20)) },
        ]
      : [
          { area: 'Move Accuracy', score: 0 },
          { area: 'Avoiding Mistakes', score: 0 },
          { area: 'Avoiding Blunders', score: 0 },
        ];

    setStats({
      totalGames: games.length,
      ratingData,
      mistakeBreakdown,
      openingPerformance,
      areasForImprovement,
    });
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (user) {
      loadStats();
    }
  }, [user, loadStats]);

  // Map first move SAN to opening family name
  function classifyOpening(firstMove: string): string {
    if (!firstMove) return 'Unknown';
    const m = firstMove.toLowerCase();
    if (m === 'e4') return "King's Pawn (1.e4)";
    if (m === 'd4') return "Queen's Pawn (1.d4)";
    if (m === 'c4') return 'English Opening (1.c4)';
    if (m === 'nf3') return "Réti / Nf3 Systems";
    if (m === 'g3') return 'King\'s Fianchetto (1.g3)';
    if (m === 'f4') return 'Bird\'s Opening (1.f4)';
    return `Other (1.${firstMove})`;
  }

  if (loading) {
    return (
      <div style={{
        background: 'var(--cm-bg-elevated)',
        border: '1px solid var(--cm-border-subtle)',
        borderRadius: '10px',
        padding: '40px',
        display: 'flex',
        justifyContent: 'center',
      }}>
        <LoadingSpinner size="md" text="Loading progress..." />
      </div>
    );
  }

  if (stats.totalGames === 0) {
    return (
      <div style={{
        background: 'var(--cm-bg-elevated)',
        border: '1px solid var(--cm-border-subtle)',
        borderRadius: '12px',
        padding: '28px 24px',
      }}>
        <div
          aria-hidden
          style={{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            background: 'var(--cm-accent-dim)',
            border: '1px solid var(--cm-accent-ring)',
            color: 'var(--cm-accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 14px',
            fontSize: '22px',
          }}
        >
          📈
        </div>
        <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--cm-text-primary)', margin: '0 0 8px', textAlign: 'center' }}>
          No progress data yet
        </h3>
        <p style={{ color: 'var(--cm-text-secondary)', margin: '0 0 16px', fontSize: '13px', lineHeight: 1.6, textAlign: 'center', maxWidth: '440px', marginLeft: 'auto', marginRight: 'auto' }}>
          Your progress charts populate automatically as you import and analyze games. You&rsquo;ll see:
        </p>
        <ul
          style={{
            margin: '0 auto',
            maxWidth: '440px',
            padding: 0,
            listStyle: 'none',
            display: 'grid',
            gap: '8px',
          }}
        >
          {[
            'Cumulative W/L trend across every game you import.',
            'Mistake / blunder / inaccuracy breakdown.',
            'Opening performance and win-rate per first move.',
            'Areas-for-improvement based on Stockfish accuracy.',
          ].map((line) => (
            <li
              key={line}
              style={{
                display: 'flex',
                gap: '8px',
                fontSize: '13px',
                color: 'var(--cm-text-secondary)',
                lineHeight: 1.55,
              }}
            >
              <span style={{ color: 'var(--cm-accent)' }}>•</span>
              <span>{line}</span>
            </li>
          ))}
        </ul>
        <p style={{ color: 'var(--cm-text-muted)', margin: '16px auto 0', fontSize: '12px', textAlign: 'center', maxWidth: '440px' }}>
          Import your first game from the sidebar to get started.
        </p>
      </div>
    );
  }

  const totalMistakes = Object.values(stats.mistakeBreakdown).reduce((a, b) => a + b, 0);

  const sectionStyle: React.CSSProperties = {
    background: 'var(--cm-bg-elevated)',
    border: '1px solid var(--cm-border-subtle)',
    borderRadius: '10px',
    padding: '20px',
  };

  const sectionTitleStyle: React.CSSProperties = {
    fontSize: '13px',
    fontWeight: 600,
    color: 'var(--cm-text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.4px',
    marginBottom: '18px',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Weakness Profile — what to work on first (read-only, from your games) */}
      <div style={sectionStyle}>
        <WeaknessProfile profile={weakness.profile} loading={weakness.loading} error={weakness.error} />
      </div>

      {/* Score Trend */}
      <div style={sectionStyle}>
        <h3 style={sectionTitleStyle}>Score Trend (cumulative W/L)</h3>
        <div style={{ position: 'relative', height: '220px' }}>
          {stats.ratingData.length > 1 ? (() => {
            const values = stats.ratingData.map(d => d.rating);
            const minVal = Math.min(...values) - 1;
            const maxVal = Math.max(...values) + 1;
            const range = maxVal - minVal || 1;
            const toY = (v: number) => 180 - ((v - minVal) / range) * 140;
            const toX = (i: number) => stats.ratingData.length === 1
              ? 300
              : (i / (stats.ratingData.length - 1)) * 560 + 20;
            const zeroY = toY(0);

            return (
              <svg width="100%" height="100%" viewBox="0 0 600 220" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" style={{ stopColor: 'var(--cm-accent)', stopOpacity: 0.25 }} />
                    <stop offset="100%" style={{ stopColor: 'var(--cm-accent)', stopOpacity: 0 }} />
                  </linearGradient>
                </defs>

                {/* Zero baseline */}
                <line x1="20" y1={zeroY} x2="580" y2={zeroY} stroke="var(--cm-border-default)" strokeWidth="1" strokeDasharray="4,4" />

                <polyline
                  fill="url(#areaGradient)"
                  stroke="none"
                  points={
                    stats.ratingData.map((d, i) => `${toX(i)},${toY(d.rating)}`).join(' ')
                    + ` ${toX(stats.ratingData.length - 1)},180 20,180`
                  }
                />
                <polyline
                  fill="none"
                  stroke="var(--cm-accent)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={stats.ratingData.map((d, i) => `${toX(i)},${toY(d.rating)}`).join(' ')}
                />
                {stats.ratingData.map((d, i) => (
                  <circle key={i} cx={toX(i)} cy={toY(d.rating)} r="4"
                    fill={d.rating > 0 ? 'var(--cm-success)' : d.rating < 0 ? 'var(--cm-error)' : 'var(--cm-accent)'}
                    stroke="var(--cm-bg-elevated)" strokeWidth="2" />
                ))}

                <line x1="20" y1="20" x2="20" y2="180" stroke="var(--cm-border-subtle)" strokeWidth="1" />
                <line x1="20" y1="180" x2="580" y2="180" stroke="var(--cm-border-subtle)" strokeWidth="1" />

                {stats.ratingData.map((d, i) => {
                  const label = d.date.length > 7 ? d.date.slice(0, 7) : d.date;
                  return (
                    <text key={i} x={toX(i)} y="198" fill="var(--cm-text-muted)" fontSize="10" textAnchor="middle">
                      {label}
                    </text>
                  );
                })}
              </svg>
            );
          })() : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--cm-text-muted)', fontSize: '13px' }}>
              Need at least 2 games to show trend
            </div>
          )}
        </div>
      </div>

      {/* Mistake Analysis */}
      <div style={sectionStyle}>
        <h3 style={sectionTitleStyle}>Mistake Analysis</h3>
        {totalMistakes === 0 ? (
          <p style={{ color: 'var(--cm-text-muted)', fontSize: '13px', margin: 0 }}>
            Run <strong style={{ color: 'var(--cm-text-secondary)' }}>Bulk Analysis</strong> to see your mistake breakdown.
          </p>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '28px' }}>
            <div style={{ position: 'relative', width: '160px', height: '160px', flexShrink: 0 }}>
              <svg width="160" height="160" viewBox="0 0 180 180">
                <DonutChart
                  data={[
                    { value: stats.mistakeBreakdown.blunders, color: 'var(--cm-error)', label: 'Blunders' },
                    { value: stats.mistakeBreakdown.mistakes, color: 'var(--cm-warning)', label: 'Mistakes' },
                    { value: stats.mistakeBreakdown.inaccuracies, color: 'var(--cm-info)', label: 'Inaccuracies' },
                  ]}
                  total={totalMistakes}
                />
              </svg>
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <LegendItem color="var(--cm-error)" label={`Blunders (${stats.mistakeBreakdown.blunders})`} />
              <LegendItem color="var(--cm-warning)" label={`Mistakes (${stats.mistakeBreakdown.mistakes})`} />
              {stats.mistakeBreakdown.inaccuracies > 0 && (
                <LegendItem color="var(--cm-info)" label={`Inaccuracies (${stats.mistakeBreakdown.inaccuracies})`} />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Opening Performance */}
      <div style={sectionStyle}>
        <h3 style={sectionTitleStyle}>Opening Performance <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: 'var(--cm-text-muted)', fontSize: '11px' }}>(your wins)</span></h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {stats.openingPerformance.map((opening) => (
            <div key={opening.opening} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
              <span style={{ fontSize: '13px', color: 'var(--cm-text-secondary)', flex: 1 }}>
                {opening.opening}
              </span>
              <span style={{
                fontSize: '12px',
                fontWeight: 600,
                padding: '3px 10px',
                borderRadius: '10px',
                background: opening.winRate >= 60 ? 'var(--cm-success-dim)' :
                           opening.winRate >= 50 ? 'var(--cm-warning-dim)' :
                           'var(--cm-error-dim)',
                color: opening.winRate >= 60 ? 'var(--cm-success)' :
                       opening.winRate >= 50 ? 'var(--cm-warning)' :
                       'var(--cm-error)',
                flexShrink: 0,
              }}>
                {opening.winRate}% Win
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Areas for Improvement */}
      <div style={sectionStyle}>
        <h3 style={sectionTitleStyle}>Areas for Improvement</h3>
        {stats.areasForImprovement.every(a => a.score === 0) ? (
          <p style={{ color: 'var(--cm-text-muted)', fontSize: '13px', margin: 0 }}>
            Run <strong style={{ color: 'var(--cm-text-secondary)' }}>Bulk Analysis</strong> to see accuracy-based improvement scores.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {stats.areasForImprovement.map((area) => (
              <div key={area.area}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '13px', color: 'var(--cm-text-secondary)' }}>{area.area}</span>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--cm-accent)' }}>{area.score}%</span>
                </div>
                <div style={{
                  width: '100%',
                  height: '6px',
                  background: 'var(--cm-bg-hover)',
                  borderRadius: '3px',
                  overflow: 'hidden',
                  border: '1px solid var(--cm-border-subtle)',
                }}>
                  <div style={{
                    width: `${area.score}%`,
                    height: '100%',
                    background: 'var(--cm-accent-strong)',
                    borderRadius: '3px',
                    transition: 'width 0.4s ease',
                  }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function DonutChart({ data, total }: { data: Array<{ value: number; color: string; label: string }>; total: number }) {
  let currentAngle = -90;
  const center = 90;
  const radius = 70;
  const innerRadius = 45;

  return (
    <>
      {data.map((segment, idx) => {
        const percentage = segment.value / total;
        const angle = percentage * 360;
        const startAngle = currentAngle;
        const endAngle = startAngle + angle;

        const x1 = center + radius * Math.cos((startAngle * Math.PI) / 180);
        const y1 = center + radius * Math.sin((startAngle * Math.PI) / 180);
        const x2 = center + radius * Math.cos((endAngle * Math.PI) / 180);
        const y2 = center + radius * Math.sin((endAngle * Math.PI) / 180);

        const ix1 = center + innerRadius * Math.cos((startAngle * Math.PI) / 180);
        const iy1 = center + innerRadius * Math.sin((startAngle * Math.PI) / 180);
        const ix2 = center + innerRadius * Math.cos((endAngle * Math.PI) / 180);
        const iy2 = center + innerRadius * Math.sin((endAngle * Math.PI) / 180);

        const largeArc = angle > 180 ? 1 : 0;

        const path = [
          `M ${x1} ${y1}`,
          `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
          `L ${ix2} ${iy2}`,
          `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${ix1} ${iy1}`,
          'Z'
        ].join(' ');

        currentAngle = endAngle;

        return <path key={idx} d={path} fill={segment.color} />;
      })}
    </>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div style={{
        width: '12px',
        height: '12px',
        borderRadius: '3px',
        background: color,
        flexShrink: 0,
      }} />
      <span style={{ fontSize: '12px', color: 'var(--cm-text-secondary)' }}>{label}</span>
    </div>
  );
}
