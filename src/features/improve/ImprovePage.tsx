import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, EmptyState, useIvToast } from '../../components/ui/iv';
import { useImproveData } from './hooks';
import {
  WeeklyFocusCard, SkillProfileCard, WeaknessProfile, StudyPlanCard, MilestonesCard,
} from './components';
import type { StudyItemVM } from '../../lib/improve/types';
import './improve.css';

/**
 * Improve Hub (System Design §9) — the differentiator. Insight→action: weekly
 * focus (one Primary), skill radar, weakness categories, study plan (ingesting
 * Send-to-Improve), and chess study goals. Behind `ui.screen.improve`.
 */
export function ImprovePage() {
  const { data } = useImproveData();
  const navigate = useNavigate();
  const { toast } = useIvToast();
  const h1Ref = useRef<HTMLHeadingElement>(null);
  useEffect(() => { h1Ref.current?.focus(); }, []);

  const focusCategory = data.categories.find((c) => c.weaknesses.some((w) => w.key === data.focus.weaknessKey))?.category
    ?? data.categories[0]?.category ?? 'tactical';

  const startItem = (item: StudyItemVM) => {
    if (item.type === 'coach_review') { navigate('/coach'); return; }
    toast(`Starting: ${item.title}`, 'info');
  };

  return (
    <div className="iv-improve iv-page-enter">
      <div className="iv-imp-header">
        <h1 ref={h1Ref} tabIndex={-1} className="iv-imp-header__title iv-h2" style={{ outline: 'none' }}>Your improvement plan</h1>
        <p className="iv-imp-header__prov iv-body-sm">Built from {data.analyzedGames} analyzed games · refreshes as you play.</p>
      </div>

      {!data.hasData ? (
        <EmptyState
          icon={<span style={{ fontSize: 26 }}>▲</span>}
          title="Analyze games to build your plan"
          body="Once you’ve analyzed a few games, ChessMate turns your recurring mistakes into a focused weekly plan."
          action={<Button onClick={() => navigate('/games/import')}>Import your first game</Button>}
        />
      ) : (
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
      )}
    </div>
  );
}
