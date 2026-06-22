import { useState } from 'react';
import { Button, Input, Spinner, useIvToast } from '../../components/ui/iv';
import { BoardContainer } from './BoardContainer';
import { askChessMentor } from '../../lib/gemini';
import { COACH_STARTER_PROMPTS } from '../../lib/sampleData';
import type { AnalysisMoveVM, GameVM } from './types';

const MOTIF_TEXT: Record<string, string> = {
  'hanging-piece': 'this move leaves a piece undefended — the opponent can win material',
  'premature-pawn-push': 'the pawn push loosens your structure before your pieces are ready',
  'loosened-kingside': 'the kingside pawns have moved, exposing your king',
  'exchange-sacrifice': 'giving up the exchange here buys a powerful, lasting initiative',
};

export interface CoachTabProps {
  game: GameVM;
  move: AnalysisMoveVM | null;
  currentFen: string;
}

/**
 * Coach tab (System Design §4.5/§8/§14.7) — a peer tab (never default). Shows a
 * guided explanation scoped to the current move + a read-only mini board, with a
 * constrained prompt. It is a guide, not a generic chatbot: no bubble shell, no
 * AI badge dominance; always tied back to the concrete move.
 */
export function CoachTab({ game, move, currentFen }: CoachTabProps) {
  const { toast } = useIvToast();
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const motif = move?.motifs[0];
  const guided = move
    ? `On ${move.san}: ${motif ? MOTIF_TEXT[motif] ?? motif.replace(/-/g, ' ') : 'a principled move — it follows the demands of the position'}.`
    : 'Step to a move and I’ll explain what happened and what to learn.';

  const ask = async (text: string) => {
    if (!text.trim()) return;
    setLoading(true);
    setAnswer(null);
    try {
      const res = await askChessMentor(text, {
        gameInfo: { white_player: game.white, black_player: game.black, result: game.result, event: '', date: '' },
        currentPosition: currentFen,
        moveHistory: [],
        evaluation: move?.evalCp != null ? { evaluation: (move.evalCp / 100).toFixed(2), isMate: false, bestMove: move.bestSan ?? '' } : undefined,
      });
      setAnswer(res);
      setQuestion('');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Coach is unavailable right now', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="iv-coach">
      <div className="iv-coach__context">
        <span className="iv-label" style={{ color: 'var(--accent)' }}>Coach · {move ? `move ${move.moveNumber}` : 'this game'}</span>
        <span className="iv-caption" style={{ color: 'var(--text-low)' }}>{game.white} vs {game.black}</span>
      </div>

      <div className="iv-coach__board">
        <BoardContainer fen={currentFen} mini />
      </div>

      <p className="iv-body" style={{ color: 'var(--text-body)' }}>{guided}</p>

      {answer && <p className="iv-body" style={{ color: 'var(--text-body)', borderTop: '1px solid var(--hairline)', paddingTop: 'var(--space-3)' }}>{answer}</p>}

      <div className="iv-coach__prompts">
        {COACH_STARTER_PROMPTS.slice(0, 3).map((p) => (
          <button key={p} className="iv-coach__chip" onClick={() => ask(p)} disabled={loading}>{p}</button>
        ))}
      </div>

      <div className="iv-coach__input">
        <Input
          aria-label="Ask the coach about this position"
          placeholder="Ask about this move…"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') ask(question); }}
          disabled={loading}
        />
        <Button onClick={() => ask(question)} disabled={loading || !question.trim()}>
          {loading ? <Spinner size={14} /> : 'Ask'}
        </Button>
      </div>
    </div>
  );
}
