import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import {
  mapLegacyClassification, classifyMoveQuality, accuracyFromAvgCpLoss, emptyCounts, MQ_ORDER,
} from '../../lib/analysis/moveQuality';
import { useAnalysisStepper } from '../../stores/analysisStepperStore';
import { InsightCard } from './InsightCard';
import { useSendToImprove } from './sendToImprove';
import { AnalysisPage } from './AnalysisPage';
import { IvToastProvider } from '../../components/ui/iv';
import type { AnalysisMoveVM } from './types';

// Phase 8B: useAnalysis now reads auth; with no user it uses the sample path
// (the demo experience these tests assert). Mock useAuth to return no user.
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ user: null }) }));

function move(partial: Partial<AnalysisMoveVM>): AnalysisMoveVM {
  return {
    ply: 10, moveNumber: 5, color: 'w', san: 'Qxh7', from: 'd3', to: 'h7',
    fenBefore: 'startpos', fenAfter: 'startpos', evalCp: 100, mate: null, cpLoss: 0,
    quality: 'good', bestSan: null, bestEvalCp: 100, phase: 'middlegame', motifs: [],
    ...partial,
  };
}

// ─── 1. Taxonomy mapping (decision #2) ──────────────────────────────────────
describe('move-quality taxonomy', () => {
  it('maps legacy excellent → best, keeps the rest', () => {
    expect(mapLegacyClassification('excellent')).toBe('best');
    expect(mapLegacyClassification('best')).toBe('best');
    expect(mapLegacyClassification('good')).toBe('good');
    expect(mapLegacyClassification('blunder')).toBe('blunder');
    expect(mapLegacyClassification('brilliant')).toBe('brilliant');
    expect(mapLegacyClassification('nonsense')).toBe('good');
  });

  it('classifies by centipawn loss + brilliant on sacrifice', () => {
    expect(classifyMoveQuality({ cpLoss: 0, isTopMove: true, isSacrifice: true })).toBe('brilliant');
    expect(classifyMoveQuality({ cpLoss: 0, isTopMove: true })).toBe('best');
    expect(classifyMoveQuality({ cpLoss: 30, isTopMove: false })).toBe('good');
    expect(classifyMoveQuality({ cpLoss: 80, isTopMove: false })).toBe('inaccuracy');
    expect(classifyMoveQuality({ cpLoss: 160, isTopMove: false })).toBe('mistake');
    expect(classifyMoveQuality({ cpLoss: 400, isTopMove: false })).toBe('blunder');
  });

  it('accuracy is clamped 0–100 and excludes "excellent"', () => {
    expect(accuracyFromAvgCpLoss(0)).toBe(100);
    expect(accuracyFromAvgCpLoss(9999)).toBe(0);
    expect(MQ_ORDER).toEqual(['brilliant', 'best', 'good', 'inaccuracy', 'mistake', 'blunder']);
    expect(Object.keys(emptyCounts())).not.toContain('excellent');
  });
});

// ─── 2. Stepper navigation ──────────────────────────────────────────────────
describe('analysis stepper store', () => {
  beforeEach(() => act(() => useAnalysisStepper.getState().reset('w')));

  it('sets ply (clamped ≥ 0), flips, switches tab, resets', () => {
    act(() => useAnalysisStepper.getState().setPly(7));
    expect(useAnalysisStepper.getState().currentPly).toBe(7);
    act(() => useAnalysisStepper.getState().setPly(-3));
    expect(useAnalysisStepper.getState().currentPly).toBe(0);
    act(() => useAnalysisStepper.getState().flip());
    expect(useAnalysisStepper.getState().orientation).toBe('b');
    act(() => useAnalysisStepper.getState().setTab('coach'));
    expect(useAnalysisStepper.getState().activeTab).toBe('coach');
    act(() => useAnalysisStepper.getState().reset('b'));
    const s = useAnalysisStepper.getState();
    expect(s).toMatchObject({ currentPly: 0, orientation: 'b', activeTab: 'analysis' });
  });
});

// ─── 3. InsightCard variants ────────────────────────────────────────────────
describe('InsightCard variants', () => {
  const noop = () => {};
  const props = { analyzing: false, cleanGame: false, onSendToImprove: noop, onRevealBest: noop, onAskCoach: noop };

  it('turning-point variant when ply is a turning point', () => {
    render(<InsightCard {...props} move={move({ ply: 10, quality: 'mistake' })} turningPoints={[10]} />);
    expect(screen.getByText('Turning point')).toBeInTheDocument();
  });
  it('blunder variant for blunder/mistake (not a turning point)', () => {
    render(<InsightCard {...props} move={move({ ply: 5, quality: 'blunder', motifs: ['hanging-piece'], bestSan: 'Bd7' })} turningPoints={[]} />);
    expect(screen.getByText('Critical mistake')).toBeInTheDocument();
  });
  it('missed-opportunity variant for inaccuracy with a better line', () => {
    render(<InsightCard {...props} move={move({ ply: 6, quality: 'inaccuracy', bestSan: 'Be6' })} turningPoints={[]} />);
    expect(screen.getByText('Missed opportunity')).toBeInTheDocument();
  });
  it('recommendation variant for clean play', () => {
    render(<InsightCard {...props} move={move({ ply: 7, quality: 'good' })} turningPoints={[]} />);
    expect(screen.getByText('What to take away')).toBeInTheDocument();
  });
  it('positive clean-game state at the start position', () => {
    render(<InsightCard {...props} move={null} cleanGame turningPoints={[]} />);
    expect(screen.getByText(/Clean game/)).toBeInTheDocument();
  });
});

// ─── 4. Send-to-Improve ─────────────────────────────────────────────────────
describe('Send-to-Improve', () => {
  beforeEach(() => window.localStorage.clear());

  it('InsightCard fires onSendToImprove', () => {
    const onSendToImprove = vi.fn();
    render(<InsightCard analyzing={false} cleanGame={false} onRevealBest={() => {}} onAskCoach={() => {}}
      onSendToImprove={onSendToImprove} turningPoints={[]} move={move({ quality: 'blunder', motifs: ['hanging-piece'], bestSan: 'Bd7' })} />);
    fireEvent.click(screen.getByRole('button', { name: 'Send to Improve' }));
    expect(onSendToImprove).toHaveBeenCalledOnce();
  });

  it('queues the motif to localStorage and toasts', () => {
    function Harness() {
      const send = useSendToImprove('g1');
      return <button onClick={() => send(move({ ply: 5, san: 'Qxh7', motifs: ['hanging-piece'] }))}>go</button>;
    }
    render(<IvToastProvider><Harness /></IvToastProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'go' }));
    const q = JSON.parse(window.localStorage.getItem('cm.improveQueue') ?? '[]');
    expect(q).toHaveLength(1);
    expect(q[0]).toMatchObject({ gameId: 'g1', ply: 5, motif: 'hanging-piece', san: 'Qxh7' });
    expect(screen.getByText(/Added .* to your improvement plan/)).toBeInTheDocument();
  });
});

// ─── 5. Tabs: Analysis default, Coach not default (§8/§14.7) ─────────────────
describe('AnalysisPage tabs', () => {
  beforeEach(() => { (window as unknown as { innerWidth: number }).innerWidth = 1280; });

  it('opens with Analysis selected and Coach not auto-selected', () => {
    render(
      <IvToastProvider>
        <MemoryRouter initialEntries={['/analysis/sample']}>
          <Routes><Route path="/analysis/:id" element={<AnalysisPage />} /></Routes>
        </MemoryRouter>
      </IvToastProvider>,
    );
    expect(screen.getByRole('tab', { name: 'Analysis' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Coach' })).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByRole('tab', { name: 'Lines' })).toHaveAttribute('aria-selected', 'false');
  });
});
