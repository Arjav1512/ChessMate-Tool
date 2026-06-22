import { useEffect, useRef } from 'react';
import { Badge } from '../components/ui/iv';

export interface PlaceholderPageProps {
  title: string;
  purpose: string;
  phase: number;
  path: string;
}

/**
 * Empty shell placeholder (Phase 3). Every new route renders this until its
 * feature phase replaces it. Moves focus to the heading on mount so route
 * changes are announced (System Design §11 focus management).
 */
export function PlaceholderPage({ title, purpose, phase, path }: PlaceholderPageProps) {
  const h1Ref = useRef<HTMLHeadingElement>(null);
  useEffect(() => { h1Ref.current?.focus(); }, [title]);

  return (
    <div className="iv-page-enter" style={{ maxWidth: 'var(--content-max)', margin: '0 auto', padding: 'var(--space-8) var(--space-7)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
        <h1 ref={h1Ref} tabIndex={-1} className="iv-h1" style={{ outline: 'none', color: 'var(--text-hi)' }}>
          {title}
        </h1>
        <Badge impact="medium">Phase {phase}</Badge>
      </div>
      <p className="iv-body" style={{ color: 'var(--text-mid)', maxWidth: 560 }}>
        {purpose}
      </p>
      <div
        style={{
          marginTop: 'var(--space-6)', padding: 'var(--space-6)', textAlign: 'center',
          background: 'var(--surface-card-grad)', border: '1px dashed var(--border-strong)',
          borderRadius: 'var(--r-lg)', color: 'var(--text-low)',
        }}
      >
        <div style={{ fontSize: 13 }}>This screen is a shell placeholder.</div>
        <code style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-faint)' }}>{path}</code>
      </div>
    </div>
  );
}
