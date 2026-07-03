import { Button } from '../../components/ui/iv';
import type { AnalysisMoveVM } from './types';

const MOTIF_TEXT: Record<string, string> = {
  'hanging-piece': 'watch for undefended pieces before committing',
  'premature-pawn-push': 'hold the pawn break until your pieces are ready',
  'loosened-kingside': 'keep the pawn shield around your king intact',
  'exchange-sacrifice': 'great instinct — initiative can outweigh material',
};

export interface CoachNoteProps {
  move: AnalysisMoveVM | null;
  onOpenCoach: () => void;
}

/**
 * Subordinate Coach note (§8/§14.7): a single quiet line tied to the current
 * move — NOT a chat shell, no bubbles, no badge dominance. "Ask coach" opens
 * the peer Coach tab for the full guided explanation.
 */
export function CoachNote({ move, onOpenCoach }: CoachNoteProps) {
  const motif = move?.motifs[0];
  const tip = motif ? (MOTIF_TEXT[motif] ?? motif.replace(/-/g, ' ')) : 'solid play — keep following your plan';
  return (
    <div className="iv-coachnote">
      <span className="iv-coachnote__mark" aria-hidden>✦</span>
      <span className="iv-coachnote__text">
        <span className="iv-label" style={{ color: 'var(--accent)' }}>Coach</span>{' '}
        {move ? <>On {move.san}: {tip}.</> : 'Step through the game and I’ll point out what to learn.'}
      </span>
      <Button variant="ghost" size="sm" onClick={onOpenCoach}>Ask →</Button>
    </div>
  );
}
