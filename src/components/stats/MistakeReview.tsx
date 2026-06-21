import { useMemo } from 'react';
import { Crosshair, X } from 'lucide-react';
import { ChessBoard } from '../chess/ChessBoard';
import { buildMistakeReview, type MistakeInput, type MistakeFilter, type MistakeCard } from '../../lib/mistakeReview';
import { MOTIF_INFO, type Motif } from '../../lib/motifs';
import { CLASSIFICATION } from '../../utils/moveClassifier';
import type { Phase } from '../../lib/moveAnalysis';

const PHASES: Phase[] = ['opening', 'middlegame', 'endgame'];
const PHASE_LABEL: Record<Phase, string> = { opening: 'Opening', middlegame: 'Middlegame', endgame: 'Endgame' };
const MOTIFS: Motif[] = ['hung_piece', 'allowed_material_loss', 'missed_material_gain', 'allowed_mate', 'missed_mate', 'major_tactical_blunder'];

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      style={{
        fontSize: '11px',
        fontWeight: 500,
        padding: '4px 10px',
        borderRadius: '999px',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        background: active ? 'var(--cm-accent-dim)' : 'var(--cm-bg-elevated)',
        color: active ? 'var(--cm-accent-bright)' : 'var(--cm-text-secondary)',
        border: `1px solid ${active ? 'var(--cm-accent-ring)' : 'var(--cm-border-subtle)'}`,
      }}
    >
      {children}
    </button>
  );
}

function MistakeCardView({ card }: { card: MistakeCard }) {
  const cls = CLASSIFICATION[card.classification];
  return (
    <div style={{
      background: 'var(--cm-bg-elevated)',
      border: '1px solid var(--cm-border-subtle)',
      borderRadius: '10px',
      padding: '10px',
      display: 'flex',
      gap: '12px',
    }}>
      <div style={{ flexShrink: 0, borderRadius: '6px', overflow: 'hidden', lineHeight: 0 }}>
        <ChessBoard fen={card.fen} squareSize={30} interactive={false} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', minWidth: 0, flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '11px', fontWeight: 700, color: cls?.color ?? 'var(--cm-error-bright)' }}>
            {cls?.label ?? card.classification}
          </span>
          <span style={{ fontSize: '11px', color: 'var(--cm-text-muted)' }}>
            Move {card.moveNumber} · {card.color} · {PHASE_LABEL[card.phase]}
          </span>
        </div>
        <div style={{ fontSize: '12.5px', color: 'var(--cm-text-primary)' }}>
          Played <strong style={{ fontFamily: 'var(--font-family-mono)' }}>{card.san ?? '—'}</strong>
          {card.bestMoveSan && (
            <>
              {' · '}best <strong style={{ fontFamily: 'var(--font-family-mono)', color: 'var(--cm-success)' }}>{card.bestMoveSan}</strong>
            </>
          )}
        </div>
        <div style={{ fontSize: '11.5px', color: 'var(--cm-text-muted)' }}>
          Lost {(card.cpLoss / 100).toFixed(1)} pawns of evaluation
        </div>
        {card.motifs.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            {card.motifs.map((m) => (
              <span key={m} style={{
                fontSize: '10px', padding: '1px 7px', borderRadius: '999px',
                background: 'var(--cm-bg-surface)', border: '1px solid var(--cm-border-subtle)',
                color: 'var(--cm-text-secondary)',
              }}>
                {MOTIF_INFO[m].label}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function MistakeReview({
  mistakes, loading, error, filter, onFilterChange,
}: {
  mistakes: MistakeInput[];
  loading: boolean;
  error: string | null;
  filter: MistakeFilter;
  onFilterChange: (f: MistakeFilter) => void;
}) {
  const cards = useMemo(() => buildMistakeReview(mistakes, filter), [mistakes, filter]);
  const hasFilter = !!(filter.phase || filter.motif);

  return (
    <section aria-labelledby="mistakes-heading" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div>
        <h3 id="mistakes-heading" style={{ fontSize: '15px', fontWeight: 600, color: 'var(--cm-text-primary)', margin: 0 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '7px' }}>
            <Crosshair size={15} style={{ color: 'var(--cm-accent-bright)' }} /> Review your mistakes
          </span>
        </h3>
        <p style={{ fontSize: '12px', color: 'var(--cm-text-muted)', margin: '3px 0 0' }}>
          Your blunders and mistakes, worst first — study the position and the move you should have played.
        </p>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
        {PHASES.map((p) => (
          <Chip key={p} active={filter.phase === p} onClick={() => onFilterChange({ ...filter, phase: filter.phase === p ? undefined : p })}>
            {PHASE_LABEL[p]}
          </Chip>
        ))}
        {MOTIFS.map((m) => (
          <Chip key={m} active={filter.motif === m} onClick={() => onFilterChange({ ...filter, motif: filter.motif === m ? undefined : m })}>
            {MOTIF_INFO[m].label}
          </Chip>
        ))}
        {hasFilter && (
          <button
            type="button"
            onClick={() => onFilterChange({})}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '11px', color: 'var(--cm-text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <X size={12} /> Clear
          </button>
        )}
      </div>

      {loading && <p style={{ fontSize: '13px', color: 'var(--cm-text-secondary)' }}>Loading your mistakes…</p>}
      {error && <p role="alert" style={{ fontSize: '13px', color: 'var(--cm-error-bright)' }}>{error}</p>}

      {!loading && !error && cards.length === 0 && (
        <div style={{ background: 'var(--cm-bg-elevated)', border: '1px solid var(--cm-border-subtle)', borderRadius: '10px', padding: '16px', fontSize: '13px', color: 'var(--cm-text-secondary)', lineHeight: 1.5 }}>
          {mistakes.length === 0
            ? 'No mistakes to review yet. Analyze a game (it records per-move data) and your blunders will show up here.'
            : 'No mistakes match this filter.'}
        </div>
      )}

      {!loading && !error && cards.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {cards.map((c, i) => <MistakeCardView key={`${c.gameId}-${c.moveNumber}-${i}`} card={c} />)}
        </div>
      )}
    </section>
  );
}
