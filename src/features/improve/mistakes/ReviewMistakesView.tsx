import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, EmptyState, ErrorState, SegmentedControl, Skeleton, useIvToast } from '../../../components/ui/iv';
import type { MoveQuality } from '../../../components/ui/iv';
import { BoardContainer } from '../../analysis/BoardContainer';
import { MQ_SYMBOL, MQ_LABEL } from '../../../lib/analysis/moveQuality';
import type { Phase } from '../../../lib/moveAnalysis';
import { addToImproveQueue } from '../queue';
import { useReviewMistakes } from './useReviewMistakes';
import { applyFilter, motifOptions } from './adapter';
import type { MistakeFilterVM, ReviewMistakeVM } from './types';

const MQ_TOKEN: Record<MoveQuality, string> = {
  brilliant: 'var(--mq-brilliant)', best: 'var(--mq-best)', good: 'var(--mq-good)',
  inaccuracy: 'var(--mq-inaccuracy)', mistake: 'var(--mq-mistake)', blunder: 'var(--mq-blunder)',
};
const PHASE_LABEL: Record<Phase, string> = { opening: 'Opening', middlegame: 'Middlegame', endgame: 'Endgame' };

function QualityTag({ q }: { q: MoveQuality }) {
  return (
    <span className="iv-rm-q">
      <span className="iv-rm-q__dot" style={{ background: MQ_TOKEN[q] }} aria-hidden />
      <span className="iv-rm-q__label">{MQ_LABEL[q]}{MQ_SYMBOL[q] ? ` ${MQ_SYMBOL[q]}` : ''}</span>
    </span>
  );
}

/**
 * Improve · Review Mistakes (Phase 7). The single mistake feed (B-4 engine +
 * Send-to-Improve queue), master/detail. Every selected mistake exposes exactly
 * one Primary action — "Open in Analysis" — with a secondary "Add to study plan".
 * Coaching, not analytics: lead with the position + the lesson + one next step.
 */
export function ReviewMistakesView() {
  const navigate = useNavigate();
  const { toast } = useIvToast();
  const { feed, isLoading, error } = useReviewMistakes();
  const [filter, setFilter] = useState<MistakeFilterVM>({ phase: 'all', motif: 'all' });
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const motifs = useMemo(() => motifOptions(feed), [feed]);
  const filtered = useMemo(() => applyFilter(feed, filter), [feed, filter]);
  const selected = filtered.find((m) => m.id === selectedId) ?? filtered[0] ?? null;

  if (isLoading) {
    return (
      <div className="iv-rm" aria-busy="true">
        <Skeleton height={40} />
        <div className="iv-rm__grid" style={{ marginTop: 16 }}>
          <div className="iv-rm__list">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} height={56} />)}</div>
          <Skeleton height={360} />
        </div>
      </div>
    );
  }
  if (error) {
    return <ErrorState message="We couldn’t load your mistakes. Check your connection and try again." onRetry={() => navigate(0)} />;
  }
  if (feed.length === 0) {
    return (
      <EmptyState
        icon={<span style={{ fontSize: 26 }}>◎</span>}
        title="No mistakes to review yet"
        body="Analyze a game and the mistakes worth studying will show up here, ranked by how much they cost you."
        action={<Button onClick={() => navigate('/games/import')}>Import a game</Button>}
      />
    );
  }

  const openInAnalysis = (m: ReviewMistakeVM) => navigate(`/analysis/${encodeURIComponent(m.gameId)}?ply=${m.ply}`);
  const addToPlan = (m: ReviewMistakeVM) => {
    const added = addToImproveQueue({ gameId: m.gameId, ply: m.ply, motif: m.motifs[0]?.key ?? 'review', san: m.playedSan ?? '' });
    toast(added ? 'Added to your study plan' : 'Already in your study plan', 'info');
  };

  return (
    <div className="iv-rm">
      <p className="iv-rm__lead iv-body-sm">{filtered.length} of {feed.length} mistakes · ranked by what they cost you. Fix the top one first.</p>

      <div className="iv-rm__filters" role="group" aria-label="Mistake filters">
        <SegmentedControl
          ariaLabel="Phase filter"
          value={filter.phase}
          onChange={(phase) => setFilter((f) => ({ ...f, phase }))}
          options={[
            { value: 'all', label: 'All' },
            { value: 'opening', label: 'Opening' },
            { value: 'middlegame', label: 'Middlegame' },
            { value: 'endgame', label: 'Endgame' },
          ]}
        />
        {motifs.length > 0 && (
          <div className="iv-rm__motifs" role="group" aria-label="Motif filter">
            <button className={`iv-rm-chip ${filter.motif === 'all' ? 'iv-rm-chip--on' : ''}`} aria-pressed={filter.motif === 'all'} onClick={() => setFilter((f) => ({ ...f, motif: 'all' }))}>All motifs</button>
            {motifs.map((mo) => (
              <button key={mo.key} className={`iv-rm-chip ${filter.motif === mo.key ? 'iv-rm-chip--on' : ''}`} aria-pressed={filter.motif === mo.key} onClick={() => setFilter((f) => ({ ...f, motif: mo.key }))}>{mo.label}</button>
            ))}
          </div>
        )}
      </div>

      <div className="iv-rm__grid">
        {/* Feed (navigable index) */}
        <ul className="iv-rm__list" aria-label="Your mistakes, most costly first">
          {filtered.map((m) => (
            <li key={m.id}>
              <button
                className={`iv-rm-row ${selected?.id === m.id ? 'iv-rm-row--sel' : ''}`}
                aria-current={selected?.id === m.id}
                onClick={() => setSelectedId(m.id)}
                aria-label={`Move ${m.moveNumber}, ${m.quality}, played ${m.playedSan ?? 'a move'}${m.motifs[0] ? `, ${m.motifs[0].label}` : ''}${m.source === 'send-to-improve' ? ', from your analysis' : ''}`}
              >
                <span className="iv-rm-row__q"><span className="iv-rm-q__dot" style={{ background: MQ_TOKEN[m.quality] }} aria-hidden />{MQ_SYMBOL[m.quality] || '·'}</span>
                <span className="iv-rm-row__body">
                  <span className="iv-rm-row__top">{m.playedSan ?? '—'} <span className="iv-rm-row__move">move {m.moveNumber}</span>{m.source === 'send-to-improve' && <span className="iv-rm-row__tag">From analysis</span>}</span>
                  <span className="iv-rm-row__sub">{m.motifs[0]?.label ?? PHASE_LABEL[m.phase]} · {PHASE_LABEL[m.phase]}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>

        {/* Drill detail = the mistake "card" with one Primary */}
        {selected && (
          <div className="iv-rm-detail" aria-live="polite">
            <BoardContainer fen={selected.fen} />
            <div className="iv-rm-detail__body">
              <div className="iv-rm-detail__head">
                <QualityTag q={selected.quality} />
                <span className="iv-rm-detail__phase">{PHASE_LABEL[selected.phase]} · move {selected.moveNumber}</span>
              </div>
              <p className="iv-rm-detail__moves">
                You played <strong>{selected.playedSan ?? '—'}</strong>
                {selected.bestSan && <> · best was <strong className="iv-rm-detail__best">{selected.bestSan}</strong></>}
                <span className="iv-rm-detail__cp"> · lost {(selected.cpLoss / 100).toFixed(1)}</span>
              </p>
              <p className="iv-rm-detail__lesson">{selected.lesson}</p>
              <div className="iv-rm-detail__cta">
                <Button onClick={() => openInAnalysis(selected)}>Open in Analysis →</Button>
                <Button variant="ghost" onClick={() => addToPlan(selected)}>Add to study plan</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
