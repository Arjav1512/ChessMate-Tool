import { useNavigate } from 'react-router-dom';
import { Button, EmptyState, ErrorState, Skeleton } from '../../components/ui/iv';
import { useImproveData } from './hooks';
import {
  WeeklyFocusCard, SkillProfileCard, WeaknessProfile, StudyPlanCard, MilestonesCard,
} from './components';
import type { StudyItemVM } from '../../lib/improve/types';

/**
 * Improve · Plan view (System Design §9) — weekly focus (one Primary), skill
 * radar, weakness categories, study plan (ingesting Send-to-Improve), study goals.
 *
 * Every action here navigates to a real surface — Review Mistakes, deep-linked
 * to the relevant phase/motif — never a toast that goes nowhere. (Dead-end
 * toasts were the top "confusing pop-up" complaint in the launch review.)
 */

/** Weakness key (`phase:endgame`, `motif:hanging-piece`, …) → the Review
 *  Mistakes deep-link that practices it. Unknown kinds land unfiltered. */
function mistakesPathFor(weaknessKey: string): string {
  const [kind, value] = weaknessKey.split(':', 2);
  if (kind === 'phase' && value) return `/improve/mistakes?phase=${encodeURIComponent(value)}`;
  if (kind === 'motif' && value) return `/improve/mistakes?motif=${encodeURIComponent(value)}`;
  return '/improve/mistakes';
}

export function ImprovePlanView() {
  const { data, isLoading, error } = useImproveData();
  const navigate = useNavigate();

  const focusCategory = data.categories.find((c) => c.weaknesses.some((w) => w.key === data.focus.weaknessKey))?.category
    ?? data.categories[0]?.category ?? 'tactical';

  const startItem = (item: StudyItemVM) => {
    // Items sent from Analysis appear in the Review Mistakes feed ("From analysis").
    if (item.source === 'send-to-improve') { navigate('/improve/mistakes'); return; }
    navigate(mistakesPathFor(item.weaknessKey));
  };

  if (isLoading) {
    return (
      <div aria-busy="true" aria-label="Loading your improvement plan">
        <div className="iv-imp-row iv-imp-row--top">
          <Skeleton height={280} />
          <Skeleton height={280} />
        </div>
        <div style={{ height: 16 }} />
        <Skeleton height={220} />
      </div>
    );
  }

  if (error) {
    return (
      <ErrorState
        message="We couldn’t load your improvement plan. Check your connection and try again."
        onRetry={() => navigate(0)}
      />
    );
  }

  if (!data.hasData) {
    return (
      <EmptyState
        icon={<span style={{ fontSize: 26 }}>▲</span>}
        title="Analyze games to build your plan"
        body="Once you’ve analyzed a few games, ChessMate turns your recurring mistakes into a focused weekly plan."
        action={<Button onClick={() => navigate('/games/import')}>Import your first game</Button>}
      />
    );
  }

  return (
    <>
      <div className="iv-imp-row iv-imp-row--top">
        <WeeklyFocusCard focus={data.focus} onStart={() => navigate(mistakesPathFor(data.focus.weaknessKey))} />
        <SkillProfileCard skills={data.skills} />
      </div>

      <WeaknessProfile
        categories={data.categories}
        focusCategory={focusCategory}
        onWeakness={(key) => navigate(mistakesPathFor(key))}
      />

      {/* Phase 8A: Study Goals folded under the Study Plan as one "Plan &
          progress" region (no longer two ordered lists competing side-by-side). */}
      <div className="iv-imp-planprogress">
        <StudyPlanCard plan={data.plan} onStart={startItem} />
        <MilestonesCard milestones={data.milestones} />
      </div>
    </>
  );
}
