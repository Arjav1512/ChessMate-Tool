import React from 'react';

export type MoveQuality = 'brilliant' | 'best' | 'good' | 'inaccuracy' | 'mistake' | 'blunder';

const MQ_TOKEN: Record<MoveQuality, string> = {
  brilliant: 'var(--mq-brilliant)',
  best: 'var(--mq-best)',
  good: 'var(--mq-good)',
  inaccuracy: 'var(--mq-inaccuracy)',
  mistake: 'var(--mq-mistake)',
  blunder: 'var(--mq-blunder)',
};

const MQ_SYMBOL: Record<MoveQuality, string> = {
  brilliant: '!!',
  best: '!',
  good: '',
  inaccuracy: '?!',
  mistake: '?',
  blunder: '??',
};

export interface ChipProps extends React.HTMLAttributes<HTMLSpanElement> {
  dot?: boolean;
}

/** Neutral chip (System Design §6). */
export function Chip({ dot = false, className = '', children, ...rest }: ChipProps) {
  return (
    <span className={`iv-chip ${className}`} {...rest}>
      {dot && <span className="iv-chip__dot" aria-hidden />}
      {children}
    </span>
  );
}

export interface MoveQualityChipProps {
  quality: MoveQuality;
  /** Optional SAN shown in mono after the label (e.g. "Blunder ?? Qxh7"). */
  san?: string;
  /** Show the chess-convention symbol (!!, ?, ??…). Default true. */
  showSymbol?: boolean;
  /** Add the emphasis glow on the dot (§5.1). */
  emphasis?: boolean;
  className?: string;
}

/**
 * Move-quality chip (System Design §5.1 chip pattern): text=color,
 * bg=color@11%, border=color@30%, 7px dot. Meaning is paired with the
 * chess symbol + label text — never color alone (§11).
 */
export function MoveQualityChip({ quality, san, showSymbol = true, emphasis = false, className = '' }: MoveQualityChipProps) {
  const label = quality.charAt(0).toUpperCase() + quality.slice(1);
  const symbol = MQ_SYMBOL[quality];
  return (
    <span
      className={`iv-chip iv-chip--mq ${emphasis ? 'iv-chip--emph' : ''} ${className}`}
      style={{ ['--mq-color' as string]: MQ_TOKEN[quality] }}
    >
      <span className="iv-chip__dot" aria-hidden />
      {label}
      {showSymbol && symbol && <span className="iv-chip__san">{symbol}</span>}
      {san && <span className="iv-chip__san">{san}</span>}
    </span>
  );
}
