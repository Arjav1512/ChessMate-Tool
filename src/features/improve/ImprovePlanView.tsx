import { useNavigate } from 'react-router-dom';
import { Button, EmptyState, useIvToast } from '../../components/ui/iv';
import { useImproveData } from './hooks';
import {
  WeeklyFocusCard, SkillProfileCard, WeaknessProfile, StudyPlanCard, MilestonesCard,
} from './components';
import type { StudyItemVM } from '../../lib/improve/types';

/**
 * Improve · Plan view (System Design §9) — weekly focus (one Primary), skill
 * radar, weakness categories, study plan (ingesting Send-to-Improve), study goals.
 * Study-plan replay items deep-link to Review Mistakes (the loop).
 */
export function ImprovePlanView() {
  const { data } = useImproveData();
  const navigate = useNavigate();
  const { toast } = useIvToast();

  const focusCategory = data.categories.find((c) => c.weaknesses.some((w) => w.key === data.focus.weaknessKey))?.category
    ?? data.categories[0]?.category ?? 'tactical';

  const startItem = (item: StudyItemVM) => {
    if (item.type === 'coach_review') { navigate('/coach'); return; }
    if (item.type === 'replay') { navigate('/improve/mistakes'); return; }
    toast(`Starting: ${item.title}`, 'info');
  };

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
        <WeeklyFocusCard focus={data.focus} onStart={() => toast(`Starting session ${data.focus.nextSessionN}: ${data.focus.title}`, 'info')} />
        <SkillProfileCard skills={data.skills} />
      </div>

      <WeaknessProfile
        categories={data.categories}
        focusCategory={focusCategory}
        onWeakness={(key) => {
          const w = data.categories.flatMap((c) => c.weaknesses).find((x) => x.key === key);
          if (w) toast(`${w.recommendation}`, 'info');
        }}
      />

      <div className="iv-imp-row iv-imp-row--bottom">
        <StudyPlanCard plan={data.plan} onStart={startItem} />
        <MilestonesCard milestones={data.milestones} />
      </div>
    </>
  );
}
