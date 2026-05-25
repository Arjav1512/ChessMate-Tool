import { useState } from 'react';
import { GameList } from '../game/GameList';
import { GameViewer } from '../game/GameViewer';
import { BulkAnalysis } from './BulkAnalysis';
import { Microscope, List, X } from 'lucide-react';
import { useResponsive } from '../../hooks/useResponsive';
import type { Game } from '../../lib/supabase';

interface AnalyzeGamesPageProps {
  onClose: () => void;
}

type ViewMode = 'board' | 'bulk';

export function AnalyzeGamesPage({ onClose }: AnalyzeGamesPageProps) {
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('board');
  const { isMobile } = useResponsive();

  const tabBtnStyle = (active: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '7px 14px',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 500,
    transition: 'all 0.15s',
    background: active ? 'var(--cm-bg-active)' : 'transparent',
    color: active ? 'var(--cm-text-primary)' : 'var(--cm-text-secondary)',
  });

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 20px',
        borderBottom: '1px solid var(--cm-border-subtle)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div>
            <span style={{ fontWeight: 600, fontSize: '15px', color: 'var(--cm-text-primary)' }}>
              Analyze Games
            </span>
            <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--cm-text-muted)' }}>
              Deep analysis with AI-powered insights
            </p>
          </div>

          {/* Tab switcher */}
          <div style={{
            display: 'flex',
            background: 'var(--cm-bg-elevated)',
            borderRadius: '8px',
            padding: '3px',
            border: '1px solid var(--cm-border-subtle)',
            gap: '2px',
          }}>
            <button onClick={() => setViewMode('board')} style={tabBtnStyle(viewMode === 'board')}>
              <Microscope size={14} />
              Board Analysis
            </button>
            <button onClick={() => setViewMode('bulk')} style={tabBtnStyle(viewMode === 'bulk')}>
              <List size={14} />
              Bulk Analysis
            </button>
          </div>
        </div>

        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--cm-text-muted)',
            padding: '6px',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            transition: 'color 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--cm-text-primary)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--cm-text-muted)')}
        >
          <X size={18} />
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
        {viewMode === 'board' ? (
          <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', width: '100%', height: '100%' }}>
            {/* Sidebar game list — stacks above board on mobile */}
            <div style={{
              width: isMobile ? '100%' : '280px',
              maxHeight: isMobile ? '220px' : undefined,
              flexShrink: 0,
              borderRight: isMobile ? 'none' : '1px solid var(--cm-border-subtle)',
              borderBottom: isMobile ? '1px solid var(--cm-border-subtle)' : 'none',
              overflow: 'auto',
              background: 'var(--cm-bg-surface)',
            }}>
              <GameList
                onSelectGame={setSelectedGame}
                selectedGameId={selectedGame?.id}
              />
            </div>

            {/* Board area */}
            <div style={{ flex: 1, overflow: 'auto', padding: isMobile ? '12px' : '20px', background: 'var(--cm-bg-base)' }}>
              {selectedGame ? (
                <GameViewer
                  game={selectedGame}
                  onAskQuestion={(question, context) => {
                    console.log('Ask question:', question, context);
                  }}
                />
              ) : (
                <div style={{
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                  padding: '40px',
                }}>
                  <div style={{ maxWidth: '480px' }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>♟</div>
                    <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '10px', color: 'var(--cm-text-primary)' }}>
                      Select a Game to Analyze
                    </h2>
                    <p style={{ color: 'var(--cm-text-secondary)', fontSize: '14px', lineHeight: 1.6 }}>
                      Choose a game from the list to view the analysis board with move-by-move evaluation,
                      best move arrows, and position analysis.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, overflow: 'auto', padding: '20px', background: 'var(--cm-bg-base)' }}>
            <BulkAnalysis />
          </div>
        )}
      </div>
    </div>
  );
}
