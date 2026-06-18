/**
 * InsightCard — the v2 Insights tab's primary content. Surfaces a single
 * derived insight (biggest mistake / turning point / best move) with three
 * quick actions: Explain (ask the coach), Show Position (move the board),
 * Jump To Move (open it in the move list). Presentational only.
 */

import React from 'react';
import { Zap, X, Star, MessageCircle, Eye, CornerDownRight } from 'lucide-react';
import type { GameInsight } from '../../../utils/gameInsights';
import { Chip } from '../../ui/Chip';

const TONE: Record<GameInsight['tone'], { color: string; dim: string; icon: React.ReactNode }> = {
  amber:   { color: 'var(--cm-warning)', dim: 'var(--cm-warning-dim)', icon: <Zap size={15} /> },
  error:   { color: 'var(--cm-error)',   dim: 'var(--cm-error-dim)',   icon: <X size={15} /> },
  success: { color: 'var(--cm-success)', dim: 'var(--cm-success-dim)', icon: <Star size={15} /> },
};

interface InsightCardProps {
  insight: GameInsight;
  onExplain: () => void;
  onShowPosition: () => void;
  onJumpToMove: () => void;
}

export function InsightCard({ insight, onExplain, onShowPosition, onJumpToMove }: InsightCardProps) {
  const tone = TONE[insight.tone];
  return (
    <div style={{
      background: 'var(--cm-bg-elevated)',
      border: '1px solid var(--cm-border-subtle)',
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '9px', padding: '12px 13px 8px' }}>
        <span style={{ width: '28px', height: '28px', borderRadius: '8px', display: 'grid', placeItems: 'center', background: tone.dim, color: tone.color, flexShrink: 0 }}>
          {tone.icon}
        </span>
        <span style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--cm-text-primary)' }}>{insight.title}</span>
        <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-family-mono)', fontSize: '11.5px', color: 'var(--cm-text-secondary)', background: 'var(--cm-bg-surface)', padding: '3px 8px', borderRadius: '6px', flexShrink: 0 }}>
          {insight.move}
        </span>
      </div>
      <p style={{ padding: '0 13px 12px', margin: 0, fontSize: '12.8px', lineHeight: 1.55, color: 'var(--cm-text-secondary)' }}>
        {insight.detail}
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', padding: '0 13px 13px' }}>
        <Chip onClick={onExplain} icon={<MessageCircle size={12} />}>Explain</Chip>
        <Chip variant="ghost" onClick={onShowPosition} icon={<Eye size={12} />}>Show Position</Chip>
        <Chip variant="ghost" onClick={onJumpToMove} icon={<CornerDownRight size={12} />}>Jump To Move</Chip>
      </div>
    </div>
  );
}
