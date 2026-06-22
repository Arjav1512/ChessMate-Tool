import { Button, Card, MoveQualityChip, Skeleton } from '../../components/ui/iv';
import { MQ_LABEL } from '../../lib/analysis/moveQuality';
import type { AnalysisMoveVM, InsightVariant } from './types';

const MOTIF_TEXT: Record<string, string> = {
  'hanging-piece': 'left a piece hanging',
  'premature-pawn-push': 'pushed a pawn that loosened your structure',
  'loosened-kingside': 'weakened the squares around your king',
  'exchange-sacrifice': 'gave up the exchange for a lasting initiative',
};

function fmtEval(cp: number | null): string {
  if (cp == null) return '–';
  const v = cp / 100;
  return v > 0 ? `+${v.toFixed(1)}` : v.toFixed(1);
}

function variantFor(move: AnalysisMoveVM | null, turningPoints: number[]): InsightVariant {
  if (!move) return 'recommendation';
  if (turningPoints.includes(move.ply)) return 'turning-point';
  if (move.quality === 'blunder' || move.quality === 'mistake') return 'blunder';
  if (move.quality === 'inaccuracy' && move.bestSan) return 'missed-opportunity';
  return 'recommendation';
}

const VARIANT_LABEL: Record<InsightVariant, string> = {
  'turning-point': 'Turning point',
  blunder: 'Critical mistake',
  'missed-opportunity': 'Missed opportunity',
  recommendation: 'What to take away',
};

export interface InsightCardProps {
  /** The move at the current ply (null at the start position). */
  move: AnalysisMoveVM | null;
  turningPoints: number[];
  analyzing: boolean;
  cleanGame: boolean;        // analyzed with no mistakes
  onSendToImprove: () => void;
  onRevealBest: () => void;
  onAskCoach: () => void;
}

/**
 * Insight Card (System Design §6/§8) — the default content of the Analysis tab.
 * One component, four variants (decision #3): Turning Point · Blunder ·
 * Missed Opportunity · Improvement Recommendation. Insight-first: plain-language
 * "why" leads; the engine number supports.
 */
export function InsightCard({ move, turningPoints, analyzing, cleanGame, onSendToImprove, onRevealBest, onAskCoach }: InsightCardProps) {
  if (analyzing && move && move.quality == null) {
    return (
      <Card aria-label="Analyzing move">
        <Skeleton width={120} height={20} /><div style={{ height: 10 }} />
        <Skeleton height={44} /><div style={{ height: 8 }} /><Skeleton width="70%" />
      </Card>
    );
  }

  // Start position / clean game → positive recommendation (never blank, §8).
  if (!move) {
    return (
      <Card>
        <span className="iv-label" style={{ color: 'var(--text-low)' }}>What to take away</span>
        <h3 className="iv-h3" style={{ color: 'var(--text-hi)', margin: '6px 0' }}>
          {cleanGame ? 'Clean game — well played.' : 'Step through to see the turning points.'}
        </h3>
        <p className="iv-body-sm" style={{ color: 'var(--text-mid)' }}>
          {cleanGame
            ? 'No serious mistakes. Use the timeline to revisit your best decisions.'
            : 'Use ‹ › or the turning-points jumps to reach the moments that decided the game.'}
        </p>
        <div className="iv-insight__actions">
          <Button onClick={onSendToImprove}>Send to Improve</Button>
          <Button variant="ghost" onClick={onAskCoach}>Ask coach →</Button>
        </div>
      </Card>
    );
  }

  const variant = variantFor(move, turningPoints);
  const motif = move.motifs[0];
  const motifText = motif ? MOTIF_TEXT[motif] ?? motif.replace(/-/g, ' ') : null;
  const isPositive = variant === 'recommendation';
  const swung = variant === 'turning-point';

  const explanation = (() => {
    if (variant === 'turning-point') return `This is where the game turned. After ${move.san}, the evaluation swung to ${fmtEval(move.evalCp)}.`;
    if (variant === 'blunder') return `${move.san} ${motifText ? `— it ${motifText}.` : `is a ${MQ_LABEL[move.quality!].toLowerCase()}.`} The position swung to ${fmtEval(move.evalCp)}.`;
    if (variant === 'missed-opportunity') return `${move.san} is playable, but a stronger continuation was available.`;
    return move.quality === 'brilliant'
      ? `${move.san} is brilliant — it ${motifText ?? 'found the only winning idea'}.`
      : `${move.san} is a solid choice. Keep playing principled moves like this.`;
  })();

  return (
    <Card variant={swung ? 'hero' : 'standard'} accentColor={variant === 'blunder' ? 'var(--error)' : undefined}>
      <div className="iv-insight__head">
        <span className="iv-label" style={{ color: 'var(--text-low)' }}>{VARIANT_LABEL[variant]}</span>
        {move.quality && <MoveQualityChip quality={move.quality} san={move.san} emphasis={variant !== 'recommendation'} />}
      </div>
      <p className="iv-body" style={{ color: 'var(--text-body)', margin: '8px 0 0' }}>{explanation}</p>

      {move.bestSan && move.bestSan !== move.san && (
        <div className="iv-insight__best">
          <div className="iv-insight__divider" />
          <div className="iv-insight__best-row">
            <MoveQualityChip quality="best" san={move.bestSan} showSymbol={false} />
            <span className="iv-insight__best-eval">{fmtEval(move.bestEvalCp)}</span>
          </div>
          <p className="iv-caption" style={{ color: 'var(--text-mid)' }}>
            {move.bestSan} keeps the advantage and avoids the {motifText ?? 'problem'}.
          </p>
        </div>
      )}

      <div className="iv-insight__actions">
        {!isPositive && <Button onClick={onSendToImprove}>Send to Improve</Button>}
        {move.bestSan && move.bestSan !== move.san && (
          <Button variant="secondary" onClick={onRevealBest}>Reveal best move</Button>
        )}
        {isPositive && <Button onClick={onSendToImprove}>Send to Improve</Button>}
        <Button variant="ghost" onClick={onAskCoach}>Ask coach →</Button>
      </div>
    </Card>
  );
}
