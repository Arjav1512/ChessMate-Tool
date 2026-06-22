import type { AnalysisMoveVM } from './types';

function fmtEval(cp: number | null): string {
  if (cp == null) return '–';
  const v = cp / 100;
  return v > 0 ? `+${v.toFixed(1)}` : v.toFixed(1);
}

export interface LinesTabProps {
  move: AnalysisMoveVM | null;
  analyzing: boolean;
}

/**
 * Lines tab (§8): engine variations for users who want depth. This is where the
 * engine lives — keeping the default Analysis tab insight-first (§2). Lines are
 * sample/derived for v1; the real client-Stockfish MultiPV plugs in here.
 */
export function LinesTab({ move, analyzing }: LinesTabProps) {
  if (analyzing && (!move || move.evalCp == null)) {
    return <p className="iv-body-sm" style={{ color: 'var(--text-low)' }}>Engine is analyzing this position…</p>;
  }
  if (!move) {
    return <p className="iv-body-sm" style={{ color: 'var(--text-low)' }}>Step onto a move to see engine lines.</p>;
  }

  const lines = [
    { rank: 1, san: move.bestSan ?? move.san, evalCp: move.bestEvalCp ?? move.evalCp, pv: 'the principal variation' },
  ];

  return (
    <div className="iv-lines">
      {lines.map((l) => (
        <div key={l.rank} className="iv-lines__row">
          <span className="iv-lines__rank">{l.rank}</span>
          <span className="iv-lines__eval">{fmtEval(l.evalCp)}</span>
          <span className="iv-lines__pv">{l.san} — {l.pv}</span>
        </div>
      ))}
      <p className="iv-caption" style={{ color: 'var(--text-faint)', marginTop: 'var(--space-3)' }}>
        Engine: depth 18 · client Stockfish (sample lines for v1)
      </p>
    </div>
  );
}
