import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button, Card, MetricCard, ProgressBar, Skeleton, ErrorState, SegmentedControl,
} from '../../components/ui/iv';
import { ScoreRing } from '../../components/charts/ScoreRing';
import { LineChart } from '../../components/charts/LineChart';
import {
  useImprovementScore, useRatingHistory, useTopWeaknesses, useWeeklyFocus,
  useRecentGames, useCoachSummary, useRoadmap,
} from './hooks';
import type { RatingRange, WeaknessTrend } from './types';

/** Shared loading/error wrapper so every data-backed card ships all states. */
function CardState({
  isLoading, isError, refetch, skeleton, children,
}: {
  isLoading: boolean; isError: boolean; refetch: () => void; skeleton: React.ReactNode; children: React.ReactNode;
}) {
  if (isLoading) return <>{skeleton}</>;
  if (isError) return <ErrorState message="Couldn't load this section." onRetry={refetch} />;
  return <>{children}</>;
}

const TREND_GLYPH: Record<WeaknessTrend, string> = { improving: '▲', worsening: '▼', steady: '→' };

// ─── Improvement Score (hero: explanatory + actionable) ─────────────────────
export function ImprovementScoreCard() {
  const q = useImprovementScore();
  const navigate = useNavigate();
  return (
    <Card className="dash-order-score" style={{ height: '100%' }}>
      <div className="dash-card__head">
        <div className="dash-card__titles">
          <span className="iv-label dash-card__title">Improvement score</span>
          <span className="dash-card__q">How am I improving?</span>
        </div>
      </div>
      <CardState isLoading={q.isLoading} isError={q.isError} refetch={q.refetch}
        skeleton={<div className="dash-score"><div className="dash-score__top"><Skeleton width={108} height={108} radius="50%" /><Skeleton width={150} height={64} /></div><Skeleton height={56} /><Skeleton height={44} /></div>}>
        {q.data && (() => {
          const scoreUp = q.data.deltaPts >= 0;
          const dir = scoreUp ? 'up' : 'down';
          return (
          <div className="dash-score">
            <div className="dash-score__top">
              <ScoreRing value={q.data.score} ariaLabel={`Improvement score ${q.data.score} of 100, ${dir} ${Math.abs(q.data.deltaPts)} points in 30 days`} />
              <div>
                <h3 className="dash-score__verdict iv-h3">
                  {q.data.verdict}{' '}
                  <span style={{ color: scoreUp ? 'var(--success)' : 'var(--error)', fontFamily: 'var(--font-mono)', fontSize: 15 }}>
                    <span aria-hidden>{scoreUp ? '▲' : '▼'}</span> {Math.abs(q.data.deltaPts)}
                  </span>
                </h3>
                <div className="dash-score__drivers">
                  <span className="dash-score__driver dash-score__driver--up"><span aria-hidden>▲</span><span>{q.data.drivers.up}</span></span>
                  <span className="dash-score__driver dash-score__driver--down"><span aria-hidden>▼</span><span>{q.data.drivers.down}</span></span>
                </div>
              </div>
            </div>
            <div className="dash-score__metrics">
              <MetricCard label="Last game" value={`${q.data.lastGameAccuracy}%`} sublabel="accuracy" />
              <MetricCard label="Streak" value={`${q.data.streakDays}d`} sublabel="analyzing" />
            </div>
            <button className="dash-score__next" onClick={() => navigate('/improve')}>
              <span aria-hidden style={{ color: 'var(--accent)' }}>→</span>
              <span>Fastest way to raise it: <strong>{q.data.nextStep}</strong></span>
            </button>
          </div>
          );
        })()}
      </CardState>
    </Card>
  );
}

// ─── Rating trend ───────────────────────────────────────────────────────────
export function RatingTrendCard() {
  const [range, setRange] = useState<RatingRange>('90d');
  const q = useRatingHistory(range);
  const up = (q.data?.deltaForRange ?? 0) >= 0;
  return (
    <Card className="dash-order-rating" style={{ height: '100%' }}>
      <CardState isLoading={q.isLoading} isError={q.isError} refetch={q.refetch}
        skeleton={<><Skeleton width={180} height={28} /><div style={{ height: 12 }} /><Skeleton height={160} /></>}>
        {q.data && (
          <>
            <div className="dash-rating__head">
              <div className="dash-rating__nums">
                <span className="dash-rating__value">{q.data.current}</span>
                <span className={`dash-rating__delta ${up ? 'dash-rating__delta--up' : 'dash-rating__delta--down'}`}>
                  <span aria-hidden>{up ? '▲' : '▼'}</span> {Math.abs(q.data.deltaForRange)}
                </span>
                <span className="dash-rating__peak">peak {q.data.peak}</span>
              </div>
              <SegmentedControl ariaLabel="Rating range" value={range} onChange={setRange}
                options={[{ value: '30d', label: '30d' }, { value: '90d', label: '90d' }, { value: '1y', label: '1y' }]} />
            </div>
            <LineChart data={q.data.series} subtle height={120} ariaLabel={`Rating over ${range}: ${q.data.series[0]?.value ?? q.data.current} to ${q.data.current}, ${up ? 'up' : 'down'} ${Math.abs(q.data.deltaForRange)}`} />
          </>
        )}
      </CardState>
    </Card>
  );
}

// ─── Biggest weaknesses ─────────────────────────────────────────────────────
export function BiggestWeaknessesCard() {
  const q = useTopWeaknesses();
  const navigate = useNavigate();
  return (
    <Card className="dash-order-weak" style={{ height: '100%' }}>
      <div className="dash-card__head">
        <div className="dash-card__titles">
          <span className="iv-label dash-card__title">Biggest weaknesses</span>
          <span className="dash-card__q">What’s holding me back?</span>
        </div>
        <button className="dash-link" onClick={() => navigate('/weaknesses')}>View all →</button>
      </div>
      <CardState isLoading={q.isLoading} isError={q.isError} refetch={q.refetch}
        skeleton={<>{[0, 1, 2].map((i) => <div key={i} style={{ padding: '16px 0' }}><Skeleton height={56} /></div>)}</>}>
        {q.data?.map((w) => (
          <button key={w.key} className="dash-weakness"
            onClick={() => navigate('/improve')} aria-label={`${w.name}. ${w.why} ${w.action}`}>
            <span className="dash-weakness__top">
              <span className="dash-weakness__icon" style={{ ['--mq-color' as string]: w.impact === 'high' ? 'var(--error)' : w.impact === 'medium' ? 'var(--warning)' : 'var(--text-mid)' }}>{w.icon}</span>
              <span className="dash-weakness__name">{w.name}</span>
              <span className="dash-weakness__pct">{w.frequencyPct}%</span>
              <span className={`dash-weakness__trend dash-weakness__trend--${w.trend}`}><span aria-hidden>{TREND_GLYPH[w.trend]}</span> {w.trend}</span>
            </span>
            <p className="dash-weakness__why">{w.why}</p>
            <span className="dash-weakness__foot">
              <ProgressBar value={w.frequencyPct} max={100} ariaLabel={`${w.name} occurs in ${w.frequencyPct}% of games`} />
              <span className="dash-weakness__action">{w.action} →</span>
            </span>
          </button>
        ))}
      </CardState>
    </Card>
  );
}

// ─── Weekly focus (hero) ────────────────────────────────────────────────────
export function FocusCard() {
  const q = useWeeklyFocus();
  const navigate = useNavigate();
  return (
    <Card variant="hero" className="dash-order-focus" style={{ height: '100%' }}>
      <CardState isLoading={q.isLoading} isError={q.isError} refetch={q.refetch}
        skeleton={<><Skeleton width={140} height={14} /><div style={{ height: 10 }} /><Skeleton width="80%" height={24} /><div style={{ height: 10 }} /><Skeleton height={48} /></>}>
        {q.data && (
          <>
            <div className="dash-focus__label iv-label"><span aria-hidden>✦</span> Weekly focus · week {q.data.week}</div>
            <h3 className="dash-focus__title iv-h3">{q.data.title}</h3>
            <p className="dash-focus__rationale">{q.data.rationale}</p>
            <div className="dash-focus__metrics">
              <MetricCard label="Sessions" value={`${q.data.sessionsDone}/${q.data.sessionsTotal}`} />
              <MetricCard label="Phase acc" value={`+${q.data.phaseDeltaPct}%`} delta={{ value: q.data.phaseDeltaPct, direction: 'up' }} />
            </div>
            <div className="dash-focus__cta">
              {/* Dashboard summary action: secondary so the page has one primary
                  ("Continue improving" in the header). The real focus primary
                  lives on Improve. */}
              <Button variant="secondary" onClick={() => navigate('/improve')}>Start session →</Button>
              <span className="dash-focus__time">~{q.data.estMinutes} min</span>
            </div>
          </>
        )}
      </CardState>
    </Card>
  );
}

// ─── Recently analyzed ──────────────────────────────────────────────────────
export function RecentGamesCard() {
  const q = useRecentGames();
  const navigate = useNavigate();
  return (
    <Card className="dash-order-recent" style={{ height: '100%' }}>
      <div className="dash-card__head">
        <span className="iv-label dash-card__title">Recently analyzed</span>
        <button className="dash-link" onClick={() => navigate('/games')}>All games →</button>
      </div>
      <CardState isLoading={q.isLoading} isError={q.isError} refetch={q.refetch}
        skeleton={<>{[0, 1, 2, 3, 4].map((i) => <div key={i} style={{ padding: '10px 0' }}><Skeleton height={20} /></div>)}</>}>
        {q.data?.map((g) => (
          <button key={g.id} className="dash-game" style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer' }}
            onClick={() => navigate(`/analysis/${g.id}`)}>
            <span className={`dash-game__dot dash-game__dot--${g.result}`} aria-hidden />
            <span className="dash-game__main">
              <span className="dash-game__vs">{g.result === 'win' ? 'Won' : g.result === 'loss' ? 'Lost' : 'Drew'} vs {g.opponent} <span style={{ color: 'var(--text-faint)' }}>({g.color === 'w' ? 'White' : 'Black'})</span></span>
              <span className="dash-game__opening"><span className="dash-game__eco">{g.eco}</span> {g.opening}{g.improvementTag ? <span className="dash-game__tag"> · {g.improvementTag}</span> : ''}</span>
            </span>
            <span className="dash-game__acc">{g.accuracy}%</span>
            <span className="dash-game__time">{g.relativeTime}</span>
          </button>
        ))}
      </CardState>
    </Card>
  );
}

// ─── Coach summary (subordinate) ────────────────────────────────────────────
export function CoachSummaryCard() {
  const q = useCoachSummary();
  const navigate = useNavigate();
  return (
    <Card>
      <CardState isLoading={q.isLoading} isError={q.isError} refetch={q.refetch}
        skeleton={<Skeleton height={72} />}>
        {q.data && (
          <>
            <div className="dash-coach__head">
              <span className="dash-coach__mark" aria-hidden>✦</span>
              <span className="dash-coach__label iv-label">Coach · summary</span>
            </div>
            <p className="dash-coach__text">{q.data.text}</p>
            <div className="dash-coach__ctx">{q.data.context}</div>
            <div style={{ marginTop: 'var(--space-3)' }}>
              <Button variant="ghost" size="sm" onClick={() => navigate('/coach')}>Ask coach →</Button>
            </div>
          </>
        )}
      </CardState>
    </Card>
  );
}

// ─── Improvement roadmap ────────────────────────────────────────────────────
export function RoadmapTimeline() {
  const q = useRoadmap();
  return (
    <Card variant="hero">
      <div className="dash-card__head">
        <div className="dash-card__titles">
          <span className="iv-label dash-card__title">Improvement roadmap</span>
          <span className="dash-card__q">What outcome can I expect?</span>
        </div>
      </div>
      <CardState isLoading={q.isLoading} isError={q.isError} refetch={q.refetch}
        skeleton={<Skeleton height={120} />}>
        <div className="dash-roadmap">
          {q.data?.map((n, i) => (
            <div key={i} className={`dash-roadmap__node dash-roadmap__node--${n.status}`}>
              <span className={`dash-roadmap__dot dash-roadmap__dot--${n.status}`} aria-hidden>{n.status === 'achieved' ? '✓' : ''}</span>
              <span>
                <span className="dash-roadmap__label">{n.label}</span>
                {n.detail && <span className="dash-roadmap__detail">{n.detail}</span>}
                {n.status === 'in_progress' && n.progressPct != null && (
                  <span style={{ display: 'block', marginTop: 8, maxWidth: 220 }}><ProgressBar value={n.progressPct} max={100} glow ariaLabel={`${n.label}: ${n.progressPct}%`} /></span>
                )}
              </span>
            </div>
          ))}
        </div>
      </CardState>
    </Card>
  );
}
