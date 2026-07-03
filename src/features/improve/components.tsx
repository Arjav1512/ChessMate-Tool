import { useState } from 'react';
import { Badge, Button, Card, MetricCard, ProgressBar, SegmentedControl } from '../../components/ui/iv';
import { RadarChart } from '../../components/charts/RadarChart';
import type {
  ImproveCategory, MilestoneVM, SessionType, SkillAxisVM, StudyItemVM,
  WeaknessCategoryVM, WeeklyFocusVM,
} from '../../lib/improve/types';

const SESSION_ICON: Record<SessionType, string> = { drill: '◎', replay: '↻', tactics: '⚡', coach_review: '✦' };
const SEVERITY_IMPACT = { high: 'high', medium: 'medium', low: 'low' } as const;

// ── Weekly Focus (hero — the one Primary) ──────────────────────────────────
export function WeeklyFocusCard({ focus, onStart }: { focus: WeeklyFocusVM; onStart: () => void }) {
  return (
    <Card variant="hero" className="iv-imp-order-focus">
      <div className="iv-imp-focus__label iv-label"><span aria-hidden>✦</span> Weekly focus · week {focus.week}</div>
      <h2 className="iv-imp-focus__title iv-h2">{focus.title}</h2>
      <p className="iv-imp-focus__rationale">{focus.rationale}</p>
      <div className="iv-imp-focus__progress">
        <div className="iv-imp-focus__progresslabel">
          <span>Sessions this week</span><span>{focus.sessionsDone}/{focus.sessionsTotal}</span>
        </div>
        <ProgressBar value={focus.sessionsDone} max={focus.sessionsTotal} ariaLabel={`Sessions ${focus.sessionsDone} of ${focus.sessionsTotal}`} />
      </div>
      <div className="iv-imp-focus__metrics">
        <MetricCard label="Sessions" value={`${focus.sessionsDone}/${focus.sessionsTotal}`} />
        <MetricCard label="Phase acc" value={`+${focus.phaseDeltaPct}%`} delta={{ value: `${focus.phaseDeltaPct}%`, direction: 'up' }} />
      </div>
      <div className="iv-imp-focus__cta">
        <Button onClick={onStart}>Continue · session {focus.nextSessionN} →</Button>
      </div>
    </Card>
  );
}

// ── Skill profile (radar) ──────────────────────────────────────────────────
export function SkillProfileCard({ skills }: { skills: SkillAxisVM[] }) {
  return (
    <Card className="iv-imp-order-skill">
      <div className="iv-imp-head"><span className="iv-label iv-imp-head__title">Skill profile</span></div>
      <RadarChart data={skills} />
    </Card>
  );
}

// ── Weakness profile (filter + 2×2 category cards) ─────────────────────────
export function WeaknessProfile({
  categories, focusCategory, onWeakness,
}: {
  categories: WeaknessCategoryVM[];
  focusCategory: ImproveCategory;
  onWeakness: (key: string) => void;
}) {
  const [filter, setFilter] = useState<ImproveCategory | 'all'>('all');
  const options = [{ value: 'all' as const, label: 'All' }, ...categories.map((c) => ({ value: c.category, label: c.label }))];
  const shown = filter === 'all' ? categories : categories.filter((c) => c.category === filter);

  return (
    <Card className="iv-imp-order-weak">
      <div className="iv-imp-head">
        <span className="iv-label iv-imp-head__title">Weakness profile</span>
        <SegmentedControl ariaLabel="Weakness category filter" value={filter} onChange={setFilter} options={options} />
      </div>
      <div className="iv-imp-weak__grid">
        {shown.map((cat) => (
          <Card key={cat.category} variant="category"
            accentColor={cat.category === focusCategory ? 'var(--error)' : 'var(--border)'}
            className={`iv-imp-cat ${cat.category === focusCategory ? 'iv-imp-cat--weakest' : ''}`}>
            <div className="iv-imp-cat__head">
              <span className="iv-imp-cat__icon" aria-hidden>{cat.icon}</span>
              <span className="iv-imp-cat__name">{cat.label}</span>
              <span className="iv-imp-cat__acc">{cat.phaseAccuracy}% acc</span>
              <Badge impact={SEVERITY_IMPACT[cat.severity]}>{cat.severity}</Badge>
            </div>
            {cat.weaknesses.slice(0, 3).map((w) => (
              <button key={w.key} className="iv-imp-sub" onClick={() => onWeakness(w.key)}
                aria-label={`${w.name}, ${w.severity} severity. ${w.recommendation}`}>
                <span className="iv-imp-sub__body">
                  <span className="iv-imp-sub__name">{w.name}</span>
                  <span className="iv-imp-sub__rec">{w.recommendation} →</span>
                </span>
                <Badge impact={SEVERITY_IMPACT[w.severity]}>{w.severity}</Badge>
              </button>
            ))}
          </Card>
        ))}
      </div>
    </Card>
  );
}

// ── Study plan ──────────────────────────────────────────────────────────────
export function StudyPlanCard({ plan, onStart }: { plan: StudyItemVM[]; onStart: (item: StudyItemVM) => void }) {
  return (
    <Card className="iv-imp-order-plan">
      <div className="iv-imp-head"><span className="iv-label iv-imp-head__title">Recommended study plan</span></div>
      <div className="iv-imp-plan">
        {plan.map((item) => (
          <button key={item.id}
            className={`iv-imp-item ${item.status === 'next' ? 'iv-imp-item--next' : ''} ${item.status === 'done' ? 'iv-imp-item--done' : ''}`}
            onClick={() => onStart(item)}
            aria-label={`${item.title}, ${item.estMinutes} minutes${item.status === 'next' ? ', next up' : ''}${item.source === 'send-to-improve' ? ', imported from analysis' : ''}`}>
            <span className="iv-imp-item__icon" aria-hidden>{item.status === 'done' ? '✓' : SESSION_ICON[item.type]}</span>
            <span className="iv-imp-item__body">
              <span className="iv-imp-item__title">
                {item.status === 'next' && <span className="iv-imp-item__tag iv-imp-item__tag--next">Next</span>}
                {item.source === 'send-to-improve' && <span className="iv-imp-item__tag iv-imp-item__tag--import">From analysis</span>}
                {item.title}
              </span>
              <span className="iv-imp-item__desc">{item.description}</span>
            </span>
            <span className="iv-imp-item__time">~{item.estMinutes}m</span>
          </button>
        ))}
      </div>
    </Card>
  );
}

// ── Milestones (chess study goals) ─────────────────────────────────────────
export function MilestonesCard({ milestones }: { milestones: MilestoneVM[] }) {
  return (
    <Card className="iv-imp-order-ms">
      <div className="iv-imp-head"><span className="iv-label iv-imp-head__title">Study goals</span></div>
      <div className="iv-imp-ms">
        {milestones.map((m) => (
          <div key={m.id} className={`iv-imp-ms__node iv-imp-ms__node--${m.status}`}>
            <span className={`iv-imp-ms__dot iv-imp-ms__dot--${m.status}`} aria-hidden>{m.status === 'achieved' ? '✓' : ''}</span>
            <span className="iv-imp-ms__body">
              <span className="iv-imp-ms__label">{m.label}</span>
              <span className="iv-imp-ms__meta">{m.current}{m.unit ? ` / ${m.target} ${m.unit}` : ` → ${m.target}`}</span>
              {m.status === 'in_progress' && (
                <span className="iv-imp-ms__bar"><ProgressBar value={m.progressPct} max={100} ariaLabel={`${m.label}: ${m.progressPct}%`} /></span>
              )}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}
