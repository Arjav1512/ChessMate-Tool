import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, useLocation } from 'react-router-dom';

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { email: 'new@user.com', user_metadata: {} } }),
}));

// Force the new-user (0 games) branch.
vi.mock('./hooks', () => ({
  useDashboardEmptyState: () => ({ data: false, isLoading: false, isError: false }),
}));

import { DashboardPage } from './DashboardPage';

function Loc() { return <div data-testid="loc">{useLocation().pathname}</div>; }

describe('DashboardPage — empty / onboarding state (§7)', () => {
  it('renders the onboarding focus instead of the grid and routes to import', () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={['/dashboard']}>
          <DashboardPage />
          <Loc />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    expect(screen.getByText(/Import your first game to begin/i)).toBeInTheDocument();
    // Grid sections are absent.
    expect(screen.queryByText('How am I improving?')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Import your first game/i }));
    expect(screen.getByTestId('loc')).toHaveTextContent('/games/import');
  });
});
