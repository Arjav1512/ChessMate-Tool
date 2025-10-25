import { useState } from 'react';
import { GameList } from './GameList';
import { GameViewer } from './GameViewer';
import { BulkAnalysis } from './BulkAnalysis';
import { Microscope, List } from 'lucide-react';
import type { Game } from '../lib/supabase';

interface AnalyzeGamesPageProps {
  onClose: () => void;
}

type ViewMode = 'board' | 'bulk';

export function AnalyzeGamesPage({ onClose }: AnalyzeGamesPageProps) {
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('board');

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="card__header" style={{ borderBottom: '1px solid var(--color-border)' }}>
        <div>
          <h2>Analyze Games</h2>
          <p style={{ margin: 0, fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
            Deep analysis of your chess games with AI-powered insights
          </p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-8)', alignItems: 'center' }}>
          <div style={{
            display: 'flex',
            gap: '0',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--border-radius)',
            overflow: 'hidden'
          }}>
            <button
              onClick={() => setViewMode('board')}
              className={viewMode === 'board' ? 'btn btn--primary' : 'btn btn--secondary'}
              style={{
                borderRadius: 0,
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-8)',
                padding: 'var(--space-8) var(--space-16)'
              }}
            >
              <Microscope style={{ width: '16px', height: '16px' }} />
              <span>Board Analysis</span>
            </button>
            <button
              onClick={() => setViewMode('bulk')}
              className={viewMode === 'bulk' ? 'btn btn--primary' : 'btn btn--secondary'}
              style={{
                borderRadius: 0,
                border: 'none',
                borderLeft: '1px solid var(--color-border)',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-8)',
                padding: 'var(--space-8) var(--space-16)'
              }}
            >
              <List style={{ width: '16px', height: '16px' }} />
              <span>Bulk Analysis</span>
            </button>
          </div>
          <button
            onClick={onClose}
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
      </div>

      <div style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
        {viewMode === 'board' ? (
          <div style={{ display: 'flex', width: '100%', height: '100%' }}>
            <div style={{
              width: '320px',
              borderRight: '1px solid var(--color-border)',
              overflow: 'auto',
              background: 'var(--color-bg-1)'
            }}>
              <GameList
                onSelectGame={setSelectedGame}
                selectedGameId={selectedGame?.id}
              />
            </div>

            <div style={{ flex: 1, overflow: 'auto', padding: 'var(--space-24)' }}>
              {selectedGame ? (
                <GameViewer
                  game={selectedGame}
                  onAskQuestion={(question, context) => {
                    console.log('Ask question:', question, context);
                  }}
                />
              ) : (
                <div className="card" style={{ padding: 'var(--space-32)', textAlign: 'center' }}>
                  <div style={{ maxWidth: '600px', margin: '0 auto' }}>
                    <h2 style={{ fontSize: 'var(--font-size-2xl)', marginBottom: 'var(--space-16)' }}>
                      Select a Game to Analyze
                    </h2>
                    <p style={{ color: 'var(--color-text-secondary)', lineHeight: 'var(--line-height-normal)' }}>
                      Choose a game from the list to view the analysis board with move-by-move evaluation,
                      best move arrows, and position analysis.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, overflow: 'auto', padding: 'var(--space-24)' }}>
            <BulkAnalysis />
          </div>
        )}
      </div>
    </div>
  );
}
