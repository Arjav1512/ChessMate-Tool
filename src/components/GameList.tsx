import { useEffect, useState } from 'react';
import { Plus, Trash2, Upload, FileText } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import type { Game } from '../lib/supabase';
import { parsePGN, PGNParseError } from '../lib/pgn';

interface GameListProps {
  onSelectGame: (game: Game) => void;
  selectedGameId?: string;
}

export function GameList({ onSelectGame, selectedGameId }: GameListProps) {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pgnText, setPgnText] = useState('');
  const { user } = useAuth();
  const { showToast } = useToast();

  useEffect(() => {
    if (user) {
      loadGames();
    }
  }, [user]);

  const loadGames = async () => {
    if (!user) return;

    setLoading(true);
    const { data, error } = await supabase
      .from('games')
      .select('*')
      .eq('user_id', user.id)
      .order('uploaded_at', { ascending: false });

    if (error) {
      console.error('Error loading games:', error);
    } else {
      setGames(data || []);
    }
    setLoading(false);
    return data;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);

    try {
      const pgnText = await file.text();

      let pgnData;
      try {
        pgnData = parsePGN(pgnText);
      } catch (parseError) {
        console.error('PGN parse error:', parseError);
        if (parseError instanceof PGNParseError) {
          showToast(`${parseError.message}. ${parseError.suggestion || ''}`, 'error');
        } else {
          showToast('Invalid PGN file. The file format could not be parsed.', 'error');
        }
        setUploading(false);
        e.target.value = '';
        return;
      }

      if (!pgnData.moves || pgnData.moves.length === 0) {
        showToast('Invalid PGN file. No valid moves found.', 'error');
        setUploading(false);
        e.target.value = '';
        return;
      }

      const { error } = await supabase.from('games').insert({
        user_id: user.id,
        pgn: pgnText,
        white_player: pgnData.headers.White || 'Unknown',
        black_player: pgnData.headers.Black || 'Unknown',
        result: pgnData.headers.Result || '*',
        date: pgnData.headers.Date || '',
        event: pgnData.headers.Event || '',
      });

      if (error) throw error;

      const updatedGames = await loadGames();
      if (updatedGames && updatedGames.length > 0) {
        onSelectGame(updatedGames[0]);
      }
      showToast('Game uploaded successfully!', 'success');
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
      let pgnData;
      try {
        pgnData = parsePGN(pgnText);
      } catch (parseError) {
        console.error('PGN parse error:', parseError);
        if (parseError instanceof PGNParseError) {
          showToast(`${parseError.message}. ${parseError.suggestion || ''}`, 'error');
        } else {
          showToast('Invalid PGN text. The format could not be parsed.', 'error');
        }
        setUploading(false);
        return;
      }

      if (!pgnData.moves || pgnData.moves.length === 0) {
        showToast('Invalid PGN text. No valid moves found.', 'error');
        setUploading(false);
        return;
      }

      const { error } = await supabase.from('games').insert({
        user_id: user.id,
        pgn: pgnText,
        white_player: pgnData.headers.White || 'Unknown',
        black_player: pgnData.headers.Black || 'Unknown',
        result: pgnData.headers.Result || '*',
        date: pgnData.headers.Date || '',
        event: pgnData.headers.Event || '',
      });

      if (error) throw error;

      const updatedGames = await loadGames();
      if (updatedGames && updatedGames.length > 0) {
        onSelectGame(updatedGames[0]);
      }
      showToast('Game uploaded successfully!', 'success');
      setShowPasteModal(false);
      setPgnText('');
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
      <div className="card">
        <div className="card__header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-semibold)', margin: 0 }}>Your Games</h2>
            <div style={{ display: 'flex', gap: 'var(--space-8)' }}>
              <button
                onClick={() => setShowPasteModal(true)}
                className="btn btn--secondary btn--sm"
                disabled={uploading}
              >
                <FileText style={{ width: '16px', height: '16px' }} />
                <span style={{ marginLeft: 'var(--space-4)' }}>Paste</span>
              </button>
              <label className="btn btn--primary btn--sm" style={{ cursor: 'pointer' }}>
                {uploading ? (
                  <>
                    <Upload style={{ width: '16px', height: '16px' }} className="loading" />
                    <span style={{ marginLeft: 'var(--space-4)' }}>Uploading...</span>
                  </>
                ) : (
                  <>
                    <Plus style={{ width: '16px', height: '16px' }} />
                    <span style={{ marginLeft: 'var(--space-4)' }}>Upload</span>
                  </>
                )}
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
        </div>

        <div className="card__body">
          {loading ? (
            <div style={{ color: 'var(--color-text-secondary)', textAlign: 'center', padding: 'var(--space-32)' }}>Loading games...</div>
          ) : games.length === 0 ? (
            <div style={{ color: 'var(--color-text-secondary)', textAlign: 'center', padding: 'var(--space-32)' }}>
              <p style={{ marginBottom: 'var(--space-8)' }}>No games yet</p>
              <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>Upload a PGN file to get started</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-8)', height: 'calc(100vh - 400px)', minHeight: '300px', maxHeight: '600px', overflowY: 'auto' }}>
              {games.map((game) => (
                <div
                  key={game.id}
                  className="game-item"
                  style={{
                    ...(selectedGameId === game.id && {
                      background: 'var(--color-bg-1)',
                      borderColor: 'var(--color-primary)'
                    })
                  }}
                  onClick={() => onSelectGame(game)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 'var(--space-12)' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3 style={{ fontWeight: 'var(--font-weight-semibold)', marginBottom: 'var(--space-4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {game.white_player} vs {game.black_player}
                      </h3>
                      <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {game.event && `${game.event} • `}
                        {game.date}
                      </p>
                      <div style={{ marginTop: 'var(--space-8)' }}>
                        <span className="status status--info" style={{ fontSize: 'var(--font-size-xs)' }}>{game.result}</span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteGame(game.id);
                      }}
                      className="btn btn--sm"
                      style={{ background: 'transparent', border: 'none', color: 'var(--color-text-secondary)', padding: 'var(--space-8)' }}
                      title="Delete game"
                    >
                      <Trash2 style={{ width: '16px', height: '16px' }} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showPasteModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000,
          padding: 'var(--space-16)'
        }}>
          <div className="card" style={{ padding: 'var(--space-24)', maxWidth: '800px', width: '100%', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-16)' }}>
              <h3 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-semibold)', margin: 0 }}>Paste PGN Text</h3>
              <button
                onClick={() => {
                  setShowPasteModal(false);
                  setPgnText('');
                }}
                style={{ background: 'transparent', border: 'none', color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-2xl)', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>
            <textarea
              value={pgnText}
              onChange={(e) => setPgnText(e.target.value)}
              placeholder="Paste your PGN text here...&#10;&#10;Example:&#10;[Event 'Casual Game']&#10;[White 'Player 1']&#10;[Black 'Player 2']&#10;&#10;1. e4 e5 2. Nf3 Nc6..."
              className="form-control"
              style={{ flex: 1, fontFamily: 'var(--font-family-mono)', fontSize: 'var(--font-size-sm)', resize: 'none', minHeight: '300px' }}
              disabled={uploading}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-8)', marginTop: 'var(--space-16)' }}>
              <button
                onClick={() => {
                  setShowPasteModal(false);
                  setPgnText('');
                }}
                className="btn btn--secondary"
                disabled={uploading}
              >
                Cancel
              </button>
              <button
                onClick={handlePasteSubmit}
                className="btn btn--primary"
                disabled={uploading || !pgnText.trim()}
              >
                {uploading ? (
                  <>
                    <Upload style={{ width: '16px', height: '16px' }} className="loading" />
                    <span style={{ marginLeft: 'var(--space-8)' }}>Uploading...</span>
                  </>
                ) : (
                  <>
                    <Plus style={{ width: '16px', height: '16px' }} />
                    <span style={{ marginLeft: 'var(--space-8)' }}>Add Game</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
