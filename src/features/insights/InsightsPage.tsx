import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Target, BookOpen, Layers, Timer, Crown, TrendingUp } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Card, Badge, Chip, Avatar, Tabs, TabPanel, ProgressBar, Button, Skeleton, EmptyState, ErrorState } from '../../components/ui/iv';
import { ScoreRing } from '../../components/charts/ScoreRing';
import { LineChart } from '../../components/charts/LineChart';
import { useInsights } from './useInsights';
import './insights.css';

const AREA_ICON: Record<string, LucideIcon> = {
  tactics: Target, openings: BookOpen, opening: BookOpen, middlegame: Layers,
  timemgmt: Timer, endgame: Crown, positional: Layers, conversion: TrendingUp,
};

type InsightsTab = 'play' | 'progress';
const TABS = [
  { value: 'play' as const, label: 'Your Play' },
  { value: 'progress' as const, label: 'Your Progress' },
];

/**
 * Insights — a personal performance dashboard (structure modelled on the Wispr
 * Flow "Insights" screen; content adapted to ChessMate). Composed entirely from
 * existing Ivory primitives. All numbers come from `useInsights`, which derives
 * them from the same sources the rest of the app renders (games library,
 * analysis results, dashboard streak/rating, Improve skill profile) — so this
 * page always agrees with the other screens.
 */
export function InsightsPage() {
  const { vm, status } = useInsights();
  const navigate = useNavigate();
  const [tab, setTab] = useState<InsightsTab>('play');
  const h1Ref = useRef<HTMLHeadingElement>(null);
  useEffect(() => { h1Ref.current?.focus(); }, []);

  return (
    <div className="ins iv-page-enter">
      <header className="ins-head">
        <div className="ins-head__text">
          <h1 ref={h1Ref} tabIndex={-1} className="iv-h1">Insights</h1>
          {vm && <p className="ins-status">{vm.status}</p>}
        </div>
      </header>

      {status === 'loading' && (
        <div className="ins-grid" aria-label="Loading insights">
          {[0, 1, 2].map((i) => (
            <Card key={i} className={`ins-card ${i === 2 ? 'ins-card--wide' : ''}`}>
              <Skeleton width={120} height={36} /><div style={{ height: 8 }} /><Skeleton width="60%" /><div style={{ height: 16 }} /><Skeleton height={56} />
            </Card>
          ))}
        </div>
      )}

      {status === 'empty' && (
        <Card className="ins-card">
          <EmptyState
            icon={<span style={{ fontSize: 26 }} aria-hidden>♟</span>}
            title="Analyze a game to unlock your insights"
            body="Import a game and run analysis — accuracy, strengths, streaks and progression all build from your own games."
            action={<Button onClick={() => navigate('/games/import')}>Import games</Button>}
          />
        </Card>
      )}

      {status === 'failed' && (
        <ErrorState
          icon={<span style={{ fontSize: 26 }} aria-hidden>♟</span>}
          title="We couldn’t load your insights"
          message="Something went wrong reading your games and analysis. Try again in a moment."
          onRetry={() => window.location.reload()}
          retryLabel="Reload"
        />
      )}

      {status === 'ready' && vm && (
        <>
          <Tabs ariaLabel="Insights views" value={tab} onChange={setTab} tabs={TABS} />

          {/* ── Your Play ── */}
          <TabPanel active={tab === 'play'}>
            <div className="ins-grid">
              {/* Accuracy gauge — same number the Analysis screen reports. */}
              <Card className="ins-card ins-gauge">
                <div className="iv-label ins-metric__label">Avg accuracy</div>
                <ScoreRing value={vm.accuracy} size={132} ariaLabel={`Average accuracy ${vm.accuracy} of 100`} />
                {vm.accuracyEdge !== 0 && (
                  <Badge impact="low">{vm.accuracyEdge > 0 ? `+${vm.accuracyEdge}` : vm.accuracyEdge} vs opponents</Badge>
                )}
              </Card>

              {/* Moves analyzed + breakdown (from the analysis results). */}
              <Card className="ins-card">
                <div className="ins-metric__value">{vm.movesAnalyzed.toLocaleString()}</div>
                <div className="iv-label ins-metric__label">Moves analyzed</div>
                <div className="ins-divider" />
                <p className="ins-break"><span className="ins-break__n">{vm.mistakesFound}</span> mistakes found</p>
                <p className="ins-break"><span className="ins-break__n">{vm.brilliantMoves}</span> brilliant moves</p>
              </Card>

              {/* Games analyzed — the same count the Games library shows. */}
              <Card className="ins-card ins-card--wide">
                <div className="ins-metric__head">
                  <div className="ins-metric__value">{vm.gamesAnalyzed}</div>
                  {vm.analyzedThisMonth > 0 && (
                    <span className="iv-metric__delta iv-metric__delta--up">
                      <span aria-hidden>▲</span> {vm.analyzedThisMonth} this month
                    </span>
                  )}
                </div>
                <div className="iv-label ins-metric__label">Games analyzed</div>
                <div className="ins-divider" />
                <p className="ins-note">{vm.gamesAnalyzed} of {vm.gamesTotal} imported games analyzed.</p>
                <div className="ins-split" role="img" aria-label={`Color split: White ${vm.whitePct}%, Black ${100 - vm.whitePct}%`}>
                  <span className="ins-split__seg ins-split__seg--w" style={{ width: `${vm.whitePct}%` }}>♙ White</span>
                  <span className="ins-split__seg ins-split__seg--b" style={{ width: `${100 - vm.whitePct}%` }}>♟ Black</span>
                </div>
              </Card>

              {/* Strength breakdown — the Improve screen's skill profile. */}
              <Card className="ins-card ins-strength">
                <div className="ins-panel-head">
                  <h2 className="iv-h3">Strength breakdown</h2>
                  {vm.strengths[0] && <span className="iv-label">Top area · {vm.strengths[0].label}</span>}
                </div>
                {vm.strengths[0] && (
                  <div className="ins-strength__primary">
                    <ProgressBar value={vm.strengths[0].pct} max={100} ariaLabel={`${vm.strengths[0].label} strength ${vm.strengths[0].pct} of 100`} />
                    <div className="ins-strength__primary-meta">
                      <span className="ins-strength__pct-lg">{vm.strengths[0].pct}%</span>
                      <span className="ins-strength__note">{vm.strengths[0].note}</span>
                    </div>
                  </div>
                )}
                <ul className="ins-strength__list">
                  {vm.strengths.slice(1).map((s) => {
                    const Icon = AREA_ICON[s.key] ?? Target;
                    return (
                      <li className="ins-strength__row" key={s.key}>
                        <span className="ins-strength__icon" aria-hidden><Icon size={16} /></span>
                        <Chip>{s.pct}%</Chip>
                        <span className="ins-strength__label">{s.label}</span>
                        <span className="ins-strength__note">{s.note}</span>
                      </li>
                    );
                  })}
                </ul>
              </Card>

              {/* Study streak — computed from actual activity days; the header,
                  this title and the trailing day strip agree by construction.
                  One marker per day (last 14), nothing more. */}
              <Card className="ins-card ins-streak">
                <div className="ins-panel-head">
                  <h2 className="iv-h3">{vm.streak.current} day streak</h2>
                  <span className="iv-label">Longest · {vm.streak.longest} days</span>
                </div>
                <div
                  className="ins-streak__days"
                  role="img"
                  aria-label={`Last 14 days — ${vm.streak.days.filter((d) => d.active).length} active days, current streak ${vm.streak.current}, longest ${vm.streak.longest}`}
                >
                  {vm.streak.days.map((d) => (
                    <span
                      key={d.key}
                      className={`ins-day${d.active ? ' ins-day--active' : ''}${d.isToday ? ' ins-day--today' : ''}`}
                    />
                  ))}
                </div>
                <p className="ins-note">Last 14 days — a day counts when you add or analyze a game.</p>
              </Card>
            </div>
          </TabPanel>

          {/* ── Your Progress ── */}
          <TabPanel active={tab === 'progress'}>
            <div className="ins-grid ins-grid--progress">
              {/* Progression over time (rating in the demo; avg accuracy for real data). */}
              <Card className="ins-card ins-chart">
                <div className="ins-panel-head">
                  <h2 className="iv-h3">Strength progression</h2>
                  <span className="iv-label">
                    {vm.seriesLabel} · {vm.seriesNow}
                    {vm.seriesDelta !== 0 && (
                      <span className={vm.seriesDelta > 0 ? 'ins-up' : 'ins-down'}>
                        {' '}{vm.seriesDelta > 0 ? '▲' : '▼'} {Math.abs(vm.seriesDelta)}
                      </span>
                    )}
                  </span>
                </div>
                <LineChart data={vm.series} height={220} ariaLabel={`${vm.seriesLabel} over ${vm.series.length} months, now ${vm.seriesNow}`} />
              </Card>

              {/* Who you play — aggregated from the same games the library lists. */}
              <Card className="ins-card">
                <div className="ins-panel-head">
                  <h2 className="iv-h3">Recent opponents</h2>
                  <span className="iv-label">{vm.opponents.length} players</span>
                </div>
                <ul className="ins-opps">
                  {vm.opponents.map((o) => (
                    <li className="ins-opp" key={o.name}>
                      <Avatar name={o.name} size={32} />
                      <span className="ins-opp__meta">
                        <span className="ins-opp__name">{o.name}</span>
                        <span className="ins-opp__sub">{o.games} {o.games === 1 ? 'game' : 'games'} · last: {o.last}</span>
                      </span>
                      <span className={`ins-opp__record ins-opp__record--${o.last}`}>{o.record}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
          </TabPanel>
        </>
      )}
    </div>
  );
}
