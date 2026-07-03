import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { buildReviewFeed, applyFilter, motifOptions } from './adapter';

// B2: useReviewMistakes reads auth; with no user it uses the DEV sample feed
// (the populated experience these view tests assert). Mock useAuth → no user.
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ user: null }) }));
import { sampleDetectedMistakes, makeSampleMistakes } from './sampleMistakes';
import { ReviewMistakesView } from './ReviewMistakesView';
import { IvToastProvider } from '../../../components/ui/iv';
import { findA11yViolations } from '../../../test/axe';
import { readImproveQueue } from '../queue';

// ── adapter: one source of truth, taxonomy bridge, queue ingestion ──────────
describe('review feed adapter', () => {
  it('priority-orders detected mistakes (most costly first)', () => {
    const feed = buildReviewFeed(sampleDetectedMistakes, []);
    for (let i = 1; i < feed.length; i++) {
      expect(feed[i - 1].priority).toBeGreaterThanOrEqual(feed[i].priority);
    }
  });

  it('maps legacy classification to the Ivory taxonomy', () => {
    const feed = buildReviewFeed(sampleDetectedMistakes, []);
    const qualities = new Set(feed.map((m) => m.quality));
    expect([...qualities].every((q) => ['brilliant', 'best', 'good', 'inaccuracy', 'mistake', 'blunder'].includes(q))).toBe(true);
    expect(feed.some((m) => m.quality === 'blunder')).toBe(true);
  });

  it('ingests the Send-to-Improve queue, pinned above detected, deduped', () => {
    const queue = [{ gameId: 'g-2042', ply: 21, motif: 'hanging-piece', san: 'Qxh7' }];
    const feed = buildReviewFeed(sampleDetectedMistakes, queue);
    expect(feed[0].source).toBe('send-to-improve');
    expect(feed[0].motifs[0].label).toBe('Hanging piece');
    // no duplicate id
    expect(new Set(feed.map((m) => m.id)).size).toBe(feed.length);
  });

  it('filters by phase and motif', () => {
    const feed = buildReviewFeed(sampleDetectedMistakes, []);
    const endgame = applyFilter(feed, { phase: 'endgame', motif: 'all' });
    expect(endgame.every((m) => m.phase === 'endgame')).toBe(true);
    const motif = motifOptions(feed)[0];
    const byMotif = applyFilter(feed, { phase: 'all', motif: motif.key });
    expect(byMotif.every((m) => m.motifs.some((x) => x.key === motif.key))).toBe(true);
  });

  it('scales to 50+ mistakes', () => {
    const feed = buildReviewFeed(makeSampleMistakes(60), []);
    expect(feed.length).toBe(60);
  });
});

// ── view: one primary per card, integration, a11y ───────────────────────────
function renderView() {
  return render(
    <IvToastProvider>
      <MemoryRouter initialEntries={['/improve/mistakes']}><ReviewMistakesView /></MemoryRouter>
    </IvToastProvider>,
  );
}

describe('ReviewMistakesView', () => {
  beforeEach(() => window.localStorage.clear());

  it('renders the feed with exactly one Primary action on the detail card', () => {
    renderView();
    expect(screen.getByRole('group', { name: /mistake filters/i })).toBeInTheDocument();
    // exactly one primary button (Open in Analysis); secondary is ghost
    const primaries = document.querySelectorAll('.iv-rm-detail__cta .iv-btn--primary');
    expect(primaries.length).toBe(1);
    expect(screen.getByRole('button', { name: /open in analysis/i })).toBeInTheDocument();
  });

  it('"Add to study plan" writes the shared cm.improveQueue', () => {
    renderView();
    expect(readImproveQueue().length).toBe(0);
    fireEvent.click(screen.getByRole('button', { name: /add to study plan/i }));
    expect(readImproveQueue().length).toBe(1);
  });

  it('filters the feed when a phase is selected', () => {
    renderView();
    const before = document.querySelectorAll('.iv-rm-row').length;
    fireEvent.click(screen.getByRole('radio', { name: 'Endgame' }));
    const after = document.querySelectorAll('.iv-rm-row').length;
    expect(after).toBeLessThanOrEqual(before);
    expect(after).toBeGreaterThan(0);
  });

  it('shows a no-match state with a reset when filters exclude everything', () => {
    renderView();
    fireEvent.click(screen.getByRole('radio', { name: 'Opening' }));
    fireEvent.click(screen.getByRole('button', { name: 'Hung piece' }));
    expect(screen.getByText(/no mistakes match/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /clear filters/i }));
    expect(screen.queryByText(/no mistakes match/i)).not.toBeInTheDocument();
  });

  it('has no axe violations', async () => {
    const { container } = renderView();
    expect(await findA11yViolations(container)).toEqual([]);
  });
});
