import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Button, EmptyState, Skeleton } from '../../components/ui/iv';
import { useDashboardEmptyState } from './hooks';
import {
  ImprovementScoreCard, RatingTrendCard, BiggestWeaknessesCard, FocusCard,
  RecentGamesCard, CoachSummaryCard, RoadmapTimeline,
} from './cards';
import './dashboard.css';

function greetingFor(date = new Date()): string {
  const h = date.getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

/**
 * Dashboard (System Design §7) — the improvement command center. Insight-led,
 * one primary action ("Continue improving"), §7 hierarchy. Each card owns its
 * loading/error; the page owns the greeting + empty (onboarding) state.
 */
export function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const h1Ref = useRef<HTMLHeadingElement>(null);
  const empty = useDashboardEmptyState();

  // Route-change focus management (§11).
  useEffect(() => { h1Ref.current?.focus(); }, []);

  const email = user?.email ?? '';
  const name = (user?.user_metadata?.display_name as string | undefined) || email.split('@')[0] || 'there';

  return (
    <div className="dash iv-page-enter">
      <div className="dash-greeting">
        <div className="dash-greeting__text">
          <h1 ref={h1Ref} tabIndex={-1} className="iv-h1" style={{ outline: 'none', color: 'var(--text-hi)' }}>
            {greetingFor()}, {name}
          </h1>
          <p className="dash-greeting__sub iv-body-sm">Here’s where to put your time today.</p>
        </div>
        <div className="dash-greeting__actions">
          <Button variant="ghost" onClick={() => navigate('/games/import')}>Import games</Button>
          <Button onClick={() => navigate('/improve')}>Continue improving →</Button>
        </div>
      </div>

      {empty.isLoading ? (
        <Skeleton height={420} />
      ) : empty.data === false ? (
        // New user, 0 games — onboarding focus replaces the grid (§7 empty state).
        <EmptyState
          icon={<span style={{ fontSize: 26 }}>♟</span>}
          title="Import your first game to begin"
          body="ChessMate turns your own games into a personalized improvement plan. Paste a PGN or connect an account to get your first analysis."
          action={<Button onClick={() => navigate('/games/import')}>Import your first game</Button>}
        />
      ) : (
        <>
          <div className="dash-row dash-row--score">
            <ImprovementScoreCard />
            <RatingTrendCard />
          </div>
          <div className="dash-row dash-row--mid">
            <BiggestWeaknessesCard />
            <FocusCard />
          </div>
          <div className="dash-row dash-row--bottom">
            <RecentGamesCard />
            <div className="dash-rightstack dash-order-stack">
              <RoadmapTimeline />
              <CoachSummaryCard />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
