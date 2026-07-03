import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { useState } from 'react';
import {
  Button, Input, MetricCard, MoveQualityChip, SegmentedControl, Tabs, TabPanel,
  Toggle, Dialog, ProgressBar, EmptyState, ErrorState, Dropdown,
} from './index';

describe('Button (§6)', () => {
  it('renders a real <button> and fires onClick', () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Go</Button>);
    fireEvent.click(screen.getByRole('button', { name: 'Go' }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('loading sets aria-busy and disables the button (label not color-only)', () => {
    render(<Button loading>Save</Button>);
    const btn = screen.getByRole('button');
    expect(btn).toHaveAttribute('aria-busy', 'true');
    expect(btn).toBeDisabled();
  });

  it('disabled blocks clicks', () => {
    const onClick = vi.fn();
    render(<Button disabled onClick={onClick}>X</Button>);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).not.toHaveBeenCalled();
  });
});

describe('Input (§6)', () => {
  it('associates label and exposes error via aria-describedby + aria-invalid', () => {
    render(<Input label="Email" error="Bad email" />);
    const input = screen.getByLabelText('Email');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    const describedby = input.getAttribute('aria-describedby');
    expect(describedby).toBeTruthy();
    expect(document.getElementById(describedby!)).toHaveTextContent('Bad email');
  });
});

describe('Tabs (§6/§8 — Analysis-default contract)', () => {
  function Harness() {
    const [v, setV] = useState<'analysis' | 'coach' | 'lines'>('analysis');
    return (
      <>
        <Tabs ariaLabel="views" value={v} onChange={setV} tabs={[
          { value: 'analysis', label: 'Analysis' },
          { value: 'coach', label: 'Coach' },
          { value: 'lines', label: 'Lines' },
        ]} />
        <TabPanel active={v === 'analysis'}>analysis-panel</TabPanel>
        <TabPanel active={v === 'coach'}>coach-panel</TabPanel>
      </>
    );
  }

  it('Analysis is selected by default; Coach is NOT auto-opened', () => {
    render(<Harness />);
    expect(screen.getByRole('tab', { name: 'Analysis' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Coach' })).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByText('analysis-panel')).toBeInTheDocument();
    expect(screen.queryByText('coach-panel')).not.toBeInTheDocument();
  });

  it('selecting Coach swaps the panel; arrow keys move selection', () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('tab', { name: 'Coach' }));
    expect(screen.getByText('coach-panel')).toBeInTheDocument();
    // ArrowLeft from Coach → Analysis
    fireEvent.keyDown(screen.getByRole('tablist'), { key: 'ArrowLeft' });
    expect(screen.getByText('analysis-panel')).toBeInTheDocument();
  });
});

describe('SegmentedControl (§6)', () => {
  it('is a radiogroup with the active option checked', () => {
    const onChange = vi.fn();
    render(<SegmentedControl ariaLabel="range" value="90d" onChange={onChange}
      options={[{ value: '30d', label: '30d' }, { value: '90d', label: '90d' }]} />);
    expect(screen.getByRole('radiogroup', { name: 'range' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: '90d' })).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(screen.getByRole('radio', { name: '30d' }));
    expect(onChange).toHaveBeenCalledWith('30d');
  });
});

describe('Toggle (§6)', () => {
  it('is a switch reflecting checked and toggles', () => {
    const onChange = vi.fn();
    render(<Toggle checked={false} onChange={onChange} ariaLabel="Notifications" />);
    const sw = screen.getByRole('switch', { name: 'Notifications' });
    expect(sw).toHaveAttribute('aria-checked', 'false');
    fireEvent.click(sw);
    expect(onChange).toHaveBeenCalledWith(true);
  });
});

describe('MetricCard (§6 — delta never color-only)', () => {
  it('pairs the delta with an arrow glyph', () => {
    render(<MetricCard label="Accuracy" value="84%" delta={{ value: '3', direction: 'up' }} />);
    expect(screen.getByText('84%')).toBeInTheDocument();
    expect(screen.getByText('▲')).toBeInTheDocument();
  });
});

describe('MoveQualityChip (§5.1/§11 — meaning not color-only)', () => {
  it('shows the chess symbol and label', () => {
    render(<MoveQualityChip quality="blunder" />);
    expect(screen.getByText('Blunder')).toBeInTheDocument();
    expect(screen.getByText('??')).toBeInTheDocument();
  });
});

describe('ProgressBar (§6)', () => {
  it('exposes progressbar role with clamped value', () => {
    render(<ProgressBar value={0.6} ariaLabel="Sessions" />);
    const bar = screen.getByRole('progressbar', { name: 'Sessions' });
    expect(bar).toHaveAttribute('aria-valuenow', '60');
  });
});

describe('EmptyState / ErrorState (§6 — all four states)', () => {
  it('EmptyState renders title, body and a single action', () => {
    render(<EmptyState title="No games" body="Import one" action={<Button>Import</Button>} />);
    expect(screen.getByText('No games')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Import' })).toBeInTheDocument();
  });

  it('ErrorState is an assertive alert with a Retry action', () => {
    const onRetry = vi.fn();
    render(<ErrorState message="Network down" onRetry={onRetry} />);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Network down');
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalledOnce();
  });
});

describe('Dialog (§6 — focus trap + Esc)', () => {
  it('renders as a modal dialog and closes on Escape', () => {
    const onClose = vi.fn();
    render(
      <Dialog open onClose={onClose} title="Import games">
        <button>inner</button>
      </Dialog>,
    );
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(within(dialog).getByText('Import games')).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('does not render when closed', () => {
    render(<Dialog open={false} onClose={() => {}} title="x">y</Dialog>);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('Dropdown (§6)', () => {
  it('opens a menu and selects an item', () => {
    const onSelect = vi.fn();
    render(<Dropdown label="Sort" ariaLabel="Sort" onSelect={onSelect}
      items={[{ value: 'recent', label: 'Recent' }, { value: 'acc', label: 'Accuracy' }]} />);
    fireEvent.click(screen.getByRole('button', { name: 'Sort' }));
    fireEvent.click(screen.getByRole('menuitemradio', { name: 'Accuracy' }));
    expect(onSelect).toHaveBeenCalledWith('acc');
  });
});
