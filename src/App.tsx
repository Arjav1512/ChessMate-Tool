import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AuthForm } from './components/AuthForm';
import { GameList } from './components/GameList';
import { ChatInterface } from './components/ChatInterface';
import { ProgressBar } from './components/ProgressBar';
import { AnalyzeGamesPage } from './components/AnalyzeGamesPage';
import { StatsDashboard } from './components/StatsDashboard';
import { ThemeToggle } from './components/ThemeToggle';
import { Button } from './components/Button';
import { CompatibilityWarning } from './components/CompatibilityWarning';
import { useResponsive } from './hooks/useResponsive';
import { LogOut, TrendingUp, Upload, Brain, BarChart3 } from 'lucide-react';
import type { Game } from './lib/supabase';

type ModalType = 'import' | 'progress' | 'analyze' | 'stats' | null;

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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                ChessMate
              </h1>
              <p className="ml-3 text-sm text-gray-500 dark:text-gray-400">
                Your Personal Chess Mentor
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setOpenModal('import')}
                leftIcon={<Upload className="w-4 h-4" />}
              >
                Import
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setOpenModal('analyze')}
                leftIcon={<Brain className="w-4 h-4" />}
              >
                Analyze
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setOpenModal('stats')}
                leftIcon={<BarChart3 className="w-4 h-4" />}
              >
                Statistics
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setOpenModal('progress')}
                leftIcon={<TrendingUp className="w-4 h-4" />}
              >
                Progress
              </Button>
              <ThemeToggle />
              <Button
                variant="outline"
                size="sm"
                onClick={signOut}
                leftIcon={<LogOut className="w-4 h-4" />}
              >
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {showCompatibilityWarning && (
          <CompatibilityWarning onDismiss={() => setShowCompatibilityWarning(false)} />
        )}
        
        <div className={`grid grid-cols-1 ${isMobile ? 'gap-4' : 'lg:grid-cols-4 gap-8'}`}>
          <div className={isMobile ? '' : 'lg:col-span-1'}>
            <GameList
              onSelectGame={setSelectedGame}
              selectedGameId={selectedGame?.id}
            />
          </div>

          <div className={isMobile ? '' : 'lg:col-span-3'}>
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
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
                <div className="max-w-2xl mx-auto">
                  <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                    Welcome to ChessMate
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400 mb-8 text-lg">
                    Your personal AI chess mentor to help you learn and improve.
                  </p>
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6 text-left">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                      Features:
                    </h3>
                    <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                      <p>• Import and manage your chess games</p>
                      <p>• Deep analysis with AI-powered insights</p>
                      <p>• Interactive board with move navigation</p>
                      <p>• Ask questions and get personalized coaching</p>
                      <p>• Track your progress over time</p>
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
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setOpenModal(null)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Import Games
              </h2>
              <button
                onClick={() => setOpenModal(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-2xl font-bold"
              >
                ×
              </button>
            </div>
            <div className="p-6">
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
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setOpenModal(null)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-[95vw] h-[95vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <AnalyzeGamesPage onClose={() => setOpenModal(null)} />
          </div>
        </div>
      )}

      {openModal === 'stats' && <StatsDashboard onClose={() => setOpenModal(null)} />}

      {openModal === 'progress' && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setOpenModal(null)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Your Progress
              </h2>
              <button
                onClick={() => setOpenModal(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-2xl font-bold"
              >
                ×
              </button>
            </div>
            <div className="p-6">
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
