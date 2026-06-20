import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { supabaseConfigured } from './lib/supabase';
import { ErrorBoundary } from './components/layout/ErrorBoundary';
import { AuthForm } from './components/auth/AuthForm';
import { PasswordResetComplete } from './components/auth/PasswordResetComplete';
import { LandingPage } from './components/marketing/LandingPage';
import { GameList } from './components/game/GameList';
import { GameViewer } from './components/game/GameViewer';
import { ProgressBar } from './components/stats/ProgressBar';
import { AnalyzeGamesPage } from './components/analysis/AnalyzeGamesPage';
import { StatsDashboard } from './components/stats/StatsDashboard';
import { ThemeToggle } from './components/layout/ThemeToggle';
import { CompatibilityWarning } from './components/layout/CompatibilityWarning';
import { ProfileModal } from './components/layout/ProfileModal';
import { LoadingSpinner } from './components/ui/LoadingSpinner';
import { Modal } from './components/ui/Modal';
import { Button } from './components/ui/Button';
import { useResponsive } from './hooks/useResponsive';
import { LogOut, TrendingUp, Upload, Brain, BarChart3, User, Menu, X as XIcon } from 'lucide-react';
// Note: i18n infrastructure removed — no components use useTranslation
import type { Game } from './lib/supabase';

type ModalType = 'import' | 'progress' | 'analyze' | 'stats' | null;

function NavButton({ onClick, icon, label }: { onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
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
  const { user, loading, signOut, passwordRecovery } = useAuth();
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [openModal, setOpenModal] = useState<ModalType>(null);
  const [showCompatibilityWarning, setShowCompatibilityWarning] = useState(true);
  const [showMobileNav, setShowMobileNav] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  // Pre-auth view: 'landing' (marketing page) or 'auth' (sign-in form).
  // Persists "they clicked Get Started" across a refresh so the user
  // doesn't bounce back to the landing page mid-signup.
  const [preAuthView, setPreAuthView] = useState<'landing' | 'auth'>(() => {
    if (typeof window === 'undefined') return 'landing';
    return window.sessionStorage.getItem('cm.preAuthView') === 'auth' ? 'auth' : 'landing';
  });
  const goToAuth = () => {
    setPreAuthView('auth');
    try { window.sessionStorage.setItem('cm.preAuthView', 'auth'); } catch { /* ignore */ }
  };
  const goToLanding = () => {
    setPreAuthView('landing');
    try { window.sessionStorage.removeItem('cm.preAuthView'); } catch { /* ignore */ }
  };
  const { isMobile } = useResponsive();

  // Show a full-screen spinner while the auth session is being resolved to
  // prevent a flash of the sign-in form for already-logged-in users.
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'var(--cm-bg-base)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Password recovery takes precedence over the rest of the app: even though
  // Supabase has signed the user in (so `user` is non-null), we should not
  // let them touch the main UI until they've set a new password.
  if (passwordRecovery) {
    return <PasswordResetComplete />;
  }

  if (!user) {
    return preAuthView === 'landing'
      ? <LandingPage onGetStarted={goToAuth} onSignIn={goToAuth} />
      : <AuthForm onBackToLanding={goToLanding} />;
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--cm-bg-base)', color: 'var(--cm-text-primary)' }}>
      <h1 className="sr-only">ChessMate — chess analysis and coaching</h1>
      {/* Header */}
      <header className="app-header">
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginRight: 'auto' }}>
          <span style={{ fontSize: '20px', lineHeight: 1, color: 'var(--cm-accent)', filter: 'drop-shadow(0 1px 4px rgba(240,168,64,0.35))' }}>♟</span>
          <span style={{ fontWeight: 600, fontSize: '16px', color: 'var(--cm-text-primary)', letterSpacing: '-0.2px' }}>
            Chess<span style={{ color: 'var(--cm-accent)' }}>Mate</span>
          </span>
        </div>

        {/* Nav buttons — desktop only */}
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

        {/* Mobile hamburger — opens a bottom-sheet with all nav actions */}
        {isMobile && (
          <button
            onClick={() => setShowMobileNav(true)}
            aria-label="Open navigation menu"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '6px',
              background: 'transparent',
              border: '1px solid var(--cm-border-default)',
              borderRadius: '6px',
              color: 'var(--cm-text-secondary)',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            <Menu size={18} />
          </button>
        )}

        <ThemeToggle />

        <button
          onClick={() => setShowProfile(true)}
          aria-label="Your profile"
          title="Your profile"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '32px',
            height: '32px',
            background: 'transparent',
            border: '1px solid var(--cm-border-default)',
            borderRadius: '50%',
            color: 'var(--cm-text-secondary)',
            cursor: 'pointer',
            transition: 'all 0.15s',
            flexShrink: 0,
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
          <User size={15} />
        </button>

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
              <ErrorBoundary key={selectedGame.id}>
                <GameViewer game={selectedGame} />
              </ErrorBoundary>
            ) : (
              <WelcomeScreen
                onImport={() => setOpenModal('import')}
                onOpenAnalyze={() => setOpenModal('analyze')}
              />
            )}
          </div>
        </main>
      </div>

      {/* Import modal */}
      {openModal === 'import' && (
        <Modal title="Import Games" onClose={() => setOpenModal(null)} containerStyle={{ maxWidth: '600px' }}>
          <div style={{ padding: '16px' }}>
            <GameList
              onSelectGame={(game) => {
                setSelectedGame(game);
                setOpenModal(null);
              }}
              selectedGameId={selectedGame?.id}
            />
          </div>
        </Modal>
      )}

      {/* Analyze modal */}
      {openModal === 'analyze' && (
        <Modal
          ariaLabel="Analyze games"
          onClose={() => setOpenModal(null)}
          containerStyle={{
            maxWidth: '95vw',
            width: '100%',
            height: '95vh',
            maxHeight: '95vh',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <AnalyzeGamesPage onClose={() => setOpenModal(null)} />
        </Modal>
      )}

      {/* Stats modal */}
      {openModal === 'stats' && <StatsDashboard onClose={() => setOpenModal(null)} />}

      {/* Progress modal */}
      {openModal === 'progress' && (
        <Modal title="Your Progress" onClose={() => setOpenModal(null)} containerStyle={{ maxWidth: '700px' }}>
          <div style={{ padding: '20px' }}>
            <ProgressBar />
          </div>
        </Modal>
      )}

      {/* Profile modal */}
      {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}

      {/* Mobile nav bottom-sheet */}
      {showMobileNav && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.55)',
            backdropFilter: 'blur(3px)',
            zIndex: 200,
            display: 'flex',
            alignItems: 'flex-end',
          }}
          onClick={() => setShowMobileNav(false)}
        >
          <div
            style={{
              width: '100%',
              background: 'var(--cm-bg-surface)',
              borderTop: '1px solid var(--cm-border-default)',
              borderRadius: '16px 16px 0 0',
              padding: '16px 0 24px',
              boxShadow: '0 -8px 32px rgba(0,0,0,0.3)',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Drag handle */}
            <div style={{
              width: '36px',
              height: '4px',
              background: 'var(--cm-border-default)',
              borderRadius: '2px',
              margin: '0 auto 16px',
            }} />

            {/* Nav items */}
            {[
              { icon: <Upload size={18} />, label: 'Import Games', modal: 'import' as ModalType },
              { icon: <Brain size={18} />, label: 'Analyze', modal: 'analyze' as ModalType },
              { icon: <BarChart3 size={18} />, label: 'Statistics', modal: 'stats' as ModalType },
              { icon: <TrendingUp size={18} />, label: 'Progress', modal: 'progress' as ModalType },
            ].map(item => (
              <button
                key={item.label}
                onClick={() => { setShowMobileNav(false); setOpenModal(item.modal); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  width: '100%',
                  padding: '14px 24px',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--cm-text-primary)',
                  fontSize: '15px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background 0.12s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--cm-bg-elevated)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <span style={{ color: 'var(--cm-accent)', display: 'flex' }}>{item.icon}</span>
                {item.label}
              </button>
            ))}

            <div style={{ height: '1px', background: 'var(--cm-border-subtle)', margin: '8px 24px' }} />

            {/* Close */}
            <button
              onClick={() => setShowMobileNav(false)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                width: '100%',
                padding: '14px 24px',
                background: 'transparent',
                border: 'none',
                color: 'var(--cm-text-secondary)',
                fontSize: '15px',
                fontWeight: 500,
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <span style={{ display: 'flex' }}><XIcon size={18} /></span>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Welcome screen (post-auth empty state for "no game selected") ──────────

function WelcomeScreen({ onImport, onOpenAnalyze }: { onImport: () => void; onOpenAnalyze: () => void }) {
  const steps = [
    {
      icon: <Upload size={16} />,
      title: 'Import a PGN',
      body: 'Upload a .pgn or paste raw text. We support files up to 5 MB and parse off the main thread.',
    },
    {
      icon: <Brain size={16} />,
      title: 'Run Stockfish + ask the coach',
      body: 'Every move evaluated, every blunder flagged. The AI coach explains why in plain English.',
    },
    {
      icon: <TrendingUp size={16} />,
      title: 'Track your progress',
      body: 'Accuracy, W/L/D and color-split update automatically as you analyze more games.',
    },
  ];

  return (
    <div className="fade-up" style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      gap: '24px',
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
        <span aria-hidden style={{ fontSize: '32px', lineHeight: 1, filter: 'drop-shadow(0 2px 4px rgba(240,168,64,0.4))' }}>♟</span>
      </div>

      <div>
        <h2 style={{
          fontSize: 'clamp(22px, 3vw, 28px)',
          fontWeight: 700,
          marginBottom: '10px',
          color: 'var(--cm-text-primary)',
          letterSpacing: '-0.4px',
        }}>
          Welcome to ChessMate
        </h2>
        <p style={{ color: 'var(--cm-text-secondary)', fontSize: '14px', maxWidth: '440px', margin: '0 auto', lineHeight: 1.6 }}>
          Three steps to your first analysis — import a game, watch Stockfish
          evaluate it, then ask the AI coach what to drill next.
        </p>
      </div>

      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
        <Button variant="primary" size="lg" leftIcon={<Upload size={14} />} onClick={onImport} style={{ fontWeight: 600 }}>
          Import games
        </Button>
        <Button variant="secondary" size="lg" leftIcon={<Brain size={14} />} onClick={onOpenAnalyze}>
          Open analysis hub
        </Button>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '12px',
          marginTop: '8px',
          maxWidth: '760px',
          width: '100%',
        }}
      >
        {steps.map((s, i) => (
          <div
            key={s.title}
            className={`fade-up fade-up-delay-${Math.min(i + 1, 4) as 1 | 2 | 3 | 4}`}
            style={{
              textAlign: 'left',
              background: 'var(--cm-bg-surface)',
              border: '1px solid var(--cm-border-subtle)',
              borderRadius: '12px',
              padding: '16px',
            }}
          >
            <div
              style={{
                display: 'inline-flex',
                width: '32px',
                height: '32px',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '8px',
                background: 'var(--cm-accent-dim)',
                color: 'var(--cm-accent)',
                border: '1px solid var(--cm-accent-ring)',
                marginBottom: '10px',
              }}
            >
              {s.icon}
            </div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--cm-text-primary)', marginBottom: '4px' }}>
              {s.title}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--cm-text-secondary)', lineHeight: 1.55 }}>
              {s.body}
            </div>
          </div>
        ))}
      </div>
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
