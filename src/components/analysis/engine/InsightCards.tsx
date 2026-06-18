/**
 * Insights tab content — the human interpretation layer. InsightCard renders a
 * single derived insight (why it matters + what to learn + coach CTA);
 * StudyRecommendation renders the bottom "what to practise" block.
 * Presentational only — all data comes from utils/gameInsights.
 */

import React from 'react';
import { Sparkles, AlertTriangle, Zap, Star, Repeat, MessageCircle, Eye, ListTree, GraduationCap, Target, TrendingUp } from 'lucide-react';
import type { GameInsight, StudyPlan } from '../../../utils/gameInsights';
import { Chip } from '../../ui/Chip';

const TONE: Record<GameInsight['tone'], { color: string; dim: string }> = {
  amber:   { color: 'var(--cm-warning)', dim: 'var(--cm-warning-dim)' },
  error:   { color: 'var(--cm-error)',   dim: 'var(--cm-error-dim)' },
  success: { color: 'var(--cm-success)', dim: 'var(--cm-success-dim)' },
  accent:  { color: 'var(--cm-accent-bright)', dim: 'var(--cm-accent-dim)' },
};

const ICON: Record<GameInsight['kind'], React.ReactNode> = {
  opening: <Sparkles size={15} />,
  blunder: <AlertTriangle size={15} />,
  'turning-point': <Zap size={15} />,
  'best-move': <Star size={15} />,
  pattern: <Repeat size={15} />,
};

interface InsightCardProps {
  insight: GameInsight;
  onAskCoach: () => void;
  onShowPosition?: () => void;
  onShowMoveContext?: () => void;
}

export function InsightCard({ insight, onAskCoach, onShowPosition, onShowMoveContext }: InsightCardProps) {
  const tone = TONE[insight.tone];
  const hasMove = insight.moveIndex != null;
  return (
    <div style={{ background: 'var(--cm-bg-elevated)', border: '1px solid var(--cm-border-subtle)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '9px', padding: '12px 13px 8px' }}>
        <span style={{ width: '28px', height: '28px', borderRadius: '8px', display: 'grid', placeItems: 'center', background: tone.dim, color: tone.color, flexShrink: 0 }}>
          {ICON[insight.kind]}
        </span>
        <span style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--cm-text-primary)' }}>{insight.title}</span>
        {insight.move && (
          <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-family-mono)', fontSize: '11.5px', color: 'var(--cm-text-secondary)', background: 'var(--cm-bg-surface)', padding: '3px 8px', borderRadius: '6px', flexShrink: 0 }}>
            {insight.move}
          </span>
        )}
      </div>

      <p style={{ padding: '0 13px 10px', margin: 0, fontSize: '12.8px', lineHeight: 1.55, color: 'var(--cm-text-secondary)' }}>
        {insight.why}
      </p>

      <div style={{ margin: '0 13px 12px', padding: '8px 10px', background: 'var(--cm-bg-surface)', borderRadius: '8px', borderLeft: `2px solid ${tone.color}` }}>
        <div style={{ fontSize: '9.5px', fontWeight: 700, letterSpacing: '0.6px', textTransform: 'uppercase', color: 'var(--cm-text-muted)', marginBottom: '3px' }}>
          What to learn
        </div>
        <div style={{ fontSize: '12.3px', lineHeight: 1.5, color: 'var(--cm-text-primary)' }}>{insight.learn}</div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', padding: '0 13px 13px' }}>
        <Chip onClick={onAskCoach} icon={<MessageCircle size={12} />}>Ask Coach</Chip>
        {hasMove && onShowPosition && (
          <Chip variant="ghost" onClick={onShowPosition} icon={<Eye size={12} />}>Show Position</Chip>
        )}
        {hasMove && onShowMoveContext && (
          <Chip variant="ghost" onClick={onShowMoveContext} icon={<ListTree size={12} />}>Show Move Context</Chip>
        )}
      </div>
    </div>
  );
}

// ── Study Recommendation (bottom block) ─────────────────────────────────────

interface StudyRecommendationProps {
  plan: StudyPlan;
  onAskCoach: () => void;
}

export function StudyRecommendation({ plan, onAskCoach }: StudyRecommendationProps) {
  return (
    <div style={{
      background: 'linear-gradient(140deg, var(--cm-accent-dim), var(--cm-secondary-dim))',
      border: '1px solid var(--cm-border-subtle)',
      borderRadius: 'var(--radius-lg)',
      padding: '14px 13px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '9px', marginBottom: '12px' }}>
        <span style={{ width: '28px', height: '28px', borderRadius: '8px', display: 'grid', placeItems: 'center', background: 'var(--cm-accent)', color: 'var(--cm-text-inverse)', flexShrink: 0 }}>
          <GraduationCap size={15} />
        </span>
        <div>
          <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--cm-text-primary)' }}>What to practise next</div>
          <div style={{ fontSize: '11px', color: 'var(--cm-text-muted)' }}>From this game's mistakes and strengths</div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {plan.weaknesses.map((w, i) => (
          <StudyRow key={`w${i}`} icon={<Target size={13} />} tone="var(--cm-error)" label={w.label} detail={w.detail} tag="Work on" />
        ))}
        {plan.strength && (
          <StudyRow icon={<TrendingUp size={13} />} tone="var(--cm-success)" label={plan.strength.label} detail={plan.strength.detail} tag="Strength" />
        )}
        {plan.training && (
          <StudyRow icon={<GraduationCap size={13} />} tone="var(--cm-accent-bright)" label={plan.training.label} detail={plan.training.detail} tag="Train" />
        )}
      </div>

      <button
        onClick={onAskCoach}
        style={{ marginTop: '12px', width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, color: 'var(--cm-accent-bright)', background: 'var(--cm-bg-surface)', border: '1px solid var(--cm-border-default)', borderRadius: '9px', padding: '9px', cursor: 'pointer' }}
      >
        <MessageCircle size={13} /> Build my training plan with the coach
      </button>
    </div>
  );
}

function StudyRow({ icon, tone, label, detail, tag }: { icon: React.ReactNode; tone: string; label: string; detail: string; tag: string }) {
  return (
    <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', background: 'var(--cm-bg-surface)', borderRadius: '9px', padding: '9px 10px' }}>
      <span style={{ width: '26px', height: '26px', borderRadius: '7px', display: 'grid', placeItems: 'center', background: 'var(--cm-bg-elevated)', color: tone, flexShrink: 0, marginTop: '1px' }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '2px' }}>
          <span style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--cm-text-primary)' }}>{label}</span>
          <span style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.4px', textTransform: 'uppercase', color: tone, background: 'var(--cm-bg-elevated)', padding: '1px 6px', borderRadius: '5px' }}>{tag}</span>
        </div>
        <div style={{ fontSize: '11.8px', lineHeight: 1.45, color: 'var(--cm-text-secondary)' }}>{detail}</div>
      </div>
    </div>
  );
}
