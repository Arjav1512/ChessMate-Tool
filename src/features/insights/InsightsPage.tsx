import { useEffect, useRef, useState } from 'react';
import { Target, BookOpen, Layers, Timer, Crown, TrendingUp } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Card, Badge, Chip, Avatar, Tabs, TabPanel, ProgressBar } from '../../components/ui/iv';
import { ScoreRing } from '../../components/charts/ScoreRing';
import { LineChart } from '../../components/charts/LineChart';
import { sampleInsights } from './sampleInsights';
import './insights.css';

const AREA_ICON: Record<string, LucideIcon> = {
  tactics: Target, openings: BookOpen, middlegame: Layers,
  timemgmt: Timer, endgame: Crown, conversion: TrendingUp,
};

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

type InsightsTab = 'play' | 'progress';
const TABS = [
  { value: 'play' as const, label: 'Your Play' },
  { value: 'progress' as const, label: 'Your Progress' },
];

/**
 * Insights — a personal performance dashboard (structure modelled on the Wispr
 * Flow "Insights" screen; content adapted to ChessMate). Composed entirely from
 * existing Ivory primitives (Card / Badge / Chip / Avatar / ScoreRing /
 * LineChart / ProgressBar / Tabs). Ships on typed sample data (sampleInsights),
 * shaped like the future API so the swap to live data is adapter-only.
 */
export function InsightsPage() {
  const d = sampleInsights;
  const [tab, setTab] = useState<InsightsTab>('play');
  const h1Ref = useRef<HTMLHeadingElement>(null);
  useEffect(() => { h1Ref.current?.focus(); }, []);

  return (
    <div className="ins iv-page-enter">
      <header className="ins-head">
        <div className="ins-head__text">
          <h1 ref={h1Ref} tabIndex={-1} className="iv-h1">Insights</h1>
          <p className="ins-status">{d.status}</p>
        </div>
      </header>

      <Tabs ariaLabel="Insights views" value={tab} onChange={setTab} tabs={TABS} />

      {/* ── Your Play ── */}
      <TabPanel active={tab === 'play'}>
        <div className="ins-grid">
          {/* Accuracy gauge — the ring carries the number; no duplicate big value. */}
          <Card className="ins-card ins-gauge">
            <div className="iv-label ins-metric__label">Avg accuracy</div>
            <ScoreRing value={d.accuracy} size={132} ariaLabel={`Average accuracy ${d.accuracy} of 100`} />
            <Badge impact="low">Top {d.percentile}%</Badge>
          </Card>

          {/* Moves analyzed + breakdown */}
          <Card className="ins-card">
            <div className="ins-metric__value">{d.movesAnalyzed.toLocaleString()}</div>
            <div className="iv-label ins-metric__label">Moves analyzed</div>
            <div className="ins-divider" />
            <p className="ins-break"><span className="ins-break__n">{d.mistakesFound}</span> mistakes found</p>
            <p className="ins-break"><span className="ins-break__n">{d.brilliantMoves}</span> brilliant moves</p>
          </Card>

          {/* Games analyzed + trend + color split */}
          <Card className="ins-card ins-card--wide">
            <div className="ins-metric__head">
              <div className="ins-metric__value">{d.gamesAnalyzed}</div>
              {/* Positive trend = the existing green metric-delta pattern (Badge
                  impact levels are severity colors — "high" reads as an error). */}
              <span className="iv-metric__delta iv-metric__delta--up">
                <span aria-hidden>▲</span> {d.gamesTrendPct}% this month
              </span>
            </div>
            <div className="iv-label ins-metric__label">Games analyzed</div>
            <div className="ins-divider" />
            <p className="ins-note">That’s about {d.studyHours} hours of study.</p>
            <div className="ins-split" role="img" aria-label={`Color split: White ${d.whitePct}%, Black ${100 - d.whitePct}%`}>
              <span className="ins-split__seg ins-split__seg--w" style={{ width: `${d.whitePct}%` }}>♙ White</span>
              <span className="ins-split__seg ins-split__seg--b" style={{ width: `${100 - d.whitePct}%` }}>♟ Black</span>
            </div>
          </Card>

          {/* Strength breakdown */}
          <Card className="ins-card ins-strength">
            <div className="ins-panel-head">
              <h2 className="iv-h3">Strength breakdown</h2>
              <span className="iv-label">Top area · {d.topArea}</span>
            </div>
            <div className="ins-strength__primary">
              <ProgressBar value={d.strengths[0].pct} max={100} ariaLabel={`${d.strengths[0].label} strength ${d.strengths[0].pct} of 100`} />
              <div className="ins-strength__primary-meta">
                <span className="ins-strength__pct-lg">{d.strengths[0].pct}%</span>
                <span className="ins-strength__note">{d.strengths[0].note}</span>
              </div>
            </div>
            <ul className="ins-strength__list">
              {d.strengths.slice(1).map((s) => {
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

          {/* Study streak heatmap */}
          <Card className="ins-card ins-streak">
            <div className="ins-panel-head">
              <h2 className="iv-h3">{d.currentStreak} day streak</h2>
              <span className="iv-label">Longest streak · {d.longestStreak} days</span>
            </div>
            <div className="ins-heatmap" role="img" aria-label={`Study activity over recent weeks — current streak ${d.currentStreak} days, longest ${d.longestStreak} days`}>
              <div className="ins-heatmap__months" aria-hidden>
                {d.heatmapMonths.map((m) => <span key={m}>{m}</span>)}
              </div>
              <div className="ins-heatmap__grid" aria-hidden>
                {d.heatmap.map((row, di) => (
                  <div className="ins-heatmap__row" key={di}>
                    <span className="ins-heatmap__day">{DAYS[di]}</span>
                    {row.map((v, wi) => <span key={wi} className={`ins-cell ins-cell--l${v}`} />)}
                  </div>
                ))}
              </div>
            </div>
            <div className="ins-legend" aria-hidden>
              <span className="ins-legend__label">Less</span>
              {[0, 1, 2, 3, 4].map((v) => <span key={v} className={`ins-cell ins-cell--l${v}`} />)}
              <span className="ins-legend__label">More</span>
            </div>
          </Card>
        </div>
      </TabPanel>

      {/* ── Your Progress ── */}
      <TabPanel active={tab === 'progress'}>
        <div className="ins-grid ins-grid--progress">
          {/* Strength / rating progression over time */}
          <Card className="ins-card ins-chart">
            <div className="ins-panel-head">
              <h2 className="iv-h3">Strength progression</h2>
              <span className="iv-label">Rating · {d.ratingNow} <span className="ins-up">▲ {d.ratingDelta}</span></span>
            </div>
            <LineChart data={d.ratingSeries} height={220} ariaLabel={`Rating over ${d.ratingSeries.length} months, now ${d.ratingNow}`} />
          </Card>

          {/* Who you play — recent opponents */}
          <Card className="ins-card">
            <div className="ins-panel-head">
              <h2 className="iv-h3">Recent opponents</h2>
              <span className="iv-label">{d.opponents.length} players</span>
            </div>
            <ul className="ins-opps">
              {d.opponents.map((o) => (
                <li className="ins-opp" key={o.name}>
                  <Avatar name={o.name} size={32} />
                  <span className="ins-opp__meta">
                    <span className="ins-opp__name">{o.name}</span>
                    <span className="ins-opp__sub">{o.games} games · {o.rating}</span>
                  </span>
                  <span className={`ins-opp__record ins-opp__record--${o.last}`}>{o.record}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </TabPanel>
    </div>
  );
}
