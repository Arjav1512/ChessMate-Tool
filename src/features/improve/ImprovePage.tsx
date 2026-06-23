import { useEffect, useRef } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { SegmentedControl } from '../../components/ui/iv';
import { useImproveData } from './hooks';
import { useReviewMistakes } from './mistakes/useReviewMistakes';
import './improve.css';

type ImproveView = 'plan' | 'mistakes';

/**
 * Improve Hub shell (System Design §9). A two-view hub — "Plan" (the §9 hub) and
 * "Review mistakes" (the B-4 mistake feed) — switched in the header. No new
 * top-level nav; both views live under `/improve` (flag `ui.screen.improve`).
 */
export function ImprovePage() {
  const { data } = useImproveData();
  const { feed } = useReviewMistakes();
  const navigate = useNavigate();
  const location = useLocation();
  const h1Ref = useRef<HTMLHeadingElement>(null);
  useEffect(() => { h1Ref.current?.focus(); }, []);

  const view: ImproveView = location.pathname.replace(/\/+$/, '').endsWith('/mistakes') ? 'mistakes' : 'plan';

  return (
    <div className="iv-improve iv-page-enter">
      <div className="iv-imp-header">
        <h1 ref={h1Ref} tabIndex={-1} className="iv-imp-header__title iv-h2" style={{ outline: 'none' }}>Your improvement plan</h1>
        <p className="iv-imp-header__prov iv-body-sm">Built from {data.analyzedGames} analyzed games · refreshes as you play.</p>
        <div className="iv-imp-viewswitch">
          <SegmentedControl
            ariaLabel="Improve view"
            value={view}
            onChange={(v) => navigate(v === 'mistakes' ? '/improve/mistakes' : '/improve')}
            options={[
              { value: 'plan', label: 'Plan' },
              { value: 'mistakes', label: `Review mistakes · ${feed.length}` },
            ]}
          />
        </div>
      </div>
      <Outlet />
    </div>
  );
}
