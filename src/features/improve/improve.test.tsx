import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

// ImprovePage reads auth (via the real-data Review-Mistakes count); with no user
// it uses the DEV sample feed these integration tests assert. Mock useAuth.
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ user: null }) }));

import { mapCategory, severityBand, worstSeverity, impactScore } from '../../lib/improve/mapping';
import { composePlan } from '../../lib/improve/composePlan';
import { ImprovePage } from './ImprovePage';
import { ImprovePlanView } from './ImprovePlanView';
import { RadarChart } from '../../components/charts/RadarChart';
import { IvToastProvider } from '../../components/ui/iv';
import { findA11yViolations } from '../../test/axe';
import { sampleRawWeaknesses } from './sampleImprove';

// ── 1. Category mapping (decision #1) ──────────────────────────────────────
describe('weakness category mapping', () => {
  it('maps legacy categories to §9 categories', () => {
    expect(mapCategory({ legacyCategory: 'motif' })).toBe('tactical');
    expect(mapCategory({ legacyCategory: 'recurring' })).toBe('tactical');
    expect(mapCategory({ legacyCategory: 'opening' })).toBe('opening');
    expect(mapCategory({ legacyCategory: 'color' })).toBe('opening');
    expect(mapCategory({ legacyCategory: 'phase', phase: 'endgame' })).toBe('endgame');
    expect(mapCategory({ legacyCategory: 'phase', phase: 'middlegame' })).toBe('positional');
    expect(mapCategory({ legacyCategory: 'positional' })).toBe('positional');
  });
  it('bands severity (High≥66 / Medium 33–65 / Low<33) and finds the worst', () => {
    expect(severityBand(78)).toBe('high');
    expect(severityBand(50)).toBe('medium');
    expect(severityBand(20)).toBe('low');
    expect(worstSeverity(['low', 'high', 'medium'])).toBe('high');
  });
  it('impact rises with severity and frequency', () => {
    const a = impactScore({ score: 80, frequencyPct: 40, trend: 'worsening' });
    const b = impactScore({ score: 30, frequencyPct: 10, trend: 'improving' });
    expect(a).toBeGreaterThan(b);
  });
});

// ── 2. Plan composition + queue ingestion (decision #4) ────────────────────
describe('plan composition', () => {
  const opts = { week: 7, sessionsDone: 2, phaseDeltaPct: 4, queue: [] };

  it('picks the highest-impact weakness as the Weekly Focus', () => {
    const { focus } = composePlan(sampleRawWeaknesses, opts)!;
    expect(focus.title).toMatch(/rook endgames/i);
    expect(focus.weaknessKey).toBe('rook_conversion');
  });
  it('orders sessions with the first incomplete = next', () => {
    const { plan } = composePlan(sampleRawWeaknesses, opts)!;
    const focusItems = plan.filter((p) => p.weaknessKey === 'rook_conversion');
    expect(focusItems[0].status).toBe('done');
    expect(focusItems[1].status).toBe('done');
    expect(focusItems[2].status).toBe('next');
  });
  it('ingests Send-to-Improve queue items as imported study items', () => {
    const { plan } = composePlan(sampleRawWeaknesses, {
      ...opts,
      queue: [{ gameId: 'g1', ply: 5, motif: 'hanging-piece', san: 'Qxh7' }],
    })!;
    const imported = plan.find((p) => p.source === 'send-to-improve');
    expect(imported).toBeTruthy();
    expect(imported!.title).toMatch(/hanging piece/i);
  });
  it('groups weaknesses into §9 categories', () => {
    const { categories } = composePlan(sampleRawWeaknesses, opts)!;
    const cats = categories.map((c) => c.category);
    expect(cats).toContain('endgame');
    expect(cats).toContain('tactical');
    expect(cats).toContain('opening');
  });

  it('returns null for empty input (no-data path, no crash)', () => {
    expect(composePlan([], opts)).toBeNull();
  });

  it('rationale uses only real {pct} (no fabricated specifics)', () => {
    const { focus } = composePlan(sampleRawWeaknesses, opts)!;
    expect(focus.rationale).not.toMatch(/\{n\}|\{converted\}|\{pct\}/);
  });
});

describe('RadarChart empty guard', () => {
  it('renders a labelled placeholder for empty data (no crash)', () => {
    render(<RadarChart data={[]} />);
    expect(screen.getByRole('img', { name: /no data/i })).toBeInTheDocument();
  });
});

// ── 3. ImprovePage (integration + a11y) ────────────────────────────────────
function renderPage() {
  return render(
    <IvToastProvider>
      <MemoryRouter initialEntries={['/improve']}>
        <Routes>
          <Route path="/improve" element={<ImprovePage />}>
            <Route index element={<ImprovePlanView />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </IvToastProvider>,
  );
}

describe('ImprovePage', () => {
  beforeEach(() => { window.localStorage.clear(); });

  it('renders the plan with one Primary (Continue) + weekly focus', () => {
    renderPage();
    expect(screen.getByRole('heading', { level: 1, name: /improvement plan/i })).toBeInTheDocument();
    expect(screen.getByText(/Convert winning rook endgames/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Continue · session/i })).toBeInTheDocument();
    expect(screen.getByRole('radiogroup', { name: /category filter/i })).toBeInTheDocument();
  });

  it('shows imported Send-to-Improve items in the study plan', () => {
    window.localStorage.setItem('cm.improveQueue', JSON.stringify([{ gameId: 'g1', ply: 5, motif: 'back-rank', san: 'Re8' }]));
    renderPage();
    expect(screen.getAllByText('From analysis').length).toBeGreaterThan(0);
  });

  it('has no axe violations', async () => {
    const { container } = renderPage();
    expect(await findA11yViolations(container)).toEqual([]);
  });
});
