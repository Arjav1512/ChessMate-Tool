import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { computeImprovementScore } from './sampleDashboard';
import {
  ImprovementScoreCard, RatingTrendCard, BiggestWeaknessesCard, FocusCard,
  RecentGamesCard, CoachSummaryCard, RoadmapTimeline,
} from './cards';
import { DashboardPage } from './DashboardPage';
import { findA11yViolations } from '../../test/axe';

// Avoid booting Supabase auth in jsdom — the dashboard only reads user for the greeting.
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { email: 'magnus@chess.com', user_metadata: { display_name: 'Magnus' } } }),
}));

function renderWithProviders(ui: React.ReactNode, initialEntries = ['/dashboard']) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={initialEntries}>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('computeImprovementScore (Architecture §13)', () => {
  it('clamps to 0–100 and weights inputs', () => {
    const lo = computeImprovementScore({ accuracyTrendSlope: -1, topWeaknessFrequency: 1, conversionRate: 0, ratingSlope: -1 });
    const hi = computeImprovementScore({ accuracyTrendSlope: 1, topWeaknessFrequency: 0, conversionRate: 1, ratingSlope: 1 });
    expect(lo).toBe(0);
    expect(hi).toBe(100);
    const mid = computeImprovementScore({ accuracyTrendSlope: 0.42, topWeaknessFrequency: 0.41, conversionRate: 0.63, ratingSlope: 0.38 });
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(100);
  });
});

describe('ImprovementScoreCard (§7 — explanatory + actionable)', () => {
  it('renders the score, verdict, drivers and an actionable next step', async () => {
    renderWithProviders(<ImprovementScoreCard />);
    expect(await screen.findByText(/improving steadily/i)).toBeInTheDocument();
    // Score ring exposes an accessible label with the value.
    expect(screen.getByRole('img', { name: /Improvement score \d+ of 100/ })).toBeInTheDocument();
    expect(screen.getByText(/Fastest way to raise it/i)).toBeInTheDocument();
    expect(screen.getByText(/Convert winning endgames/i)).toBeInTheDocument();
  });
});

describe('RatingTrendCard (§7 — quiet companion)', () => {
  it('renders rating, peak and a labelled chart; range switch works', async () => {
    renderWithProviders(<RatingTrendCard />);
    expect(await screen.findByText('1487')).toBeInTheDocument();
    expect(screen.getByText(/peak/)).toBeInTheDocument();
    const chart = screen.getByRole('img', { name: /Rating over 90d/ });
    expect(chart).toBeInTheDocument();
    // switch to 30d
    fireEvent.click(screen.getByRole('radio', { name: '30d' }));
    expect(await screen.findByRole('img', { name: /Rating over 30d/ })).toBeInTheDocument();
  });
});

describe('BiggestWeaknessesCard (§7 — why it matters + action)', () => {
  it('renders each weakness with a why line and a recommended action', async () => {
    renderWithProviders(<BiggestWeaknessesCard />);
    expect(await screen.findByText('Endgame conversion')).toBeInTheDocument();
    expect(screen.getByText(/Costs you ~18 rating\/month/)).toBeInTheDocument();
    expect(screen.getByText(/Drill rook endgames/)).toBeInTheDocument();
  });

  it('"View all" routes to /weaknesses', async () => {
    function Loc() { return <div data-testid="loc">{useLocation().pathname}</div>; }
    renderWithProviders(<><BiggestWeaknessesCard /><Loc /></>);
    await screen.findByText('Endgame conversion');
    fireEvent.click(screen.getByRole('button', { name: 'View all →' }));
    expect(screen.getByTestId('loc')).toHaveTextContent('/weaknesses');
  });
});

describe('FocusCard (§7 — one primary action)', () => {
  it('renders the weekly focus and a Start session button', async () => {
    renderWithProviders(<FocusCard />);
    expect(await screen.findByText('Convert winning endgames')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Start session/ })).toBeInTheDocument();
  });
});

describe('RecentGamesCard + RoadmapTimeline + CoachSummaryCard', () => {
  it('recent games list renders rows', async () => {
    renderWithProviders(<RecentGamesCard />);
    expect(await screen.findByText(/KnightRider/)).toBeInTheDocument();
  });
  it('roadmap renders milestone outcomes', async () => {
    renderWithProviders(<RoadmapTimeline />);
    expect(await screen.findByText(/Reach 1550/)).toBeInTheDocument();
  });
  it('coach summary is present and subordinate', async () => {
    renderWithProviders(<CoachSummaryCard />);
    expect(await screen.findByText(/Coach · summary/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Ask coach/ })).toBeInTheDocument();
  });
});

describe('DashboardPage (integration §7)', () => {
  beforeEach(() => { /* fresh client per render */ });

  it('renders the greeting and all narrative sections (success state)', async () => {
    renderWithProviders(<DashboardPage />);
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent(/Good (morning|afternoon|evening), Magnus/);
    // Narrative spine captions present.
    expect(await screen.findByText('How am I improving?')).toBeInTheDocument();
    expect(screen.getByText("What’s holding me back?")).toBeInTheDocument();
    expect(screen.getByText('What outcome can I expect?')).toBeInTheDocument();
  });

  it('has exactly the primary "Continue improving" action in the greeting', async () => {
    renderWithProviders(<DashboardPage />);
    expect(await screen.findByRole('button', { name: /Continue improving/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Import games' })).toBeInTheDocument();
  });

  it('has no axe violations', async () => {
    const { container } = renderWithProviders(<DashboardPage />);
    await screen.findByText('How am I improving?');
    expect(await findA11yViolations(container)).toEqual([]);
  });
});
