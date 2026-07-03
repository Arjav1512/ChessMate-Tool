import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { useState } from 'react';
import {
  Button, Input, Textarea, SearchInput, Card, MetricCard, Badge, Chip,
  MoveQualityChip, SegmentedControl, Tabs, TabPanel, Toggle, Dialog,
  ProgressBar, Avatar, EmptyState, ErrorState, Dropdown,
} from './index';
import { findA11yViolations } from '../../../test/axe';

/**
 * Accessibility smoke tests (Phase 3.5) for the Ivory primitives. Asserts no
 * axe violations (roles/names/ARIA) in jsdom; color-contrast is covered by the
 * Playwright a11y e2e in a real browser.
 */
function Sample() {
  const [seg, setSeg] = useState<'a' | 'b'>('a');
  const [tab, setTab] = useState<'one' | 'two'>('one');
  const [on, setOn] = useState(false);
  const [sort, setSort] = useState<'x' | 'y'>('x');
  return (
    <div>
      <Button>Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button loading aria-label="Saving">Save</Button>
      <Input label="Name" />
      <Input label="Email" error="Bad email" />
      <Textarea label="PGN" />
      <SearchInput aria-label="Search games" kbdHint="⌘K" />
      <Card><MetricCard label="Accuracy" value="84%" delta={{ value: '3', direction: 'up' }} /></Card>
      <Badge impact="high">High</Badge>
      <Chip dot>Endgame</Chip>
      <MoveQualityChip quality="blunder" san="Qxh7" />
      <SegmentedControl ariaLabel="Range" value={seg} onChange={setSeg} options={[{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }]} />
      <Tabs ariaLabel="Views" value={tab} onChange={setTab} tabs={[{ value: 'one', label: 'One' }, { value: 'two', label: 'Two' }]} />
      <TabPanel active={tab === 'one'}>one</TabPanel>
      <Toggle checked={on} onChange={setOn} ariaLabel="Notifications" />
      <ProgressBar value={0.6} ariaLabel="Sessions" />
      <Avatar name="Magnus Carlsen" />
      <Dropdown label="Sort" ariaLabel="Sort" value={sort} onSelect={setSort} items={[{ value: 'x', label: 'X' }, { value: 'y', label: 'Y' }]} />
      <EmptyState title="No games" body="Import one" action={<Button>Import</Button>} />
      <ErrorState message="Network down" onRetry={() => {}} />
    </div>
  );
}

describe('Ivory primitives — a11y smoke (§11)', () => {
  it('composed primitives have no axe violations', async () => {
    const { container } = render(<Sample />);
    expect(await findA11yViolations(container)).toEqual([]);
  });

  it('open Dialog is a labelled modal with no violations', async () => {
    const { container } = render(
      <Dialog open onClose={() => {}} title="Import games">
        <p>Body</p>
        <Button>Confirm</Button>
      </Dialog>,
    );
    expect(await findA11yViolations(container)).toEqual([]);
  });
});
