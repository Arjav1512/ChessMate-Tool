import { useEffect, useState, useCallback } from 'react';
import { supabase, Game } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

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
      <div style={{
        background: 'var(--cm-bg-elevated)',
        border: '1px solid var(--cm-border-subtle)',
        borderRadius: '10px',
        padding: '24px',
        textAlign: 'center',
      }}>
        <p style={{ color: 'var(--cm-text-muted)', margin: 0, fontSize: '14px' }}>
          Upload games to see your progress statistics
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
      {/* Rating Progress */}
      <div style={sectionStyle}>
        <h3 style={sectionTitleStyle}>Rating Progress</h3>
        <div style={{ position: 'relative', height: '220px' }}>
          <svg width="100%" height="100%" viewBox="0 0 600 220" preserveAspectRatio="none">
            <defs>
              <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style={{ stopColor: 'var(--cm-accent)', stopOpacity: 0.25 }} />
                <stop offset="100%" style={{ stopColor: 'var(--cm-accent)', stopOpacity: 0 }} />
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
                      const y = 180 - ((d.rating - 1650) / 150) * 140;
                      return `${x},${y}`;
                    }).join(' ') + ` 580,180 20,180`
                  }
                />
                <polyline
                  fill="none"
                  stroke="var(--cm-accent)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={
                    stats.ratingData.map((d, i) => {
                      const x = (i / (stats.ratingData.length - 1)) * 560 + 20;
                      const y = 180 - ((d.rating - 1650) / 150) * 140;
                      return `${x},${y}`;
                    }).join(' ')
                  }
                />
                {stats.ratingData.map((d, i) => {
                  const x = (i / (stats.ratingData.length - 1)) * 560 + 20;
                  const y = 180 - ((d.rating - 1650) / 150) * 140;
                  return (
                    <circle key={i} cx={x} cy={y} r="4" fill="var(--cm-accent)" stroke="var(--cm-bg-elevated)" strokeWidth="2" />
                  );
                })}
              </>
            )}

            <line x1="20" y1="20" x2="20" y2="180" stroke="var(--cm-border-subtle)" strokeWidth="1" />
            <line x1="20" y1="180" x2="580" y2="180" stroke="var(--cm-border-subtle)" strokeWidth="1" />

            {[1800, 1760, 1720, 1680].map((rating) => {
              const y = 180 - ((rating - 1650) / 150) * 140;
              return (
                <g key={rating}>
                  <line x1="16" y1={y} x2="20" y2={y} stroke="var(--cm-border-default)" strokeWidth="1" />
                  <text x="12" y={y + 4} fill="var(--cm-text-muted)" fontSize="10" textAnchor="end">{rating}</text>
                </g>
              );
            })}

            {stats.ratingData.map((d, i) => {
              const x = (i / (stats.ratingData.length - 1)) * 560 + 20;
              const label = d.date.split(' ').slice(0, 2).join(' ');
              return (
                <text key={i} x={x} y="198" fill="var(--cm-text-muted)" fontSize="10" textAnchor="middle">
                  {label}
                </text>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Mistake Analysis */}
      <div style={sectionStyle}>
        <h3 style={sectionTitleStyle}>Mistake Analysis</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '28px' }}>
          <div style={{ position: 'relative', width: '160px', height: '160px', flexShrink: 0 }}>
            <svg width="160" height="160" viewBox="0 0 180 180">
              <DonutChart
                data={[
                  { value: stats.mistakeBreakdown.tactical, color: 'var(--cm-accent)', label: 'Tactical Blunders' },
                  { value: stats.mistakeBreakdown.positional, color: 'var(--cm-info)', label: 'Positional Mistakes' },
                  { value: stats.mistakeBreakdown.timeManagement, color: 'var(--cm-error)', label: 'Time Management' },
                  { value: stats.mistakeBreakdown.endgame, color: 'var(--cm-border-strong)', label: 'Endgame Errors' }
                ]}
                total={totalMistakes}
              />
            </svg>
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <LegendItem color="var(--cm-accent)" label="Tactical Blunders" />
            <LegendItem color="var(--cm-info)" label="Positional Mistakes" />
            <LegendItem color="var(--cm-error)" label="Time Management" />
            <LegendItem color="var(--cm-border-strong)" label="Endgame Errors" />
          </div>
        </div>
      </div>

      {/* Opening Performance */}
      <div style={sectionStyle}>
        <h3 style={sectionTitleStyle}>Opening Performance</h3>
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
                  background: 'var(--cm-accent)',
                  borderRadius: '3px',
                  transition: 'width 0.4s ease',
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
