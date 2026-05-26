import { useState, useEffect } from 'react';
import { X, User } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { LoadingSpinner } from '../ui/LoadingSpinner';

interface ProfileModalProps {
  onClose: () => void;
}

export function ProfileModal({ onClose }: ProfileModalProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('profiles')
      .select('display_name')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        setDisplayName(data?.display_name ?? '');
        setLoading(false);
      });
  }, [user]);

  const handleSave = async () => {
    if (!user || !displayName.trim()) return;
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({ display_name: displayName.trim(), updated_at: new Date().toISOString() })
      .eq('id', user.id);
    setSaving(false);
    if (error) {
      showToast('Failed to update profile.', 'error');
    } else {
      showToast('Profile updated! Stats will reflect your new name.', 'success');
      onClose();
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 300,
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--cm-bg-surface)',
          border: '1px solid var(--cm-border-default)',
          borderRadius: '12px',
          boxShadow: '0 24px 48px rgba(0,0,0,0.4)',
          maxWidth: '420px',
          width: '100%',
          overflow: 'hidden',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: '1px solid var(--cm-border-subtle)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <User size={15} style={{ color: 'var(--cm-text-muted)' }} />
            <span style={{ fontWeight: 600, fontSize: '15px', color: 'var(--cm-text-primary)' }}>
              Your Profile
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--cm-text-muted)',
              padding: '4px',
              borderRadius: '4px',
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

        {/* Body */}
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '24px' }}>
              <LoadingSpinner size="md" />
            </div>
          ) : (
            <>
              {/* Email — read-only */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: 500,
                  color: 'var(--cm-text-secondary)',
                  marginBottom: '6px',
                }}>
                  Email
                </label>
                <div style={{
                  padding: '8px 12px',
                  background: 'var(--cm-bg-elevated)',
                  border: '1px solid var(--cm-border-subtle)',
                  borderRadius: '7px',
                  fontSize: '13px',
                  color: 'var(--cm-text-muted)',
                }}>
                  {user?.email}
                </div>
              </div>

              {/* Display Name */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: 500,
                  color: 'var(--cm-text-secondary)',
                  marginBottom: '4px',
                }}>
                  Display Name
                </label>
                <p style={{
                  fontSize: '11px',
                  color: 'var(--cm-text-muted)',
                  margin: '0 0 8px',
                  lineHeight: 1.5,
                }}>
                  Set this to match your name as it appears in PGN files. This enables accurate
                  win/loss tracking and color distribution in Statistics & Progress.
                </p>
                <input
                  type="text"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  placeholder="e.g. Magnus Carlsen"
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: 'var(--cm-bg-base)',
                    border: '1px solid var(--cm-border-default)',
                    borderRadius: '7px',
                    color: 'var(--cm-text-primary)',
                    fontSize: '13px',
                    outline: 'none',
                    boxSizing: 'border-box',
                    fontFamily: 'inherit',
                    transition: 'border-color 0.15s',
                  }}
                  onFocus={e => (e.currentTarget.style.borderColor = 'var(--cm-accent)')}
                  onBlur={e => (e.currentTarget.style.borderColor = 'var(--cm-border-default)')}
                  onKeyDown={e => { if (e.key === 'Enter') handleSave(); }}
                />
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '4px' }}>
                <button
                  onClick={onClose}
                  disabled={saving}
                  style={{
                    padding: '8px 16px',
                    background: 'var(--cm-bg-elevated)',
                    border: '1px solid var(--cm-border-default)',
                    borderRadius: '7px',
                    color: 'var(--cm-text-secondary)',
                    fontSize: '13px',
                    fontWeight: 500,
                    cursor: saving ? 'not-allowed' : 'pointer',
                    opacity: saving ? 0.5 : 1,
                    transition: 'all 0.15s',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !displayName.trim()}
                  style={{
                    padding: '8px 16px',
                    background: saving || !displayName.trim() ? 'var(--cm-bg-elevated)' : 'var(--cm-accent)',
                    border: '1px solid transparent',
                    borderRadius: '7px',
                    color: saving || !displayName.trim() ? 'var(--cm-text-muted)' : 'var(--cm-text-inverse)',
                    fontSize: '13px',
                    fontWeight: 500,
                    cursor: saving || !displayName.trim() ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.15s',
                  }}
                >
                  {saving ? <><LoadingSpinner size="sm" /> Saving…</> : 'Save Changes'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
