import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { AuthForm } from './components/AuthForm';
import { GameList } from './components/GameList';
import { ChatInterface } from './components/ChatInterface';
import { ProgressBar } from './components/ProgressBar';
import { AnalyzeGamesPage } from './components/AnalyzeGamesPage';
import { StatsDashboard } from './components/StatsDashboard';
import { LogOut, TrendingUp, Upload, Brain, BarChart3 } from 'lucide-react';
import type { Game } from './lib/supabase';

type ModalType = 'import' | 'progress' | 'analyze' | 'stats' | null;

function MainApp() {
  const { user, signOut } = useAuth();
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [openModal, setOpenModal] = useState<ModalType>(null);

  if (!user) {
    return <AuthForm />;
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-content">
          <div className="logo">
            <h1>ChessMate</h1>
            <p style={{ margin: 0, fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
              Your Personal Chess Mentor
            </p>
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-8)' }}>
            <button onClick={() => setOpenModal('import')} className="btn btn--secondary">
              <Upload style={{ width: '16px', height: '16px' }} />
              <span style={{ marginLeft: 'var(--space-8)' }}>Import</span>
            </button>
            <button onClick={() => setOpenModal('analyze')} className="btn btn--secondary">
              <Brain style={{ width: '16px', height: '16px' }} />
              <span style={{ marginLeft: 'var(--space-8)' }}>Analyze Games</span>
            </button>
            <button onClick={() => setOpenModal('stats')} className="btn btn--secondary">
              <BarChart3 style={{ width: '16px', height: '16px' }} />
              <span style={{ marginLeft: 'var(--space-8)' }}>Statistics</span>
            </button>
            <button onClick={() => setOpenModal('progress')} className="btn btn--secondary">
              <TrendingUp style={{ width: '16px', height: '16px' }} />
              <span style={{ marginLeft: 'var(--space-8)' }}>Progress</span>
            </button>
            <button onClick={signOut} className="btn btn--secondary">
              <LogOut style={{ width: '16px', height: '16px' }} />
              <span style={{ marginLeft: 'var(--space-8)' }}>Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      <main className="app-main">
        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 'var(--space-24)' }}>
          <GameList
            onSelectGame={setSelectedGame}
            selectedGameId={selectedGame?.id}
          />

          <div>
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
              <div className="card" style={{ padding: 'var(--space-32)', textAlign: 'center' }}>
                <div style={{ maxWidth: '600px', margin: '0 auto' }}>
                  <h2 style={{ fontSize: 'var(--font-size-3xl)', marginBottom: 'var(--space-16)' }}>
                    Welcome to ChessMate
                  </h2>
                  <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-24)', lineHeight: 'var(--line-height-normal)' }}>
                    Your personal AI chess mentor to help you learn and improve.
                  </p>
                  <div className="card" style={{ textAlign: 'left', padding: 'var(--space-24)', background: 'var(--color-bg-1)' }}>
                    <h3 style={{ marginBottom: 'var(--space-16)', fontSize: 'var(--font-size-lg)' }}>Features:</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-8)', fontSize: 'var(--font-size-sm)' }}>
                      <p style={{ margin: 0 }}>• Import and manage your chess games</p>
                      <p style={{ margin: 0 }}>• Deep analysis with AI-powered insights</p>
                      <p style={{ margin: 0 }}>• Interactive board with move navigation</p>
                      <p style={{ margin: 0 }}>• Ask questions and get personalized coaching</p>
                      <p style={{ margin: 0 }}>• Track your progress over time</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {openModal === 'import' && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setOpenModal(null)}
        >
          <div
            className="card"
            style={{
              maxWidth: '800px',
              maxHeight: '90vh',
              overflow: 'auto',
              margin: 'var(--space-16)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="card__header">
              <h2>Import Games</h2>
              <button
                onClick={() => setOpenModal(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: 'var(--font-size-2xl)',
                  cursor: 'pointer',
                  color: 'var(--color-text-secondary)',
                  padding: 'var(--space-8)',
                }}
              >
                ×
              </button>
            </div>
            <div className="card__body">
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

      {openModal === 'analyze' && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setOpenModal(null)}
        >
          <div
            className="card"
            style={{
              maxWidth: '95vw',
              width: '95vw',
              maxHeight: '95vh',
              height: '95vh',
              overflow: 'hidden',
              margin: 'var(--space-16)',
              display: 'flex',
              flexDirection: 'column'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <AnalyzeGamesPage onClose={() => setOpenModal(null)} />
          </div>
        </div>
      )}

      {openModal === 'stats' && <StatsDashboard onClose={() => setOpenModal(null)} />}

      {openModal === 'progress' && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setOpenModal(null)}
        >
          <div
            className="card"
            style={{
              maxWidth: '900px',
              maxHeight: '90vh',
              overflow: 'auto',
              margin: 'var(--space-16)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="card__header">
              <h2>Your Progress</h2>
              <button
                onClick={() => setOpenModal(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: 'var(--font-size-2xl)',
                  cursor: 'pointer',
                  color: 'var(--color-text-secondary)',
                  padding: 'var(--space-8)',
                }}
              >
                ×
              </button>
            </div>
            <div className="card__body">
              <ProgressBar />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <MainApp />
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
