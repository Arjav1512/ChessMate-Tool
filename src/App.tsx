import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { supabaseConfigured } from './lib/supabase';
import { ErrorBoundary } from './components/layout/ErrorBoundary';
import { AuthForm } from './components/auth/AuthForm';
import { GameList } from './components/game/GameList';
import { ChatInterface } from './components/chat/ChatInterface';
import { ProgressBar } from './components/stats/ProgressBar';
import { AnalyzeGamesPage } from './components/analysis/AnalyzeGamesPage';
import { StatsDashboard } from './components/stats/StatsDashboard';
import { ThemeToggle } from './components/layout/ThemeToggle';
import { CompatibilityWarning } from './components/layout/CompatibilityWarning';
import { useResponsive } from './hooks/useResponsive';
import { LogOut, TrendingUp, Upload, Brain, BarChart3, Search, Zap, BookOpen } from 'lucide-react';
import type { Game } from './lib/supabase';

type ModalType = 'import' | 'progress' | 'analyze' | 'stats' | null;

const modalBackdropStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.65)',
  backdropFilter: 'blur(4px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 50,
  padding: '16px',
};

const modalContainerStyle: React.CSSProperties = {
  background: 'var(--cm-bg-surface)',
  border: '1px solid var(--cm-border-default)',
  borderRadius: '12px',
  boxShadow: '0 24px 48px rgba(0,0,0,0.4)',
  width: '100%',
  maxHeight: '90vh',
  overflow: 'auto',
};

function ModalHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '16px 20px',
      borderBottom: '1px solid var(--cm-border-subtle)',
    }}>
      <span style={{ fontWeight: 600, fontSize: '15px', color: 'var(--cm-text-primary)' }}>{title}</span>
      <button
        onClick={onClose}
        aria-label="Close"
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--cm-text-muted)',
          fontSize: '20px',
          lineHeight: 1,
          padding: '4px',
          borderRadius: '4px',
          transition: 'color 0.15s',
          display: 'flex',
          alignItems: 'center',
        }}
        onMouseEnter={e => (e.currentTarget.style.color = 'var(--cm-text-primary)')}
        onMouseLeave={e => (e.currentTarget.style.color = 'var(--cm-text-muted)')}
      >
        ×
      </button>
    </div>
  );
}

function NavButton({ onClick, icon, label }: { onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '6px 12px',
        background: 'transparent',
        border: '1px solid var(--cm-border-default)',
        borderRadius: '6px',
        color: 'var(--cm-text-secondary)',
        fontSize: '13px',
        fontWeight: 500,
        cursor: 'pointer',
        transition: 'all 0.15s',
        whiteSpace: 'nowrap',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = 'var(--cm-border-strong)';
        e.currentTarget.style.color = 'var(--cm-text-primary)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'var(--cm-border-default)';
        e.currentTarget.style.color = 'var(--cm-text-secondary)';
      }}
    >
      {icon}
      {label}
    </button>
  );
}

function MainApp() {
  const { user, signOut } = useAuth();
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [openModal, setOpenModal] = useState<ModalType>(null);
  const [showCompatibilityWarning, setShowCompatibilityWarning] = useState(true);
  const { isMobile } = useResponsive();

  if (!user) {
    return <AuthForm />;
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--cm-bg-base)', color: 'var(--cm-text-primary)' }}>
      {/* Header */}
      <header className="app-header">
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginRight: 'auto' }}>
          <span style={{ fontSize: '20px', lineHeight: 1, color: 'var(--cm-accent)', filter: 'drop-shadow(0 1px 4px rgba(240,168,64,0.35))' }}>♟</span>
          <span style={{ fontWeight: 600, fontSize: '16px', color: 'var(--cm-text-primary)', letterSpacing: '-0.2px' }}>
            Chess<span style={{ color: 'var(--cm-accent)' }}>Mate</span>
          </span>
        </div>

        {/* Nav buttons */}
        {!isMobile && (
          <>
            <NavButton
              onClick={() => setOpenModal('import')}
              icon={<Upload size={14} />}
              label="Import"
            />
            <NavButton
              onClick={() => setOpenModal('analyze')}
              icon={<Brain size={14} />}
              label="Analyze"
            />
            <NavButton
              onClick={() => setOpenModal('stats')}
              icon={<BarChart3 size={14} />}
              label="Statistics"
            />
            <NavButton
              onClick={() => setOpenModal('progress')}
              icon={<TrendingUp size={14} />}
              label="Progress"
            />
          </>
        )}

        <ThemeToggle />

        <button
          onClick={signOut}
          aria-label="Sign out"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            background: 'transparent',
            border: '1px solid var(--cm-border-default)',
            borderRadius: '6px',
            color: 'var(--cm-text-secondary)',
            fontSize: '13px',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = 'var(--cm-error)';
            e.currentTarget.style.color = 'var(--cm-error)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = 'var(--cm-border-default)';
            e.currentTarget.style.color = 'var(--cm-text-secondary)';
          }}
        >
          <LogOut size={14} />
          {!isMobile && 'Sign Out'}
        </button>
      </header>

      {/* Main body — two column */}
      <div style={{ display: 'flex', height: 'calc(100vh - 56px)' }}>
        {/* Sidebar */}
        {!isMobile && (
          <aside style={{
            width: '300px',
            flexShrink: 0,
            background: 'var(--cm-bg-surface)',
            borderRight: '1px solid var(--cm-border-subtle)',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
          }}>
            <GameList
              onSelectGame={setSelectedGame}
              selectedGameId={selectedGame?.id}
            />
          </aside>
        )}

        {/* Main content */}
        <main style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
          {showCompatibilityWarning && (
            <div style={{ padding: isMobile ? '12px 16px 0' : '16px 24px 0' }}>
              <CompatibilityWarning onDismiss={() => setShowCompatibilityWarning(false)} />
            </div>
          )}

          {/* Mobile game list inline */}
          {isMobile && (
            <div style={{
              background: 'var(--cm-bg-surface)',
              borderBottom: '1px solid var(--cm-border-subtle)',
            }}>
              <GameList
                onSelectGame={setSelectedGame}
                selectedGameId={selectedGame?.id}
              />
            </div>
          )}

          <div style={{ flex: 1, overflow: 'auto' }}>
            {selectedGame ? (
              <ChatInterface
                gameId={selectedGame.id}
                gameContext={{
                  white_player: selectedGame.white_player,
                  black_player: selectedGame.black_player,
                  result: selectedGame.result,
                  event: selectedGame.event,
                  date: selectedGame.date,
                }}
              />
            ) : (
              /* Welcome screen */
              <div className="fade-up" style={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                gap: '32px',
                padding: '40px 20px',
              }}>
                <div style={{
                  width: '64px',
                  height: '64px',
                  background: 'var(--cm-accent-dim)',
                  border: '1px solid var(--cm-accent-ring)',
                  borderRadius: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <span style={{ fontSize: '32px', lineHeight: 1, filter: 'drop-shadow(0 2px 4px rgba(240,168,64,0.4))' }}>♟</span>
                </div>
                <div>
                  <h2 style={{
                    fontSize: '24px',
                    fontWeight: 600,
                    marginBottom: '10px',
                    color: 'var(--cm-text-primary)',
                    letterSpacing: '-0.3px',
                  }}>
                    Select a game to begin
                  </h2>
                  <p style={{ color: 'var(--cm-text-secondary)', fontSize: '14px', maxWidth: '380px', margin: '0 auto', lineHeight: 1.6 }}>
                    Import a PGN from the sidebar, then navigate moves to get deep Stockfish analysis and AI-powered coaching.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
                  {([
                    { icon: <Search size={13} />, label: 'Move Analysis' },
                    { icon: <Brain size={13} />, label: 'AI Coach' },
                    { icon: <BarChart3 size={13} />, label: 'Statistics' },
                    { icon: <Zap size={13} />, label: 'Stockfish 16' },
                    { icon: <BookOpen size={13} />, label: 'Opening Theory' },
                  ] as const).map((f, i) => (
                    <div
                      key={f.label}
                      className={`fade-up fade-up-delay-${Math.min(i + 1, 4) as 1 | 2 | 3 | 4}`}
                      style={{
                        padding: '8px 14px',
                        background: 'var(--cm-bg-elevated)',
                        border: '1px solid var(--cm-border-subtle)',
                        borderRadius: '8px',
                        fontSize: '12px',
                        color: 'var(--cm-text-secondary)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <span style={{ color: 'var(--cm-accent)', opacity: 0.8, display: 'flex' }}>{f.icon}</span>
                      {f.label}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Import modal */}
      {openModal === 'import' && (
        <div style={modalBackdropStyle} onClick={() => setOpenModal(null)}>
          <div
            style={{ ...modalContainerStyle, maxWidth: '600px' }}
            onClick={e => e.stopPropagation()}
          >
            <ModalHeader title="Import Games" onClose={() => setOpenModal(null)} />
            <div style={{ padding: '16px' }}>
              <GameList
                onSelectGame={(game) => {
                  setSelectedGame(game);
                  setOpenModal(null);
                }}
                selectedGameId={selectedGame?.id}
              />
            </div>
          </div>
        </div>
      )}

      {/* Analyze modal */}
      {openModal === 'analyze' && (
        <div style={modalBackdropStyle} onClick={() => setOpenModal(null)}>
          <div
            style={{
              ...modalContainerStyle,
              maxWidth: '95vw',
              width: '100%',
              height: '95vh',
              maxHeight: '95vh',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
            onClick={e => e.stopPropagation()}
          >
            <AnalyzeGamesPage onClose={() => setOpenModal(null)} />
          </div>
        </div>
      )}

      {/* Stats modal */}
      {openModal === 'stats' && <StatsDashboard onClose={() => setOpenModal(null)} />}

      {/* Progress modal */}
      {openModal === 'progress' && (
        <div style={modalBackdropStyle} onClick={() => setOpenModal(null)}>
          <div
            style={{ ...modalContainerStyle, maxWidth: '700px' }}
            onClick={e => e.stopPropagation()}
          >
            <ModalHeader title="Your Progress" onClose={() => setOpenModal(null)} />
            <div style={{ padding: '20px' }}>
              <ProgressBar />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MissingConfigScreen() {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--cm-bg-base)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
    }}>
      <div className="fade-up" style={{
        background: 'var(--cm-bg-surface)',
        border: '1px solid var(--cm-border-default)',
        borderRadius: '16px',
        padding: '40px',
        maxWidth: '520px',
        width: '100%',
        textAlign: 'center',
        boxShadow: '0 24px 48px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)',
      }}>
        <div style={{
          width: '56px',
          height: '56px',
          background: 'var(--cm-accent-dim)',
          border: '1px solid var(--cm-accent-ring)',
          borderRadius: '14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px',
        }}>
          <span style={{ fontSize: '28px', lineHeight: 1, color: 'var(--cm-accent)' }}>♟</span>
        </div>
        <h2 style={{ color: 'var(--cm-text-primary)', fontSize: '19px', fontWeight: 600, marginBottom: '8px', letterSpacing: '-0.2px' }}>
          Configuration required
        </h2>
        <p style={{ color: 'var(--cm-text-secondary)', fontSize: '14px', marginBottom: '24px', lineHeight: '1.6' }}>
          Create a <code style={{ color: 'var(--cm-accent)', background: 'var(--cm-accent-dim)', padding: '2px 6px', borderRadius: '4px', fontFamily: 'var(--font-family-mono)' }}>.env.local</code> file
          in the project root with your Supabase credentials.
        </p>
        <div style={{
          background: 'var(--cm-bg-elevated)',
          border: '1px solid var(--cm-border-subtle)',
          borderRadius: '8px',
          padding: '16px',
          textAlign: 'left',
          fontFamily: 'var(--font-family-mono)',
          fontSize: '12px',
          color: 'var(--cm-text-secondary)',
          lineHeight: '1.9',
        }}>
          <div style={{ color: 'var(--cm-text-muted)' }}># .env.local</div>
          <div><span style={{ color: 'var(--cm-accent)' }}>VITE_SUPABASE_URL</span>=https://your-project.supabase.co</div>
          <div><span style={{ color: 'var(--cm-accent)' }}>VITE_SUPABASE_ANON_KEY</span>=your_anon_key</div>
          <div><span style={{ color: 'var(--cm-accent)' }}>VITE_GEMINI_API_KEY</span>=your_gemini_key</div>
        </div>
        <p style={{ color: 'var(--cm-text-muted)', fontSize: '12px', marginTop: '16px' }}>
          Supabase dashboard → Project Settings → API
        </p>
      </div>
    </div>
  );
}

function App() {
  if (!supabaseConfigured) {
    return <MissingConfigScreen />;
  }

  return (
    <ErrorBoundary>
      <AuthProvider>
        <ToastProvider>
          <ErrorBoundary>
            <MainApp />
          </ErrorBoundary>
        </ToastProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
