import type { LiveEval } from './useLiveEval';

export interface EnginePanelProps {
  enabled: boolean;
  onToggle: () => void;
  live: LiveEval;
  sideToMove: 'w' | 'b';
  exploring: boolean;
  /** White-POV eval of the position the exploration branched from (for a trend note). */
  branchEvalCp: number | null;
}

function fmtEval(evalCp: number | null, mate: number | null): string {
  if (mate != null) return `M${Math.abs(mate)}`;
  if (evalCp == null) return '–';
  const v = evalCp / 100;
  return v > 0 ? `+${v.toFixed(1)}` : v.toFixed(1);
}

/**
 * Plain-language read of the live engine result — the "short sentence on how to
 * improve" the analysis is meant to give. Rule-based off the eval + best move so
 * it's instant and works offline; "Ask coach" remains the deeper AI explanation.
 */
function verdict(live: LiveEval, sideToMove: 'w' | 'b', exploring: boolean, branchEvalCp: number | null): string {
  if (live.error) return 'Engine unavailable — showing the game’s own analysis.';
  if (!live.ready) return 'Analysing the position…';
  if (live.mate != null) {
    const who = live.mate > 0 ? 'White' : 'Black';
    return `${who} has a forced mate (M${Math.abs(live.mate)}).${live.bestSan ? ` Play ${live.bestSan}.` : ''}`;
  }
  const cp = live.evalCp ?? 0;
  const stm = sideToMove === 'w' ? 'White' : 'Black';
  const other = sideToMove === 'w' ? 'Black' : 'White';
  const stmCp = sideToMove === 'w' ? cp : -cp;
  const mag = Math.abs(stmCp);
  const leader = stmCp >= 0 ? stm : other;
  let phrase: string;
  if (mag < 40) phrase = 'The position is about equal.';
  else if (mag < 120) phrase = `${leader} is slightly better.`;
  else if (mag < 300) phrase = `${leader} is clearly better.`;
  else phrase = `${leader} is winning.`;
  const best = live.bestSan ? ` Best move: ${live.bestSan}.` : '';
  let trend = '';
  if (exploring && branchEvalCp != null && live.evalCp != null) {
    const d = (live.evalCp - branchEvalCp) / 100;
    if (Math.abs(d) >= 0.6) {
      trend = ` Your line has ${d > 0 ? 'improved' : 'worsened'} White’s eval by ${Math.abs(d).toFixed(1)} since you branched.`;
    }
  }
  return phrase + best + trend;
}

/**
 * Engine strip under the board (Lichess-style): a toggle plus, when on, the live
 * eval, the best line, and a one-line verdict — so the user can play any moves on
 * the board and instantly see whether the idea works.
 */
export function EnginePanel({ enabled, onToggle, live, sideToMove, exploring, branchEvalCp }: EnginePanelProps) {
  return (
    <div className={`iv-engine ${enabled ? 'iv-engine--on' : ''}`}>
      <div className="iv-engine__head">
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          className="iv-engine__toggle"
          onClick={onToggle}
        >
          <span className="iv-engine__switch" aria-hidden />
          <span aria-hidden>⚡</span> Engine
        </button>
        {enabled && (
          <span className="iv-engine__eval" aria-label={`Evaluation ${fmtEval(live.evalCp, live.mate)}`}>
            {live.ready || live.mate != null ? fmtEval(live.evalCp, live.mate) : '…'}
            {live.ready && live.depth > 0 && <span className="iv-engine__depth"> · d{live.depth}</span>}
          </span>
        )}
      </div>

      {enabled ? (
        <>
          <p className="iv-engine__verdict">{verdict(live, sideToMove, exploring, branchEvalCp)}</p>
          {live.pvSan.length > 0 && (
            <p className="iv-engine__pv" aria-label="Best line">
              {live.pvSan.slice(0, 6).join(' ')}
            </p>
          )}
        </>
      ) : (
        <p className="iv-engine__hint">Turn on to test your ideas with Stockfish — play any move on the board.</p>
      )}
    </div>
  );
}
