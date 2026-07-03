import { useEffect, useRef } from 'react';
import type { MoveQuality } from '../../lib/analysis/moveQuality';
import { MQ_SYMBOL } from '../../lib/analysis/moveQuality';
import type { AnalysisMoveVM } from './types';

const MQ_TOKEN: Record<MoveQuality, string> = {
  brilliant: 'var(--mq-brilliant)', best: 'var(--mq-best)', good: 'var(--mq-good)',
  inaccuracy: 'var(--mq-inaccuracy)', mistake: 'var(--mq-mistake)', blunder: 'var(--mq-blunder)',
};

export interface MoveListProps {
  moves: AnalysisMoveVM[];
  currentPly: number;
  onSeek: (ply: number) => void;
}

function MoveButton({ move, active, onSeek }: { move: AnalysisMoveVM; active: boolean; onSeek: (ply: number) => void }) {
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (active) ref.current?.scrollIntoView({ block: 'nearest' }); }, [active]);
  const showSym = move.quality && move.quality !== 'good' && MQ_SYMBOL[move.quality];
  return (
    <button
      ref={ref}
      className={`iv-ml__move ${active ? 'iv-ml__move--active' : ''}`}
      aria-current={active ? 'true' : undefined}
      aria-label={`${move.san}${move.quality ? `, ${move.quality}` : ''}`}
      onClick={() => onSeek(move.ply)}
    >
      {move.quality && <span className="iv-ml__dot" style={{ background: MQ_TOKEN[move.quality] }} aria-hidden />}
      <span className="iv-ml__san">{move.san}</span>
      {showSym && <span className="iv-ml__sym" aria-hidden>{MQ_SYMBOL[move.quality!]}</span>}
    </button>
  );
}

/**
 * Move list (§8): persistent across tabs, 2-column SAN per move number, mono,
 * a quality dot per move, current move = accent tint + border. Click to seek.
 * The SAN log is the accessible source of truth for board state (§11).
 */
export function MoveList({ moves, currentPly, onSeek }: MoveListProps) {
  const rows: Array<{ n: number; white?: AnalysisMoveVM; black?: AnalysisMoveVM }> = [];
  for (let i = 0; i < moves.length; i += 2) {
    rows.push({ n: Math.floor(i / 2) + 1, white: moves[i], black: moves[i + 1] });
  }
  return (
    <div className="iv-ml" aria-label="Move list">
      {rows.map((row) => (
        <div key={row.n} className="iv-ml__row">
          <span className="iv-ml__num">{row.n}.</span>
          {row.white && <MoveButton move={row.white} active={currentPly === row.white.ply} onSeek={onSeek} />}
          {row.black && <MoveButton move={row.black} active={currentPly === row.black.ply} onSeek={onSeek} />}
        </div>
      ))}
    </div>
  );
}
