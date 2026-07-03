import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/iv';

export interface PlaceholderPageProps {
  title: string;
  purpose: string;
}

/**
 * Branded "Coming soon" page for routes whose screen has not shipped yet
 * (Phase S1 — production-ized: no dev-facing "shell placeholder", route path,
 * or phase badge). Moves focus to the heading on mount so route changes are
 * announced (System Design §11 focus management).
 */
export function PlaceholderPage({ title, purpose }: PlaceholderPageProps) {
  const h1Ref = useRef<HTMLHeadingElement>(null);
  const navigate = useNavigate();
  useEffect(() => { h1Ref.current?.focus(); }, [title]);

  return (
    <div className="iv-page-enter" style={{ maxWidth: 'var(--content-max)', margin: '0 auto', padding: 'var(--space-8) var(--space-7)' }}>
      <h1 ref={h1Ref} tabIndex={-1} className="iv-h1" style={{ outline: 'none', color: 'var(--text-hi)' }}>
        {title}
      </h1>
      <p className="iv-body" style={{ color: 'var(--text-mid)', maxWidth: 560, marginTop: 'var(--space-2)' }}>
        {purpose}
      </p>
      <div
        style={{
          marginTop: 'var(--space-6)', padding: 'var(--space-7)', maxWidth: 560,
          display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 'var(--space-4)',
          background: 'var(--surface-card-grad)', border: '1px solid var(--border)',
          borderRadius: 'var(--r-lg)',
        }}
      >
        <span className="iv-label" style={{ color: 'var(--accent)' }}>Coming soon</span>
        <p className="iv-body-sm" style={{ color: 'var(--text-mid)', margin: 0 }}>
          We’re still building this part of ChessMate. In the meantime, keep improving from your dashboard.
        </p>
        <Button onClick={() => navigate('/dashboard')}>Back to dashboard →</Button>
      </div>
    </div>
  );
}
