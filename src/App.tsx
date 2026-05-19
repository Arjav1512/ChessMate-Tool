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
import { LogOut, TrendingUp, Upload, Brain, BarChart3 } from 'lucide-react';
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
      <header style={{
        height: '56px',
        background: 'var(--cm-bg-surface)',
        borderBottom: '1px solid var(--cm-border-subtle)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 20px',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        gap: '8px',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginRight: 'auto' }}>
          <span style={{ fontSize: '22px', lineHeight: 1 }}>♟</span>
          <span style={{ fontWeight: 700, fontSize: '17px', color: 'var(--cm-text-primary)', letterSpacing: '-0.3px' }}>
            ChessMate
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
              <div style={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                gap: '24px',
                padding: '40px 20px',
              }}>
                <div style={{ fontSize: '64px', lineHeight: 1 }}>♟</div>
                <div>
                  <h2 style={{
                    fontSize: '28px',
                    fontWeight: 700,
                    marginBottom: '8px',
                    color: 'var(--cm-text-primary)',
                  }}>
                    Welcome to ChessMate
                  </h2>
                  <p style={{ color: 'var(--cm-text-secondary)', fontSize: '15px', maxWidth: '420px', margin: '0 auto' }}>
                    Import a game from the sidebar to start analyzing with Stockfish and getting AI-powered coaching.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center', marginTop: '4px' }}>
                  {[
                    { icon: '🔍', label: 'Deep Analysis' },
                    { icon: '🤖', label: 'AI Coaching' },
                    { icon: '📊', label: 'Statistics' },
                    { icon: '⚡', label: 'Stockfish' },
                  ].map(f => (
                    <div key={f.label} style={{
                      padding: '10px 16px',
                      background: 'var(--cm-bg-elevated)',
                      border: '1px solid var(--cm-border-subtle)',
                      borderRadius: '8px',
                      fontSize: '13px',
                      color: 'var(--cm-text-secondary)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}>
                      <span>{f.icon}</span> {f.label}
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
      <div style={{
        background: 'var(--cm-bg-surface)',
        border: '1px solid var(--cm-border-default)',
        borderRadius: '12px',
        padding: '40px',
        maxWidth: '520px',
        width: '100%',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>♟</div>
        <h2 style={{ color: 'var(--cm-text-primary)', fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>
          ChessMate needs configuration
        </h2>
        <p style={{ color: 'var(--cm-text-secondary)', fontSize: '14px', marginBottom: '24px', lineHeight: '1.6' }}>
          Missing <code style={{ color: 'var(--cm-accent)', background: 'var(--cm-accent-dim)', padding: '2px 6px', borderRadius: '4px' }}>.env.local</code> file.
          Create it in the project root with your Supabase credentials.
        </p>
        <div style={{
          background: 'var(--cm-bg-elevated)',
          border: '1px solid var(--cm-border-subtle)',
          borderRadius: '8px',
          padding: '16px',
          textAlign: 'left',
          fontFamily: 'monospace',
          fontSize: '12px',
          color: 'var(--cm-text-secondary)',
          lineHeight: '1.8',
        }}>
          <div style={{ color: 'var(--cm-text-muted)' }}># .env.local</div>
          <div><span style={{ color: 'var(--cm-accent)' }}>VITE_SUPABASE_URL</span>=https://your-project.supabase.co</div>
          <div><span style={{ color: 'var(--cm-accent)' }}>VITE_SUPABASE_ANON_KEY</span>=your_anon_key</div>
          <div><span style={{ color: 'var(--cm-accent)' }}>VITE_GEMINI_API_KEY</span>=your_gemini_key</div>
        </div>
        <p style={{ color: 'var(--cm-text-muted)', fontSize: '12px', marginTop: '16px' }}>
          Get credentials from your Supabase dashboard → Settings → API
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
