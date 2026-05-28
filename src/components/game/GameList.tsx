import { useEffect, useState, useCallback, memo, useMemo } from 'react';
import { Trash2, Upload, FileText, Plus } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { useDebounce } from '../../hooks/useDebounce';
import { usePerformance } from '../../hooks/usePerformance';
import type { Game } from '../../lib/supabase';
import { parsePGN, splitPGN, PGNParseError } from '../../lib/pgn';

interface GameListProps {
  onSelectGame: (game: Game) => void;
  selectedGameId?: string;
}

const PAGE_SIZE = 50;

function GameListComponent({ onSelectGame, selectedGameId }: GameListProps) {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pgnText, setPgnText] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const { user } = useAuth();
  const { showToast } = useToast();
  const { logRender, measureAsync } = usePerformance();

  // Debounce search term to avoid excessive filtering
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const loadGames = useCallback(async () => {
    if (!user) return [];

    return await measureAsync('loadGames', async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('games')
          .select('*')
          .eq('user_id', user.id)
          .order('uploaded_at', { ascending: false })
          .range(0, PAGE_SIZE - 1);

        if (error) {
          console.error('Error loading games:', error);
          return [];
        }
        const rows = data || [];
        setGames(rows);
        setHasMore(rows.length === PAGE_SIZE);
        return rows;
      } finally {
        setLoading(false);
      }
    });
  }, [user, measureAsync]);

  const loadMore = useCallback(async () => {
    if (!user || loadingMore) return;
    setLoadingMore(true);
    try {
      const from = games.length;
      const { data, error } = await supabase
        .from('games')
        .select('*')
        .eq('user_id', user.id)
        .order('uploaded_at', { ascending: false })
        .range(from, from + PAGE_SIZE - 1);

      if (error) {
        console.error('Error loading more games:', error);
        return;
      }
      const rows = data || [];
      setGames(prev => [...prev, ...rows]);
      setHasMore(rows.length === PAGE_SIZE);
    } finally {
      setLoadingMore(false);
    }
  }, [user, games.length, loadingMore]);

  useEffect(() => {
    if (user) {
      loadGames();
    }
  }, [user, loadGames]);

  // Memoize filtered games to avoid recalculating on every render
  const filteredGames = useMemo(() => {
    if (!debouncedSearchTerm) return games;

    return games.filter(game =>
      game.white_player?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
      game.black_player?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
      game.event?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
      game.result?.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
    );
  }, [games, debouncedSearchTerm]);

  // Log render performance
  useEffect(() => {
    logRender('GameList');
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);

    try {
      const rawText = await file.text();
      const gameTexts = splitPGN(rawText);

      if (gameTexts.length === 0) {
        showToast('No valid PGN games found in the file.', 'error');
        setUploading(false);
        e.target.value = '';
        return;
      }

      let imported = 0;
      let firstParseError: string | null = null;

      for (const gameText of gameTexts) {
        let pgnData;
        try {
          pgnData = parsePGN(gameText);
        } catch (parseError) {
          console.error('PGN parse error:', parseError);
          if (!firstParseError) {
            firstParseError = parseError instanceof PGNParseError
              ? `${parseError.message}. ${parseError.suggestion || ''}`
              : 'One or more games could not be parsed.';
          }
          continue; // skip unparseable games, try remaining
        }

        if (!pgnData.moves || pgnData.moves.length === 0) continue;

        const { error } = await supabase.from('games').insert({
          user_id: user.id,
          pgn: gameText,
          white_player: pgnData.headers.White || 'Unknown',
          black_player: pgnData.headers.Black || 'Unknown',
          result: pgnData.headers.Result || '*',
          date: pgnData.headers.Date || '',
          event: pgnData.headers.Event || '',
        });

        if (error) {
          console.error('DB insert error:', error);
        } else {
          imported++;
        }
      }

      if (imported === 0) {
        showToast(firstParseError || 'Failed to import any games from the file.', 'error');
      } else {
        const updatedGames = await loadGames();
        if (updatedGames && updatedGames.length > 0) {
          onSelectGame(updatedGames[0]);
        }
        const skipped = gameTexts.length - imported;
        if (skipped > 0) {
          showToast(`Imported ${imported} game${imported !== 1 ? 's' : ''} (${skipped} skipped).`, 'success');
        } else {
          showToast(
            imported === 1 ? 'Game uploaded successfully!' : `${imported} games uploaded successfully!`,
            'success'
          );
        }
      }
    } catch (error) {
      console.error('Error uploading game:', error);
      showToast('Failed to upload game. Please try again.', 'error');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handlePasteSubmit = async () => {
    if (!pgnText.trim() || !user) return;

    setUploading(true);

    try {
      const gameTexts = splitPGN(pgnText);

      if (gameTexts.length === 0) {
        showToast('No valid PGN games found in the pasted text.', 'error');
        setUploading(false);
        return;
      }

      let imported = 0;
      let firstParseError: string | null = null;

      for (const gameText of gameTexts) {
        let pgnData;
        try {
          pgnData = parsePGN(gameText);
        } catch (parseError) {
          console.error('PGN parse error:', parseError);
          if (!firstParseError) {
            firstParseError = parseError instanceof PGNParseError
              ? `${parseError.message}. ${parseError.suggestion || ''}`
              : 'One or more games could not be parsed.';
          }
          continue;
        }

        if (!pgnData.moves || pgnData.moves.length === 0) continue;

        const { error } = await supabase.from('games').insert({
          user_id: user.id,
          pgn: gameText,
          white_player: pgnData.headers.White || 'Unknown',
          black_player: pgnData.headers.Black || 'Unknown',
          result: pgnData.headers.Result || '*',
          date: pgnData.headers.Date || '',
          event: pgnData.headers.Event || '',
        });

        if (error) {
          console.error('DB insert error:', error);
        } else {
          imported++;
        }
      }

      if (imported === 0) {
        showToast(firstParseError || 'Failed to import any games from the pasted text.', 'error');
      } else {
        const updatedGames = await loadGames();
        if (updatedGames && updatedGames.length > 0) {
          onSelectGame(updatedGames[0]);
        }
        const skipped = gameTexts.length - imported;
        if (skipped > 0) {
          showToast(`Imported ${imported} game${imported !== 1 ? 's' : ''} (${skipped} skipped).`, 'success');
        } else {
          showToast(
            imported === 1 ? 'Game uploaded successfully!' : `${imported} games uploaded successfully!`,
            'success'
          );
        }
        setShowPasteModal(false);
        setPgnText('');
      }
    } catch (error) {
      console.error('Error uploading game:', error);
      showToast('Failed to upload game. Please try again.', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteGame = async (gameId: string) => {
    if (!confirm('Are you sure you want to delete this game?')) return;

    const { error } = await supabase.from('games').delete().eq('id', gameId);

    if (error) {
      console.error('Error deleting game:', error);
      showToast('Failed to delete game.', 'error');
    } else {
      await loadGames();
      showToast('Game deleted successfully.', 'success');
    }
  };

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Header */}
        <div style={{ padding: '16px', borderBottom: '1px solid var(--cm-border-subtle)' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '12px',
          }}>
            <span style={{
              fontSize: '11px',
              fontWeight: 600,
              color: 'var(--cm-text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.6px',
            }}>
              Games ({filteredGames.length})
            </span>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                onClick={() => setShowPasteModal(true)}
                disabled={uploading}
                title="Paste PGN"
                aria-label="Paste PGN text"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '28px',
                  height: '28px',
                  background: 'var(--cm-bg-elevated)',
                  border: '1px solid var(--cm-border-default)',
                  borderRadius: '6px',
                  cursor: uploading ? 'not-allowed' : 'pointer',
                  color: 'var(--cm-text-secondary)',
                  opacity: uploading ? 0.5 : 1,
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => { if (!uploading) { e.currentTarget.style.borderColor = 'var(--cm-border-strong)'; e.currentTarget.style.color = 'var(--cm-text-primary)'; }}}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--cm-border-default)'; e.currentTarget.style.color = 'var(--cm-text-secondary)'; }}
              >
                <FileText size={13} />
              </button>
              <label
                title="Upload PGN file"
                aria-label="Upload PGN file"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '28px',
                  height: '28px',
                  background: uploading ? 'var(--cm-bg-elevated)' : 'var(--cm-accent)',
                  border: '1px solid transparent',
                  borderRadius: '6px',
                  cursor: uploading ? 'not-allowed' : 'pointer',
                  color: uploading ? 'var(--cm-text-secondary)' : 'var(--cm-text-inverse)',
                  opacity: uploading ? 0.6 : 1,
                  transition: 'all 0.15s',
                }}
              >
                {uploading ? <Upload size={13} /> : <Plus size={13} />}
                <input
                  type="file"
                  accept=".pgn"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                  disabled={uploading}
                />
              </label>
            </div>
          </div>

          {/* Search */}
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search games..."
              style={{
                width: '100%',
                padding: '7px 10px',
                background: 'var(--cm-bg-base)',
                border: '1px solid var(--cm-border-subtle)',
                borderRadius: '6px',
                color: 'var(--cm-text-primary)',
                fontSize: '13px',
                outline: 'none',
                boxSizing: 'border-box',
                fontFamily: 'inherit',
                transition: 'border-color 0.15s',
              }}
              onFocus={e => (e.currentTarget.style.borderColor = 'var(--cm-accent)')}
              onBlur={e => (e.currentTarget.style.borderColor = 'var(--cm-border-subtle)')}
            />
          </div>
        </div>

        {/* Game list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {[70, 55, 80, 60, 72].map((width, i) => (
                <div key={i} className="skeleton-game-item">
                  <div className="skeleton skeleton-title" style={{ width: `${width}%` }} />
                  <div className="skeleton skeleton-text" style={{ width: '45%', height: '10px' }} />
                </div>
              ))}
            </div>
          ) : filteredGames.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 16px' }}>
              <FileText size={28} style={{ color: 'var(--cm-text-muted)', margin: '0 auto 10px', display: 'block' }} />
              <p style={{ color: 'var(--cm-text-muted)', fontSize: '13px', margin: 0, lineHeight: 1.5 }}>
                {searchTerm ? 'No matching games' : 'No games yet.\nImport a PGN to start.'}
              </p>
            </div>
          ) : (
            <>
              {filteredGames.map(game => {
                const isActive = selectedGameId === game.id;
                return (
                  <div
                    key={game.id}
                    className={`game-item${isActive ? ' game-item--active' : ''}`}
                    onClick={() => onSelectGame(game)}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      marginBottom: '2px',
                      background: isActive ? 'var(--cm-bg-active)' : 'transparent',
                      border: `1px solid ${isActive ? 'var(--cm-border-default)' : 'transparent'}`,
                      transition: 'all 0.15s',
                      position: 'relative',
                    }}
                    onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--cm-bg-hover)'; }}
                    onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: '13px',
                          fontWeight: 500,
                          color: 'var(--cm-text-primary)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          marginBottom: '3px',
                        }}>
                          {game.white_player || '?'} vs {game.black_player || '?'}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--cm-text-muted)', display: 'flex', gap: '4px', alignItems: 'center' }}>
                          <span style={{
                            background: 'var(--cm-bg-elevated)',
                            border: '1px solid var(--cm-border-subtle)',
                            borderRadius: '3px',
                            padding: '0 4px',
                            fontSize: '10px',
                            fontWeight: 600,
                            color: 'var(--cm-text-secondary)',
                          }}>
                            {game.result || '?'}
                          </span>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {game.event || 'Unknown'}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteGame(game.id);
                        }}
                        className="game-delete-btn"
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: 'var(--cm-text-muted)',
                          padding: '2px',
                          borderRadius: '4px',
                          opacity: 0,
                          transition: 'opacity 0.15s, color 0.15s',
                          display: 'flex',
                          alignItems: 'center',
                          flexShrink: 0,
                        }}
                        onMouseEnter={e => (e.currentTarget.style.color = 'var(--cm-error)')}
                        onMouseLeave={e => (e.currentTarget.style.color = 'var(--cm-text-muted)')}
                        title="Delete game"
                        aria-label="Delete game"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* Load more */}
              {hasMore && !debouncedSearchTerm && (
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  style={{
                    display: 'block',
                    width: '100%',
                    marginTop: '6px',
                    padding: '8px',
                    background: 'var(--cm-bg-elevated)',
                    border: '1px solid var(--cm-border-subtle)',
                    borderRadius: '7px',
                    color: loadingMore ? 'var(--cm-text-muted)' : 'var(--cm-text-secondary)',
                    fontSize: '12px',
                    fontWeight: 500,
                    cursor: loadingMore ? 'not-allowed' : 'pointer',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { if (!loadingMore) e.currentTarget.style.borderColor = 'var(--cm-border-strong)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--cm-border-subtle)'; }}
                >
                  {loadingMore ? 'Loading…' : 'Load more'}
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Paste PGN Modal */}
      {showPasteModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            padding: '16px',
          }}
          onClick={() => { setShowPasteModal(false); setPgnText(''); }}
        >
          <div
            style={{
              background: 'var(--cm-bg-surface)',
              border: '1px solid var(--cm-border-default)',
              borderRadius: '12px',
              boxShadow: '0 24px 48px rgba(0,0,0,0.4)',
              maxWidth: '700px',
              width: '100%',
              maxHeight: '80vh',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 20px',
              borderBottom: '1px solid var(--cm-border-subtle)',
            }}>
              <span style={{ fontWeight: 600, fontSize: '15px', color: 'var(--cm-text-primary)' }}>
                Paste PGN Text
              </span>
              <button
                onClick={() => { setShowPasteModal(false); setPgnText(''); }}
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

            <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px', overflow: 'auto' }}>
              <textarea
                value={pgnText}
                onChange={(e) => setPgnText(e.target.value)}
                placeholder={"Paste your PGN text here...\n\nExample:\n[Event 'Casual Game']\n[White 'Player 1']\n[Black 'Player 2']\n\n1. e4 e5 2. Nf3 Nc6..."}
                style={{
                  flex: 1,
                  minHeight: '280px',
                  padding: '12px',
                  background: 'var(--cm-bg-base)',
                  border: '1px solid var(--cm-border-default)',
                  borderRadius: '8px',
                  color: 'var(--cm-text-primary)',
                  fontSize: '13px',
                  fontFamily: 'var(--font-family-mono)',
                  resize: 'vertical',
                  outline: 'none',
                  transition: 'border-color 0.15s',
                }}
                onFocus={e => (e.currentTarget.style.borderColor = 'var(--cm-accent)')}
                onBlur={e => (e.currentTarget.style.borderColor = 'var(--cm-border-default)')}
                disabled={uploading}
              />

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  onClick={() => { setShowPasteModal(false); setPgnText(''); }}
                  disabled={uploading}
                  style={{
                    padding: '8px 16px',
                    background: 'var(--cm-bg-elevated)',
                    border: '1px solid var(--cm-border-default)',
                    borderRadius: '7px',
                    color: 'var(--cm-text-secondary)',
                    fontSize: '13px',
                    fontWeight: 500,
                    cursor: uploading ? 'not-allowed' : 'pointer',
                    opacity: uploading ? 0.5 : 1,
                    transition: 'all 0.15s',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handlePasteSubmit}
                  disabled={uploading || !pgnText.trim()}
                  style={{
                    padding: '8px 16px',
                    background: uploading || !pgnText.trim() ? 'var(--cm-bg-elevated)' : 'var(--cm-accent)',
                    border: '1px solid transparent',
                    borderRadius: '7px',
                    color: uploading || !pgnText.trim() ? 'var(--cm-text-muted)' : 'var(--cm-text-inverse)',
                    fontSize: '13px',
                    fontWeight: 500,
                    cursor: uploading || !pgnText.trim() ? 'not-allowed' : 'pointer',
                    transition: 'all 0.15s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  {uploading ? (
                    <>
                      <Upload size={14} />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Plus size={14} />
                      Add Game
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Memoize the component to prevent unnecessary re-renders
export const GameList = memo(GameListComponent, (prevProps, nextProps) => {
  return (
    prevProps.selectedGameId === nextProps.selectedGameId &&
    prevProps.onSelectGame === nextProps.onSelectGame
  );
});
