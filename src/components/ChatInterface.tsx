import { useState, useEffect, useRef } from 'react';
import { Send, Loader, MessageCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { askChessMentor } from '../lib/gemini';
import { useAuth } from '../contexts/AuthContext';
import { MarkdownRenderer } from './MarkdownRenderer';
import type { Question } from '../lib/supabase';

interface ChatInterfaceProps {
  gameId?: string;
  gameContext?: any;
}

export function ChatInterface({ gameId, gameContext }: ChatInterfaceProps) {
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const { user } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      loadQuestions();
    }
  }, [user, gameId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [questions]);

  const loadQuestions = async () => {
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
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || !user) return;

    setLoading(true);

    try {
      const userHistory = questions.slice(-5);

      const answer = await askChessMentor(question, {
        gameInfo: gameContext,
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
    } catch (error: any) {
      console.error('Error asking question:', error);

      const errorMessage = error?.message || 'Failed to get answer. Please try again.';

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
    <div className="chat-container">
      <div className="chat-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-12)' }}>
          <MessageCircle style={{ width: '24px', height: '24px', color: 'var(--color-primary)' }} />
          <div>
            <h3 style={{ margin: 0, fontSize: 'var(--font-size-2xl)', color: 'var(--color-text)' }}>
              ChessMate Coach
            </h3>
            <p style={{ margin: 0, fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
              Professional analysis and personalized coaching
            </p>
          </div>
        </div>
      </div>

      <div className="chat-messages">
        {questions.length === 0 ? (
          <div style={{
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center'
          }}>
            <div style={{ maxWidth: '500px' }}>
              <div style={{
                marginBottom: 'var(--space-16)',
                padding: 'var(--space-16)',
                background: 'var(--color-secondary)',
                borderRadius: 'var(--radius-full)',
                width: '80px',
                height: '80px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto var(--space-16)'
              }}>
                <MessageCircle style={{ width: '40px', height: '40px', color: 'var(--color-text-secondary)' }} />
              </div>
              <h4 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-semibold)', marginBottom: 'var(--space-8)' }}>
                Start Your Chess Journey
              </h4>
              <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', lineHeight: 'var(--line-height-normal)' }}>
                Ask questions about your games, openings, tactics, or any chess position. Get expert-level analysis with structured insights.
              </p>
            </div>
          </div>
        ) : (
          <>
            {questions.map((q) => {
              const isError = q.answer.startsWith('⚠️ Error:');
              return (
                <div key={q.id} style={{ marginBottom: 'var(--space-24)' }}>
                  <div className="message user">
                    <div className="message-content">
                      {q.question}
                    </div>
                    <div className="message-avatar">U</div>
                  </div>
                  <div className="message ai">
                    <div className="message-avatar">AI</div>
                    <div className="message-content" style={{
                      maxWidth: '75%',
                      ...(isError && {
                        background: 'rgba(var(--color-error-rgb), 0.1)',
                        border: '1px solid rgba(var(--color-error-rgb), 0.3)',
                        color: 'var(--color-error)'
                      })
                    }}>
                      {isError ? (
                        <p style={{ fontSize: 'var(--font-size-sm)', margin: 0 }}>{q.answer}</p>
                      ) : (
                        <MarkdownRenderer content={q.answer} />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      <form onSubmit={handleSubmit} className="chat-input-area">
        <div className="input-group">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask your chess question..."
            className="form-control"
            disabled={loading}
            style={{ flex: 1 }}
          />
          <button
            type="submit"
            disabled={loading || !question.trim()}
            className="btn btn--primary"
          >
            {loading ? (
              <>
                <Loader style={{ width: '20px', height: '20px' }} className="loading" />
                <span style={{ marginLeft: 'var(--space-8)' }}>Analyzing...</span>
              </>
            ) : (
              <>
                <Send style={{ width: '20px', height: '20px' }} />
                <span style={{ marginLeft: 'var(--space-8)' }}>Send</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
