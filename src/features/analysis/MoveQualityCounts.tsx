import { MQ_ORDER, MQ_LABEL, MQ_SYMBOL } from '../../lib/analysis/moveQuality';
import type { MoveQuality } from '../../lib/analysis/moveQuality';

const MQ_TOKEN: Record<MoveQuality, string> = {
  brilliant: 'var(--mq-brilliant)', best: 'var(--mq-best)', good: 'var(--mq-good)',
  inaccuracy: 'var(--mq-inaccuracy)', mistake: 'var(--mq-mistake)', blunder: 'var(--mq-blunder)',
};

export interface MoveQualityCountsProps {
  counts: Record<MoveQuality, number>;
  /** Filter the move list to a quality when clicked (optional). */
  onSelect?: (q: MoveQuality) => void;
}

/**
 * Move-quality counts (§8): mono dot + count per quality. Meaning is paired with
 * symbol + accessible label, never color-only (§11).
 */
export function MoveQualityCounts({ counts, onSelect }: MoveQualityCountsProps) {
  return (
    <div className="iv-aw__counts" role="list" aria-label="Move quality counts">
      {MQ_ORDER.map((q) => (
        <button
          key={q}
          role="listitem"
          className="iv-aw__count"
          style={{ ['--mq-color' as string]: MQ_TOKEN[q] }}
          onClick={onSelect ? () => onSelect(q) : undefined}
          disabled={!onSelect}
          aria-label={`${counts[q]} ${MQ_LABEL[q]}${MQ_SYMBOL[q] ? ` (${MQ_SYMBOL[q]})` : ''}`}
        >
          <span className="iv-aw__count-dot" aria-hidden />
          <span className="iv-aw__count-num">{counts[q]}</span>
          {MQ_SYMBOL[q] && <span className="iv-aw__count-sym" aria-hidden>{MQ_SYMBOL[q]}</span>}
        </button>
      ))}
    </div>
  );
}
