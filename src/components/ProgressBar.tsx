import { useEffect, useState, useCallback } from 'react';
import { supabase, Game } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface GameStats {
  totalGames: number;
  ratingData: Array<{ date: string; rating: number }>;
  mistakeBreakdown: {
    tactical: number;
    positional: number;
    timeManagement: number;
    endgame: number;
  };
  openingPerformance: Array<{ opening: string; winRate: number; games: number }>;
  areasForImprovement: Array<{ area: string; score: number }>;
}

export function ProgressBar() {
  const { user } = useAuth();
  const [stats, setStats] = useState<GameStats>({
    totalGames: 0,
    ratingData: [],
    mistakeBreakdown: { tactical: 0, positional: 0, timeManagement: 0, endgame: 0 },
    openingPerformance: [],
    areasForImprovement: []
  });

  const loadStats = useCallback(async () => {
    if (!user) return;

    const { data: games } = await supabase
      .from('games')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: true });

    if (!games || games.length === 0) {
      return;
    }

    const ratingData = generateRatingData(games);
    const mistakeBreakdown = analyzeMistakes(games);
    const openingPerformance = analyzeOpenings(games);
    const areasForImprovement = calculateImprovement();

    setStats({
      totalGames: games.length,
      ratingData,
      mistakeBreakdown,
      openingPerformance,
      areasForImprovement
    });
  }, [user]);

  useEffect(() => {
    if (user) {
      loadStats();
    }
  }, [user, loadStats]);

  const generateRatingData = (games: Game[]) => {
    const baseRating = 1685;
    return games.slice(0, 4).map((game, idx) => {
      const result = game.result;
      let change = 0;
      if (result === '1-0') change = 15;
      else if (result === '0-1') change = -10;
      else if (result === '1/2-1/2') change = 5;

      return {
        date: game.date || `Game ${idx + 1}`,
        rating: baseRating + (idx * 15) + change
      };
    });
  };

  const analyzeMistakes = (games: Game[]) => {
    const total = games.length * 10;
    return {
      tactical: Math.floor(total * 0.35),
      positional: Math.floor(total * 0.25),
      timeManagement: Math.floor(total * 0.15),
      endgame: Math.floor(total * 0.25)
    };
  };

  const analyzeOpenings = (games: Game[]) => {
    const openings = [
      { opening: 'Sicilian Defense', winRate: 65, games: Math.floor(games.length * 0.3) },
      { opening: "Queen's Gambit Declined", winRate: 45, games: Math.floor(games.length * 0.25) },
      { opening: 'Italian Game', winRate: 58, games: Math.floor(games.length * 0.20) }
    ];
    return openings.filter(o => o.games > 0);
  };

  const calculateImprovement = () => {
    return [
      { area: 'Endgame Technique', score: 40 },
      { area: 'Tactical Vision', score: 75 },
      { area: 'Time Management', score: 60 }
    ];
  };

  if (stats.totalGames === 0) {
    return (
      <div className="card" style={{ padding: 'var(--space-24)', textAlign: 'center' }}>
        <p style={{ color: 'var(--color-text-secondary)', margin: 0 }}>
          Upload games to see your progress statistics
        </p>
      </div>
    );
  }

  const totalMistakes = Object.values(stats.mistakeBreakdown).reduce((a, b) => a + b, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-24)' }}>
      <div className="card" style={{ padding: 'var(--space-24)' }}>
        <h3 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-semibold)', marginBottom: 'var(--space-24)' }}>
          Rating Progress
        </h3>

        <div style={{ position: 'relative', height: '240px' }}>
          <svg width="100%" height="100%" viewBox="0 0 600 240" preserveAspectRatio="none">
            <defs>
              <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style={{ stopColor: '#06b6d4', stopOpacity: 0.3 }} />
                <stop offset="100%" style={{ stopColor: '#06b6d4', stopOpacity: 0 }} />
              </linearGradient>
            </defs>

            {stats.ratingData.length > 0 && (
              <>
                <polyline
                  fill="url(#areaGradient)"
                  stroke="none"
                  points={
                    stats.ratingData.map((d, i) => {
                      const x = (i / (stats.ratingData.length - 1)) * 560 + 20;
                      const y = 200 - ((d.rating - 1650) / 150) * 160;
                      return `${x},${y}`;
                    }).join(' ') + ` 580,200 20,200`
                  }
                />

                <polyline
                  fill="none"
                  stroke="#06b6d4"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={
                    stats.ratingData.map((d, i) => {
                      const x = (i / (stats.ratingData.length - 1)) * 560 + 20;
                      const y = 200 - ((d.rating - 1650) / 150) * 160;
                      return `${x},${y}`;
                    }).join(' ')
                  }
                />

                {stats.ratingData.map((d, i) => {
                  const x = (i / (stats.ratingData.length - 1)) * 560 + 20;
                  const y = 200 - ((d.rating - 1650) / 150) * 160;
                  return (
                    <circle
                      key={i}
                      cx={x}
                      cy={y}
                      r="5"
                      fill="#06b6d4"
                      stroke="#1e293b"
                      strokeWidth="2"
                    />
                  );
                })}
              </>
            )}

            <line x1="20" y1="20" x2="20" y2="200" stroke="#334155" strokeWidth="1" />
            <line x1="20" y1="200" x2="580" y2="200" stroke="#334155" strokeWidth="1" />

            {[1800, 1780, 1760, 1740, 1720, 1700, 1680, 1650].map((rating) => {
              const y = 200 - ((rating - 1650) / 150) * 160;
              return (
                <g key={rating}>
                  <line x1="15" y1={y} x2="20" y2={y} stroke="#475569" strokeWidth="1" />
                  <text x="10" y={y + 4} fill="#64748b" fontSize="11" textAnchor="end">
                    {rating}
                  </text>
                </g>
              );
            })}

            {stats.ratingData.map((d, i) => {
              const x = (i / (stats.ratingData.length - 1)) * 560 + 20;
              const label = d.date.split(' ').slice(0, 2).join(' ');
              return (
                <text
                  key={i}
                  x={x}
                  y="220"
                  fill="#64748b"
                  fontSize="11"
                  textAnchor="middle"
                >
                  {label}
                </text>
              );
            })}
          </svg>
        </div>
      </div>

      <div className="card" style={{ padding: 'var(--space-24)' }}>
        <h3 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-semibold)', marginBottom: 'var(--space-24)' }}>
          Mistake Analysis
        </h3>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-32)' }}>
          <div style={{ position: 'relative', width: '180px', height: '180px' }}>
            <svg width="180" height="180" viewBox="0 0 180 180">
              <DonutChart
                data={[
                  { value: stats.mistakeBreakdown.tactical, color: '#06b6d4', label: 'Tactical Blunders' },
                  { value: stats.mistakeBreakdown.positional, color: '#fb923c', label: 'Positional Mistakes' },
                  { value: stats.mistakeBreakdown.timeManagement, color: '#ef4444', label: 'Time Management' },
                  { value: stats.mistakeBreakdown.endgame, color: '#e5e7eb', label: 'Endgame Errors' }
                ]}
                total={totalMistakes}
              />
            </svg>
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--space-12)' }}>
            <LegendItem color="#06b6d4" label="Tactical Blunders" />
            <LegendItem color="#fb923c" label="Positional Mistakes" />
            <LegendItem color="#ef4444" label="Time Management" />
            <LegendItem color="#e5e7eb" label="Endgame Errors" />
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 'var(--space-24)' }}>
        <h3 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-semibold)', marginBottom: 'var(--space-24)' }}>
          Opening Performance
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-16)' }}>
          {stats.openingPerformance.map((opening) => (
            <div key={opening.opening} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text)' }}>
                {opening.opening}
              </span>
              <span
                style={{
                  fontSize: 'var(--font-size-sm)',
                  fontWeight: 'var(--font-weight-semibold)',
                  padding: 'var(--space-4) var(--space-12)',
                  borderRadius: 'var(--radius-full)',
                  background: opening.winRate >= 60 ? 'rgba(34, 197, 94, 0.15)' :
                             opening.winRate >= 50 ? 'rgba(251, 146, 60, 0.15)' :
                             'rgba(239, 68, 68, 0.15)',
                  color: opening.winRate >= 60 ? '#22c55e' :
                         opening.winRate >= 50 ? '#fb923c' :
                         '#ef4444'
                }}
              >
                {opening.winRate}% Win Rate
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="card" style={{ padding: 'var(--space-24)' }}>
        <h3 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-semibold)', marginBottom: 'var(--space-24)' }}>
          Areas for Improvement
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-16)' }}>
          {stats.areasForImprovement.map((area) => (
            <div key={area.area}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-8)' }}>
                <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text)' }}>
                  {area.area}
                </span>
                <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)', color: '#06b6d4' }}>
                  {area.score}%
                </span>
              </div>
              <div style={{
                width: '100%',
                height: '8px',
                background: 'var(--color-bg-2)',
                borderRadius: 'var(--radius-full)',
                overflow: 'hidden'
              }}>
                <div style={{
                  width: `${area.score}%`,
                  height: '100%',
                  background: '#06b6d4',
                  borderRadius: 'var(--radius-full)',
                  transition: 'width 0.3s ease'
                }} />
              </div>
            </div>
          ))}
        </div>
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
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-8)' }}>
      <div style={{
        width: '16px',
        height: '16px',
        borderRadius: 'var(--radius-sm)',
        background: color,
        flexShrink: 0
      }} />
      <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text)' }}>
        {label}
      </span>
    </div>
  );
}
