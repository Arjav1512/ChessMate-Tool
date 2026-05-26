import { useState, useEffect, useRef, useCallback } from 'react';
import { Send } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { askChessMentor } from '../../lib/gemini';
import { useAuth } from '../../contexts/AuthContext';
import { MarkdownRenderer } from '../ui/MarkdownRenderer';
import { parsePGN } from '../../lib/pgn';
import type { Question } from '../../lib/supabase';

interface GameContext {
  white_player?: string;
  black_player?: string;
  result?: string;
  event?: string;
  date?: string;
}

interface ChatInterfaceProps {
  gameId?: string;
  gameContext?: GameContext;
}

const SUGGESTED_QUESTIONS = [
  'What are the key ideas in this position?',
  'What was the critical mistake?',
  'How should I continue from here?',
];

export function ChatInterface({ gameId, gameContext }: ChatInterfaceProps) {
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  // Full move list and final FEN of the selected game — passed as context to the AI
  const [gameMoves, setGameMoves] = useState<string[]>([]);
  const [gameFen, setGameFen] = useState<string | undefined>(undefined);
  const { user } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadQuestions = useCallback(async () => {
    if (!user) return;

    let query = supabase
      .from('questions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    if (gameId) {
      query = query.eq('game_id', gameId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error loading questions:', error);
    } else {
      setQuestions(data || []);
    }
  }, [user, gameId]);

  useEffect(() => {
    if (user) {
      loadQuestions();
    }
  }, [user, gameId, loadQuestions]);

  // When the selected game changes, load its PGN and extract moves/FEN for AI context
  useEffect(() => {
    if (!gameId) {
      setGameMoves([]);
      setGameFen(undefined);
      return;
    }
    supabase
      .from('games')
      .select('pgn')
      .eq('id', gameId)
      .single()
      .then(({ data }) => {
        if (data?.pgn) {
          try {
            const parsed = parsePGN(data.pgn);
            setGameMoves(parsed.moves);
            // Last FEN = position after all moves
            setGameFen(parsed.fen[parsed.fen.length - 1]);
          } catch {
            setGameMoves([]);
            setGameFen(undefined);
          }
        }
      });
  }, [gameId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [questions]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || !user) return;

    setLoading(true);

    try {
      const userHistory = questions.slice(-5);

      const answer = await askChessMentor(question, {
        gameInfo: gameContext,
        currentPosition: gameFen,
        moveHistory: gameMoves.length > 0 ? gameMoves : undefined,
        userHistory,
      });

      const { error } = await supabase.from('questions').insert({
        user_id: user.id,
        game_id: gameId || null,
        question: question.trim(),
        answer,
        context: gameContext || {},
      });

      if (error) throw error;

      setQuestion('');
      await loadQuestions();
    } catch (error) {
      console.error('Error asking question:', error);

      const errorMessage = error instanceof Error ? error.message : 'Failed to get answer. Please try again.';

      const { error: dbError } = await supabase.from('questions').insert({
        user_id: user.id,
        game_id: gameId || null,
        question: question.trim(),
        answer: `⚠️ Error: ${errorMessage}`,
        context: gameContext || {},
      });

      if (!dbError) {
        await loadQuestions();
      }

      setQuestion('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: 'var(--cm-bg-base)',
    }}>
      {/* Header */}
      <div style={{
        padding: '14px 20px',
        borderBottom: '1px solid var(--cm-border-subtle)',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        background: 'var(--cm-bg-surface)',
      }}>
        <div style={{
          width: '32px',
          height: '32px',
          background: 'var(--cm-accent-dim)',
          border: '1px solid var(--cm-border-default)',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '16px',
          flexShrink: 0,
        }}>♟</div>
        <div>
          <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--cm-text-primary)' }}>
            ChessMate Coach
          </div>
          <div style={{ fontSize: '11px', color: 'var(--cm-text-muted)' }}>
            AI-powered chess analysis
          </div>
        </div>
        {gameContext && (
          <div style={{ marginLeft: 'auto', fontSize: '12px', color: 'var(--cm-text-muted)', textAlign: 'right' }}>
            <div style={{ fontWeight: 500, color: 'var(--cm-text-secondary)' }}>
              {gameContext.white_player} vs {gameContext.black_player}
            </div>
            {gameContext.result && <div>{gameContext.result}</div>}
          </div>
        )}
      </div>

      {/* Messages */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '16px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
      }}>
        {questions.length === 0 ? (
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            gap: '14px',
            padding: '40px 20px',
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              background: 'var(--cm-accent-dim)',
              border: '1px solid var(--cm-accent-ring)',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
              color: 'var(--cm-accent)',
            }}>♟</div>
            <div>
              <h4 style={{ fontWeight: 600, marginBottom: '6px', color: 'var(--cm-text-primary)', fontSize: '15px' }}>
                Ask the Coach
              </h4>
              <p style={{ color: 'var(--cm-text-muted)', fontSize: '13px', lineHeight: 1.5, maxWidth: '340px', margin: '0 auto' }}>
                Ask anything about chess — openings, tactics, endgames, or get analysis of your current game.
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center', width: '100%', maxWidth: '380px' }}>
              {SUGGESTED_QUESTIONS.map(q => (
                <button
                  key={q}
                  onClick={() => setQuestion(q)}
                  style={{
                    padding: '7px 14px',
                    background: 'var(--cm-bg-elevated)',
                    border: '1px solid var(--cm-border-default)',
                    borderRadius: '16px',
                    color: 'var(--cm-text-secondary)',
                    fontSize: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    textAlign: 'left',
                    width: '100%',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = 'var(--cm-accent)';
                    e.currentTarget.style.color = 'var(--cm-text-primary)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = 'var(--cm-border-default)';
                    e.currentTarget.style.color = 'var(--cm-text-secondary)';
                  }}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          questions.map(q => {
            const isError = q.answer.startsWith('⚠️ Error:');
            return (
              <div key={q.id} className="fade-up">
                {/* User message - right aligned */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
                  <div style={{
                    maxWidth: '75%',
                    padding: '9px 13px',
                    background: 'var(--cm-accent)',
                    borderRadius: '12px 12px 2px 12px',
                    color: 'var(--cm-text-inverse)',
                    fontSize: '13px',
                    lineHeight: 1.5,
                    wordBreak: 'break-word',
                  }}>
                    {q.question}
                  </div>
                </div>

                {/* AI response - left aligned */}
                <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                  <div style={{
                    width: '26px',
                    height: '26px',
                    background: 'var(--cm-accent-dim)',
                    border: '1px solid var(--cm-accent-ring)',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '13px',
                    flexShrink: 0,
                    marginTop: '3px',
                    color: 'var(--cm-accent)',
                  }}>♟</div>
                  <div style={{
                    maxWidth: '80%',
                    padding: '10px 14px',
                    background: isError ? 'var(--cm-error-dim)' : 'var(--cm-bg-elevated)',
                    border: `1px solid ${isError ? 'rgba(232,85,74,0.25)' : 'var(--cm-border-subtle)'}`,
                    borderRadius: '2px 12px 12px 12px',
                    color: isError ? 'var(--cm-error)' : 'var(--cm-text-primary)',
                    fontSize: '13px',
                    lineHeight: 1.65,
                    wordBreak: 'break-word',
                  }}>
                    {isError ? (
                      <p style={{ fontSize: '13px', margin: 0 }}>{q.answer}</p>
                    ) : (
                      <MarkdownRenderer content={q.answer} />
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        {loading && (
          <div className="fade-up" style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
            <div style={{
              width: '26px',
              height: '26px',
              background: 'var(--cm-accent-dim)',
              border: '1px solid var(--cm-accent-ring)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '13px',
              flexShrink: 0,
              color: 'var(--cm-accent)',
            }}>♟</div>
            <div className="typing-indicator">
              <div className="typing-dot" />
              <div className="typing-dot" />
              <div className="typing-dot" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div style={{
        padding: '12px 16px',
        borderTop: '1px solid var(--cm-border-subtle)',
        background: 'var(--cm-bg-surface)',
      }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask about the position, openings, tactics..."
            disabled={loading}
            style={{
              flex: 1,
              padding: '9px 14px',
              background: 'var(--cm-bg-base)',
              border: '1px solid var(--cm-border-default)',
              borderRadius: '8px',
              color: 'var(--cm-text-primary)',
              fontSize: '13px',
              outline: 'none',
              fontFamily: 'inherit',
              transition: 'border-color 0.15s',
            }}
            onFocus={e => (e.currentTarget.style.borderColor = 'var(--cm-accent)')}
            onBlur={e => (e.currentTarget.style.borderColor = 'var(--cm-border-default)')}
          />
          <button
            type="submit"
            disabled={loading || !question.trim()}
            style={{
              padding: '9px 16px',
              background: loading || !question.trim() ? 'var(--cm-bg-elevated)' : 'var(--cm-accent)',
              border: '1px solid transparent',
              borderRadius: '8px',
              color: loading || !question.trim() ? 'var(--cm-text-muted)' : 'var(--cm-text-inverse)',
              cursor: loading || !question.trim() ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontWeight: 500,
              fontSize: '13px',
              transition: 'all 0.15s',
              flexShrink: 0,
            }}
          >
            <Send size={15} />
            {loading ? 'Sending...' : 'Send'}
          </button>
        </form>
      </div>
    </div>
  );
}
