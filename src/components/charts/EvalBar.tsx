/**
 * Evaluation bar (System Design §6 Charts, §8): vertical rail, white fill from
 * the bottom = White's advantage, mono numeric eval label above. Conventional
 * orientation — never reinvented (§14.6). Indeterminate (striped, no fill)
 * while analysis is still running for the current ply.
 */
export interface EvalBarProps {
  /** Centipawns from White's POV (+ = White better). Null = unknown. */
  evalCp?: number | null;
  /** Mate-in-N from White's POV (+N White mates, -N Black mates). */
  mate?: number | null;
  /** True while the engine hasn't returned this ply yet. */
  indeterminate?: boolean;
  /** Match the board height. */
  height?: number | string;
}

function whitePct(evalCp: number | null | undefined, mate: number | null | undefined): number {
  if (mate != null) return mate > 0 ? 100 : 0;
  if (evalCp == null) return 50;
  // Smooth sigmoid-ish mapping; ±600cp ≈ near the extremes.
  const clamped = Math.max(-1000, Math.min(1000, evalCp));
  return Math.max(2, Math.min(98, 50 + (clamped / 1000) * 48 + (clamped / 100) * 2));
}

function label(evalCp: number | null | undefined, mate: number | null | undefined): string {
  if (mate != null) return `M${Math.abs(mate)}`;
  if (evalCp == null) return '–';
  const v = evalCp / 100;
  return v > 0 ? `+${v.toFixed(1)}` : v.toFixed(1);
}

export function EvalBar({ evalCp, mate, indeterminate = false, height = '100%' }: EvalBarProps) {
  const pct = whitePct(evalCp, mate);
  const text = indeterminate ? '…' : label(evalCp, mate);
  const ariaLabel = indeterminate
    ? 'Evaluation: analyzing'
    : mate != null
      ? `Evaluation: mate in ${Math.abs(mate)} for ${mate > 0 ? 'White' : 'Black'}`
      : evalCp == null
        ? 'Evaluation: unknown'
        : `Evaluation: ${label(evalCp, mate)}, ${evalCp >= 0 ? 'White' : 'Black'} better`;

  return (
    <div className="iv-evalbar" role="img" aria-label={ariaLabel} style={{ height }}>
      <span className="iv-evalbar__num" aria-hidden>{text}</span>
      <div className="iv-evalbar__rail">
        {indeterminate ? (
          <div className="iv-evalbar__indeterminate" aria-hidden />
        ) : (
          <div className="iv-evalbar__white" style={{ height: `${pct}%` }} aria-hidden />
        )}
      </div>
    </div>
  );
}
