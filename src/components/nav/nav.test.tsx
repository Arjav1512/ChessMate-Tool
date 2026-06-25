import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { BottomTabBar } from './BottomTabBar';
import { CommandMenu } from './CommandMenu';
import { UserMenu } from './UserMenu';
import { useCommandMenuStore } from '../../stores/commandMenuStore';
import { findA11yViolations } from '../../test/axe';

function LocationProbe() {
  const loc = useLocation();
  return <div data-testid="loc">{loc.pathname}</div>;
}

function renderSidebar() {
  return render(
    <MemoryRouter>
      <Sidebar userName="Magnus" userEmail="m@chess.com" collapsed={false} onSignOut={() => {}} />
    </MemoryRouter>,
  );
}

describe('Sidebar (§6 / IA §3)', () => {
  it('renders the built primary destinations in IA order with correct links', () => {
    renderSidebar();
    for (const [label, href] of [
      ['Dashboard', '/dashboard'],
      ['Games', '/games'],
      ['Analysis', '/analysis'],
      ['Improve', '/improve'],
    ] as const) {
      expect(screen.getByRole('link', { name: new RegExp(label) })).toHaveAttribute('href', href);
    }
  });

  it('hides unbuilt destinations from the sidebar (Phase S1 — Coach not yet shipped)', () => {
    renderSidebar();
    const nav = screen.getByRole('navigation', { name: 'Primary' });
    expect(nav).not.toHaveTextContent('Coach');
    expect(nav).not.toHaveTextContent('Settings');
    expect(nav).not.toHaveTextContent('Profile');
  });

  it('has no axe violations', async () => {
    const { container } = renderSidebar();
    expect(await findA11yViolations(container)).toEqual([]);
  });
});

describe('UserMenu (§3 — account menu)', () => {
  it('opens an account menu with Sign out; unbuilt Profile/Settings are hidden (Phase S1)', () => {
    const onSignOut = vi.fn();
    render(
      <MemoryRouter>
        <UserMenu userName="Magnus" userEmail="m@chess.com" onSignOut={onSignOut} />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Account menu' }));
    expect(screen.getByRole('menu', { name: 'Account' })).toBeInTheDocument();
    // Profile/Settings are not yet shipped → hidden from the menu.
    expect(screen.queryByRole('menuitem', { name: 'Profile' })).not.toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'Settings' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Sign out' }));
    expect(onSignOut).toHaveBeenCalledOnce();
    // Selecting an item closes the menu.
    expect(screen.queryByRole('menu', { name: 'Account' })).not.toBeInTheDocument();
  });
});

describe('BottomTabBar (§4.11)', () => {
  it('shows 4 tabs: Home/Games/Analysis/Improve (Coach is contextual)', () => {
    render(<MemoryRouter><BottomTabBar /></MemoryRouter>);
    expect(screen.getByRole('link', { name: /Home/ })).toHaveAttribute('href', '/dashboard');
    expect(screen.getByRole('link', { name: /Games/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Analysis/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Improve/ })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Coach/ })).not.toBeInTheDocument();
  });
});

describe('CommandMenu (§6 / §11)', () => {
  beforeEach(() => { useCommandMenuStore.getState().setOpen(true); });

  it('opens as a modal dialog, filters, and Enter navigates', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <CommandMenu />
        <LocationProbe />
      </MemoryRouter>,
    );
    const dialog = screen.getByRole('dialog', { name: 'Command menu' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');

    const input = screen.getByRole('combobox');
    fireEvent.change(input, { target: { value: 'improve' } });
    expect(screen.getByRole('option', { name: /Improve/ })).toBeInTheDocument();
    fireEvent.keyDown(dialog, { key: 'Enter' });
    expect(screen.getByTestId('loc')).toHaveTextContent('/improve');
  });

  it('traps Tab focus on the input (combobox pattern, §11)', () => {
    render(<MemoryRouter><CommandMenu /></MemoryRouter>);
    const dialog = screen.getByRole('dialog');
    const input = screen.getByRole('combobox');
    // Options are not tab stops; Tab loops back to the input.
    for (const opt of screen.getAllByRole('option')) {
      expect(opt).toHaveAttribute('tabindex', '-1');
    }
    fireEvent.keyDown(dialog, { key: 'Tab' });
    expect(input).toHaveFocus();
    fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: true });
    expect(input).toHaveFocus();
  });

  it('restores focus to the trigger when closed (§11)', async () => {
    function Harness() {
      const setOpen = useCommandMenuStore((s) => s.setOpen);
      return <button onClick={() => setOpen(true)}>trigger</button>;
    }
    useCommandMenuStore.getState().setOpen(false);
    render(<MemoryRouter><Harness /><CommandMenu /></MemoryRouter>);
    const trigger = screen.getByRole('button', { name: 'trigger' });
    trigger.focus();
    fireEvent.click(trigger);
    // Menu open → input focused.
    const input = await screen.findByRole('combobox');
    expect(input).toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(trigger).toHaveFocus();
  });

  it('has no axe violations', async () => {
    const { container } = render(<MemoryRouter><CommandMenu /></MemoryRouter>);
    expect(await findA11yViolations(container)).toEqual([]);
  });
});
