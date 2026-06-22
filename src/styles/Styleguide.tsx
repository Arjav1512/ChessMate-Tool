/**
 * Ivory token styleguide — Phase 1 verification surface.
 *
 * Reachable at `?styleguide` (see App.tsx guard). It renders the approved token
 * system (System Design §5) and lets you flip theme / accent / board / density
 * to confirm everything recolors live with no reload. This is a QA/dev artifact,
 * not a product screen; it consumes only Ivory tokens from tokens.css.
 */
import { useState } from 'react';

type Theme = 'dark' | 'light';
type Accent = 'ivory' | 'periwinkle' | 'sage' | 'clay';
type Board = 'wood' | 'slate' | 'tournament';
type Density = 'cozy' | 'comfortable' | 'spacious';

const MQ: Array<[string, string, string]> = [
  ['Brilliant', '!!', 'var(--mq-brilliant)'],
  ['Best', '!', 'var(--mq-best)'],
  ['Good', '', 'var(--mq-good)'],
  ['Inaccuracy', '?!', 'var(--mq-inaccuracy)'],
  ['Mistake', '?', 'var(--mq-mistake)'],
  ['Blunder', '??', 'var(--mq-blunder)'],
];

const SURFACES: Array<[string, string]> = [
  ['--bg', 'var(--bg)'],
  ['--surface-1', 'var(--surface-1)'],
  ['--surface-2', 'var(--surface-2)'],
  ['--surface-3', 'var(--surface-3)'],
  ['--surface-elev', 'var(--surface-elev)'],
];

const TEXTS: Array<[string, string]> = [
  ['--text-hi', 'var(--text-hi)'],
  ['--text-body', 'var(--text-body)'],
  ['--text-mid', 'var(--text-mid)'],
  ['--text-low', 'var(--text-low)'],
  ['--text-faint', 'var(--text-faint)'],
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 'var(--space-8)' }}>
      <div
        style={{
          font: `var(--fw-label) var(--fs-label)/var(--lh-label) var(--font-sans)`,
          letterSpacing: 'var(--tr-label)',
          textTransform: 'uppercase',
          color: 'var(--text-low)',
          marginBottom: 'var(--space-4)',
        }}
      >
        {title}
      </div>
      {children}
    </section>
  );
}

function Swatch({ name, color, ring }: { name: string; color: string; ring?: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
      <div
        style={{
          width: 96,
          height: 56,
          background: color,
          borderRadius: 'var(--r-md)',
          border: ring ? '1px solid var(--border-strong)' : '1px solid var(--border)',
        }}
      />
      <code style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-faint)' }}>{name}</code>
    </div>
  );
}

function Toggle<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly T[];
  onChange: (v: T) => void;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
      <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--text-mid)', minWidth: 64 }}>{label}</span>
      <div
        style={{
          display: 'inline-flex',
          background: 'var(--surface-2)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--r-sm)',
          padding: 2,
          gap: 2,
        }}
      >
        {options.map((opt) => {
          const active = opt === value;
          return (
            <button
              key={opt}
              onClick={() => onChange(opt)}
              style={{
                font: `600 12px var(--font-sans)`,
                padding: '5px 12px',
                borderRadius: 'var(--r-xs)',
                border: 'none',
                cursor: 'pointer',
                background: active ? 'var(--accent)' : 'transparent',
                color: active ? 'var(--on-accent)' : 'var(--text-mid)',
                transition: 'all var(--dur-standard) var(--ease-standard)',
              }}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function Styleguide() {
  const [theme, setTheme] = useState<Theme>('dark');
  const [accent, setAccent] = useState<Accent>('ivory');
  const [board, setBoard] = useState<Board>('wood');
  const [density, setDensity] = useState<Density>('comfortable');

  const apply = (attr: string, value: string) => document.documentElement.setAttribute(attr, value);

  return (
    <div
      data-theme={theme}
      data-accent={accent}
      data-board={board}
      data-density={density}
      style={{
        minHeight: '100vh',
        background: 'var(--bg-grad), var(--bg)',
        color: 'var(--text-body)',
        fontFamily: 'var(--font-sans)',
        padding: 'var(--space-8)',
      }}
      ref={(el) => {
        // Mirror onto <html> so any token consumers outside this subtree also flip.
        if (el) {
          apply('data-theme', theme);
          apply('data-accent', accent);
          apply('data-board', board);
          apply('data-density', density);
        }
      }}
    >
      <div style={{ maxWidth: 'var(--content-max)', margin: '0 auto' }}>
        <h1
          className="iv-headline-grad"
          style={{ font: `var(--fw-display) var(--fs-display)/var(--lh-display) var(--font-sans)`, letterSpacing: 'var(--tr-display)', marginBottom: 'var(--space-2)' }}
        >
          ChessMate — Ivory Styleguide
        </h1>
        <p style={{ color: 'var(--text-mid)', font: `var(--fw-body) var(--fs-body)/var(--lh-body) var(--font-sans)`, marginBottom: 'var(--space-8)' }}>
          Phase 1 token verification. Flip the controls — everything recolors live.
        </p>

        <Section title="Theme tweaks (§5.10)">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-5)' }}>
            <Toggle label="Theme" value={theme} options={['dark', 'light'] as const} onChange={setTheme} />
            <Toggle label="Accent" value={accent} options={['ivory', 'periwinkle', 'sage', 'clay'] as const} onChange={setAccent} />
            <Toggle label="Board" value={board} options={['wood', 'slate', 'tournament'] as const} onChange={setBoard} />
            <Toggle label="Density" value={density} options={['cozy', 'comfortable', 'spacious'] as const} onChange={setDensity} />
          </div>
        </Section>

        <Section title="Surfaces (§5.1)">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
            {SURFACES.map(([n, c]) => <Swatch key={n} name={n} color={c} />)}
          </div>
        </Section>

        <Section title="Accent (§5.1 / §5.10)">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-4)', alignItems: 'flex-end' }}>
            <Swatch name="--accent" color="var(--accent)" ring />
            <Swatch name="--accent-bright" color="var(--accent-bright)" ring />
            <Swatch name="--accent-grad" color="var(--accent-grad)" ring />
            <button
              style={{
                background: 'var(--accent-grad)',
                color: 'var(--on-accent)',
                border: 'none',
                borderRadius: 'var(--r-md)',
                padding: '11px 18px',
                font: `600 14px var(--font-sans)`,
                boxShadow: 'var(--shadow-accent)',
                cursor: 'pointer',
              }}
            >
              Primary button →
            </button>
          </div>
        </Section>

        <Section title="Text (§5.1)">
          {TEXTS.map(([n, c]) => (
            <div key={n} style={{ color: c, font: `var(--fw-body) var(--fs-body)/1.8 var(--font-sans)` }}>
              {n} — The quick brown fox jumps over the lazy bishop. <span style={{ fontFamily: 'var(--font-mono)' }}>1487 · +0.6 · Nf3</span>
            </div>
          ))}
        </Section>

        <Section title="Move quality (§5.1)">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
            {MQ.map(([label, sym, color]) => (
              <span
                key={label}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  color,
                  background: `color-mix(in srgb, ${color} 11%, transparent)`,
                  border: `1px solid color-mix(in srgb, ${color} 30%, transparent)`,
                  borderRadius: 'var(--r-xs)',
                  padding: '5px 10px',
                  font: `600 12px var(--font-sans)`,
                }}
              >
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: color }} />
                {label} {sym && <code style={{ fontFamily: 'var(--font-mono)' }}>{sym}</code>}
              </span>
            ))}
          </div>
        </Section>

        <Section title="Cards & elevation (§5.6)">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
            <div style={{ width: 240, background: 'var(--surface-card-grad)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', boxShadow: 'var(--shadow-card)', padding: 'var(--space-5)' }}>
              <div style={{ font: `var(--fw-h3) var(--fs-h3)/var(--lh-h3) var(--font-sans)`, color: 'var(--text-hi)' }}>Standard card</div>
              <div style={{ color: 'var(--text-mid)', fontSize: 13, marginTop: 6 }}>--shadow-card</div>
            </div>
            <div style={{ width: 240, position: 'relative', overflow: 'hidden', background: 'var(--surface-card-grad)', border: '1px solid rgba(235,217,184,0.21)', borderRadius: 'var(--r-xl)', boxShadow: 'var(--shadow-hero)', padding: 'var(--space-5)' }}>
              <div className="iv-halo" style={{ inset: '-40% -20% auto auto', width: 200, height: 200 }} />
              <div style={{ position: 'relative', font: `var(--fw-h3) var(--fs-h3)/var(--lh-h3) var(--font-sans)`, color: 'var(--text-hi)' }}>Hero card</div>
              <div style={{ position: 'relative', color: 'var(--text-mid)', fontSize: 13, marginTop: 6 }}>--shadow-hero + halo</div>
            </div>
          </div>
        </Section>

        <Section title="Board (§5.1 / §5.10)">
          <div style={{ display: 'inline-grid', gridTemplateColumns: 'repeat(8, 36px)', borderRadius: 'var(--r-md)', overflow: 'hidden', boxShadow: 'var(--board-shadow)' }}>
            {Array.from({ length: 64 }).map((_, i) => {
              const dark = (Math.floor(i / 8) + i) % 2 === 1;
              return <div key={i} style={{ width: 36, height: 36, background: dark ? 'var(--board-dark)' : 'var(--board-light)' }} />;
            })}
          </div>
        </Section>

        <Section title="Radii (§5.5)">
          <div style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'flex-end' }}>
            {(['xs', 'sm', 'md', 'lg', 'xl'] as const).map((r) => (
              <div key={r} style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
                <div style={{ width: 64, height: 64, background: 'var(--surface-3)', border: '1px solid var(--border)', borderRadius: `var(--r-${r})` }} />
                <code style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-faint)' }}>--r-{r}</code>
              </div>
            ))}
          </div>
        </Section>
      </div>
    </div>
  );
}
