/**
 * Ivory component gallery — Phase 2 visual checkpoint.
 * Reachable at `?components` (App.tsx guard). Showcases every primitive in its
 * states across theme/accent so reviewers can verify before screen work begins.
 * QA/dev artifact only; not a product screen.
 */
import { useState } from 'react';
import {
  Button, Input, Textarea, SearchInput, Card, MetricCard, Badge, Chip,
  MoveQualityChip, SegmentedControl, Tabs, TabPanel, Dropdown, Toggle, Dialog,
  IvToastProvider, useIvToast, ProgressBar, Avatar, Skeleton, EmptyState, ErrorState,
  type MoveQuality,
} from './index';

type Theme = 'dark' | 'light';
type Accent = 'ivory' | 'periwinkle' | 'sage' | 'clay';

const MQS: MoveQuality[] = ['brilliant', 'best', 'good', 'inaccuracy', 'mistake', 'blunder'];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 'var(--space-8)' }}>
      <div style={{ font: '600 11px var(--font-sans)', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-low)', marginBottom: 'var(--space-4)' }}>{title}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-4)', alignItems: 'flex-start' }}>{children}</div>
    </section>
  );
}

function GalleryInner() {
  const { toast } = useIvToast();
  const [seg, setSeg] = useState<'30d' | '90d' | '1y'>('90d');
  const [tab, setTab] = useState<'analysis' | 'coach' | 'lines'>('analysis');
  const [sort, setSort] = useState<'recent' | 'accuracy'>('recent');
  const [on, setOn] = useState(true);
  const [dialog, setDialog] = useState(false);
  const [sheet, setSheet] = useState(false);

  return (
    <>
      <Section title="Buttons (rest / hover / disabled / loading)">
        <Button>Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="accent-bright">Accent bright</Button>
        <Button size="sm">Small</Button>
        <Button disabled>Disabled</Button>
        <Button loading>Loading</Button>
        <Button onClick={() => toast('Imported 12 games', 'success')}>Fire toast</Button>
      </Section>

      <Section title="Inputs">
        <div style={{ width: 240 }}><Input label="Display name" placeholder="Magnus" /></div>
        <div style={{ width: 240 }}><Input label="Email" error="That email looks off" defaultValue="bad@" /></div>
        <div style={{ width: 240 }}><SearchInput placeholder="Search games" kbdHint="⌘K" /></div>
        <div style={{ width: 300 }}><Textarea label="Paste PGN" placeholder="[Event …]" /></div>
      </Section>

      <Section title="Cards">
        <Card style={{ width: 220 }}><div style={{ color: 'var(--text-hi)', font: 'var(--fw-h3) var(--fs-h3) var(--font-sans)' }}>Standard</div><p style={{ color: 'var(--text-mid)', fontSize: 13 }}>Surface card grad.</p></Card>
        <Card variant="hero" style={{ width: 260 }}><div style={{ color: 'var(--text-hi)', font: 'var(--fw-h3) var(--fs-h3) var(--font-sans)' }}>Hero + halo</div><p style={{ color: 'var(--text-mid)', fontSize: 13 }}>Recommended this week.</p></Card>
        <Card variant="category" accentColor="var(--error)" style={{ width: 220 }}><div style={{ color: 'var(--text-hi)', font: 'var(--fw-h3) var(--fs-h3) var(--font-sans)' }}>Category</div><p style={{ color: 'var(--text-mid)', fontSize: 13 }}>High-impact tint.</p></Card>
        <Card clickable onClick={() => toast('Card clicked')} style={{ width: 220 }}><div style={{ color: 'var(--text-hi)' }}>Clickable card →</div></Card>
      </Section>

      <Section title="Metric cards">
        <Card style={{ width: 180 }}><MetricCard label="Accuracy" value="84%" delta={{ value: '3.2', direction: 'up' }} sublabel="last game" /></Card>
        <Card style={{ width: 180 }}><MetricCard label="Rating" value="1487" delta={{ value: '63', direction: 'up' }} sublabel="peak 1502" /></Card>
        <Card style={{ width: 180 }}><MetricCard label="Blunders" value="7" delta={{ value: '2', direction: 'down' }} /></Card>
      </Section>

      <Section title="Badges & chips">
        <Badge impact="high">High</Badge>
        <Badge impact="medium">Medium</Badge>
        <Badge impact="low">Low</Badge>
        <Chip dot>Endgame</Chip>
        {MQS.map((q) => <MoveQualityChip key={q} quality={q} />)}
        <MoveQualityChip quality="blunder" san="Qxh7" emphasis />
      </Section>

      <Section title="Segmented control / tabs / dropdown / toggle">
        <SegmentedControl ariaLabel="Chart range" value={seg} onChange={setSeg} options={[{ value: '30d', label: '30d' }, { value: '90d', label: '90d' }, { value: '1y', label: '1y' }]} />
        <Dropdown label={`Sort: ${sort}`} ariaLabel="Sort games" value={sort} onSelect={setSort} items={[{ value: 'recent', label: 'Most recent' }, { value: 'accuracy', label: 'Accuracy' }]} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Toggle checked={on} onChange={setOn} ariaLabel="Notifications" /><span style={{ color: 'var(--text-mid)', fontSize: 13 }}>Notifications</span></div>
      </Section>

      <Section title="Tabs (Analysis default · Coach never auto-opens)">
        <div style={{ width: '100%', maxWidth: 480 }}>
          <Tabs ariaLabel="Analysis views" value={tab} onChange={setTab} tabs={[{ value: 'analysis', label: 'Analysis' }, { value: 'coach', label: 'Coach' }, { value: 'lines', label: 'Lines' }]} />
          <div style={{ paddingTop: 12, color: 'var(--text-mid)', fontSize: 13 }}>
            <TabPanel active={tab === 'analysis'}>Insight card content (default).</TabPanel>
            <TabPanel active={tab === 'coach'}>Coach guidance (peer).</TabPanel>
            <TabPanel active={tab === 'lines'}>Engine variations.</TabPanel>
          </div>
        </div>
      </Section>

      <Section title="Progress / avatar / spinner / skeleton">
        <div style={{ width: 200 }}><ProgressBar value={0.6} ariaLabel="Sessions 3 of 5" /></div>
        <div style={{ width: 200 }}><ProgressBar value={0.85} variant="success" glow ariaLabel="Endgame accuracy" /></div>
        <Avatar name="Magnus Carlsen" />
        <Avatar name="You" size={44} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: 200 }}><Skeleton height={20} /><Skeleton width="70%" /></div>
      </Section>

      <Section title="Empty / error states">
        <Card style={{ width: 320 }}><EmptyState title="No games yet" body="Import your first PGN to start analyzing." action={<Button onClick={() => toast('Import')}>Import your first game</Button>} /></Card>
        <Card style={{ width: 320 }}><ErrorState message="Couldn't load your weaknesses. Check your connection." onRetry={() => toast('Retrying', 'info')} /></Card>
      </Section>

      <Section title="Dialog / sheet">
        <Button variant="secondary" onClick={() => setDialog(true)}>Open dialog</Button>
        <Button variant="secondary" onClick={() => setSheet(true)}>Open sheet</Button>
        <Dialog open={dialog} onClose={() => setDialog(false)} title="Import games">
          <p style={{ color: 'var(--text-mid)', fontSize: 14 }}>Focus is trapped here. Esc or scrim closes.</p>
          <div style={{ marginTop: 16, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button variant="ghost" onClick={() => setDialog(false)}>Cancel</Button>
            <Button onClick={() => setDialog(false)}>Confirm</Button>
          </div>
        </Dialog>
        <Dialog open={sheet} onClose={() => setSheet(false)} sheet ariaLabel="Mobile sheet">
          <p style={{ color: 'var(--text-mid)', fontSize: 14 }}>Bottom sheet variant for mobile.</p>
        </Dialog>
      </Section>
    </>
  );
}

export function Gallery() {
  const [theme, setTheme] = useState<Theme>('dark');
  const [accent, setAccent] = useState<Accent>('ivory');

  return (
    <IvToastProvider>
      <div
        data-theme={theme}
        data-accent={accent}
        ref={(el) => { if (el) { document.documentElement.setAttribute('data-theme', theme); document.documentElement.setAttribute('data-accent', accent); } }}
        style={{ minHeight: '100vh', background: 'var(--bg-grad), var(--bg)', color: 'var(--text-body)', fontFamily: 'var(--font-sans)', padding: 'var(--space-8)' }}
      >
        <div style={{ maxWidth: 'var(--content-max)', margin: '0 auto' }}>
          <h1 style={{ font: 'var(--fw-h1) var(--fs-h1) var(--font-sans)', color: 'var(--text-hi)', letterSpacing: 'var(--tr-h1)', marginBottom: 'var(--space-2)' }}>Ivory Component Gallery</h1>
          <p style={{ color: 'var(--text-mid)', fontSize: 14, marginBottom: 'var(--space-6)' }}>Phase 2 — every §6 primitive, in its states. Flip theme/accent to verify recoloring.</p>
          <div style={{ display: 'flex', gap: 'var(--space-5)', marginBottom: 'var(--space-8)' }}>
            <SegmentedControl ariaLabel="Theme" value={theme} onChange={setTheme} options={[{ value: 'dark', label: 'Dark' }, { value: 'light', label: 'Light' }]} />
            <SegmentedControl ariaLabel="Accent" value={accent} onChange={setAccent} options={[{ value: 'ivory', label: 'Ivory' }, { value: 'periwinkle', label: 'Periwinkle' }, { value: 'sage', label: 'Sage' }, { value: 'clay', label: 'Clay' }]} />
          </div>
          <GalleryInner />
        </div>
      </div>
    </IvToastProvider>
  );
}
