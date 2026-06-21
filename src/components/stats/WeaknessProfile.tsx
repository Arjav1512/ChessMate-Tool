import { Target, BookOpen, AlertTriangle, Clock, Repeat, Crosshair, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import type { Weakness, WeaknessProfile as Profile, WeaknessCategory, Confidence, Trend, PhaseStrength } from '../../lib/weaknessProfile';
import type { Phase } from '../../lib/moveAnalysis';

const PHASE_ORDER: Phase[] = ['opening', 'middlegame', 'endgame'];
const PHASE_TITLE: Record<Phase, string> = { opening: 'Opening', middlegame: 'Middlegame', endgame: 'Endgame' };

// Strength: higher = stronger, so colour inverts the weakness scale.
function strengthColor(s: number): string {
  if (s >= 70) return 'var(--cm-success)';
  if (s >= 55) return 'var(--cm-warning)';
  return 'var(--cm-error-bright)';
}

function PhaseStrengths({ strengths, moveCount }: { strengths: Partial<Record<Phase, PhaseStrength>>; moveCount: number }) {
  if (moveCount === 0) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <h4 style={{ fontSize: '12px', fontWeight: 600, color: 'var(--cm-text-secondary)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
        Phase strength
      </h4>
      {PHASE_ORDER.map((phase) => {
        const ps = strengths[phase];
        return (
          <div key={phase} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '12px', color: 'var(--cm-text-primary)', width: '88px', flexShrink: 0 }}>{PHASE_TITLE[phase]}</span>
            {ps ? (
              <>
                <div
                  role="meter"
                  aria-valuenow={ps.strength}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${PHASE_TITLE[phase]} strength ${ps.strength} of 100`}
                  style={{ flex: 1, height: '6px', borderRadius: '3px', background: 'var(--cm-bg-active)', overflow: 'hidden' }}
                >
                  <div style={{ width: `${ps.strength}%`, height: '100%', background: strengthColor(ps.strength) }} />
                </div>
                <span style={{ fontSize: '12px', fontWeight: 600, color: strengthColor(ps.strength), width: '34px', textAlign: 'right' }}>{ps.strength}%</span>
                <span style={{ fontSize: '10.5px', color: 'var(--cm-text-muted)', width: '92px', textAlign: 'right' }}>
                  {ps.moves} moves · {ps.confidence}
                </span>
              </>
            ) : (
              <span style={{ flex: 1, fontSize: '11.5px', color: 'var(--cm-text-muted)' }}>Not enough analyzed moves yet</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

const CATEGORY_ICON: Record<WeaknessCategory, React.ReactNode> = {
  opening: <BookOpen size={15} />,
  recurring: <Repeat size={15} />,
  phase: <Clock size={15} />,
  color: <Target size={15} />,
  motif: <Crosshair size={15} />,
};

const CONFIDENCE_LABEL: Record<Confidence, string> = { low: 'Low confidence', medium: 'Medium confidence', high: 'High confidence' };

function severityColor(s: number): string {
  if (s >= 66) return 'var(--cm-error-bright)';
  if (s >= 40) return 'var(--cm-warning)';
  return 'var(--cm-accent-bright)';
}

// Trend of a *weakness*: improving = getting better (good), worsening = getting worse (bad).
function TrendTag({ trend }: { trend: Trend }) {
  if (trend === 'unknown') return null;
  const map = {
    improving: { icon: <TrendingUp size={12} />, label: 'Improving', color: 'var(--cm-success)' },
    worsening: { icon: <TrendingDown size={12} />, label: 'Worsening', color: 'var(--cm-error-bright)' },
    stable: { icon: <Minus size={12} />, label: 'Stable', color: 'var(--cm-text-muted)' },
  }[trend];
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: map.color }}>
      {map.icon} {map.label}
    </span>
  );
}

function WeaknessCard({ w, onSelect }: { w: Weakness; onSelect?: (w: Weakness) => void }) {
  // Phase + motif weaknesses map cleanly to a mistake-review filter.
  const clickable = !!onSelect && (w.category === 'phase' || w.category === 'motif');
  return (
    <div
      onClick={clickable ? () => onSelect!(w) : undefined}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={clickable ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect!(w); } } : undefined}
      title={clickable ? 'Show the related mistakes' : undefined}
      style={{
        background: 'var(--cm-bg-elevated)',
        border: '1px solid var(--cm-border-subtle)',
        borderRadius: '10px',
        padding: '14px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        cursor: clickable ? 'pointer' : undefined,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ color: severityColor(w.severity), display: 'flex' }}>{CATEGORY_ICON[w.category]}</span>
        <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--cm-text-primary)', flex: 1 }}>{w.title}</span>
        <TrendTag trend={w.trend} />
      </div>

      {/* Severity bar */}
      <div
        role="meter"
        aria-valuenow={w.severity}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Weakness severity ${w.severity} of 100`}
        style={{ height: '6px', borderRadius: '3px', background: 'var(--cm-bg-active)', overflow: 'hidden' }}
      >
        <div style={{ width: `${w.severity}%`, height: '100%', background: severityColor(w.severity) }} />
      </div>

      <p style={{ fontSize: '12.5px', color: 'var(--cm-text-secondary)', lineHeight: 1.5, margin: 0 }}>{w.detail}</p>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <span style={{
          fontSize: '10.5px', fontWeight: 600, letterSpacing: '0.3px', textTransform: 'uppercase',
          color: 'var(--cm-text-muted)', background: 'var(--cm-bg-surface)',
          border: '1px solid var(--cm-border-subtle)', borderRadius: '999px', padding: '2px 8px',
        }}>
          {CONFIDENCE_LABEL[w.confidence]} · {w.sampleSize} games
        </span>
      </div>

      {w.evidence.length > 0 && (
        <ul style={{ margin: '2px 0 0', paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {w.evidence.map((e, i) => (
            <li key={i} style={{ fontSize: '11.5px', color: 'var(--cm-text-muted)', lineHeight: 1.45 }}>{e}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function WeaknessProfile({ profile, loading, error, onSelect }: {
  profile: Profile | null;
  loading: boolean;
  error: string | null;
  /** Click a phase/motif weakness to filter the mistake-review feed. */
  onSelect?: (w: Weakness) => void;
}) {
  return (
    <section aria-labelledby="weakness-heading" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div>
        <h3 id="weakness-heading" style={{ fontSize: '15px', fontWeight: 600, color: 'var(--cm-text-primary)', margin: 0 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '7px' }}>
            <AlertTriangle size={15} style={{ color: 'var(--cm-accent-bright)' }} /> Your weaknesses
          </span>
        </h3>
        <p style={{ fontSize: '12px', color: 'var(--cm-text-muted)', margin: '3px 0 0' }}>
          Patterns found across your imported games — the things to work on first.
        </p>
      </div>

      {!loading && !error && profile && (
        <PhaseStrengths strengths={profile.phaseStrengths} moveCount={profile.phaseMoveCount} />
      )}

      {loading && <p style={{ fontSize: '13px', color: 'var(--cm-text-secondary)' }}>Analyzing your games…</p>}

      {error && <p role="alert" style={{ fontSize: '13px', color: 'var(--cm-error-bright)' }}>{error}</p>}

      {!loading && !error && profile && profile.weaknesses.length === 0 && (
        <div style={{
          background: 'var(--cm-bg-elevated)', border: '1px solid var(--cm-border-subtle)',
          borderRadius: '10px', padding: '16px', fontSize: '13px', color: 'var(--cm-text-secondary)', lineHeight: 1.5,
        }}>
          No clear weaknesses yet. {profile.decidedGames < 3 || profile.analyzedGames < 3
            ? 'Import and analyze a few more games (3+) and patterns will surface here.'
            : 'Your results are balanced across openings and colors — keep analyzing to refine this.'}
        </div>
      )}

      {!loading && !error && profile && profile.weaknesses.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {profile.weaknesses.map((w) => <WeaknessCard key={w.id} w={w} onSelect={onSelect} />)}
        </div>
      )}
    </section>
  );
}
