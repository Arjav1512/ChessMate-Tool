import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { ThemeToggle } from '../layout/ThemeToggle';
import { isValidPassword } from '../../utils/validation';
import { handleError, logError } from '../../utils/errorHandling';

/**
 * Shown after the user clicks a password-reset email link and Supabase fires
 * the PASSWORD_RECOVERY event. Captures the new password and resets it.
 *
 * Rendered standalone (no AuthForm wrapper) so the user sees ONLY this screen
 * during the recovery flow and can't accidentally sign in / sign up instead.
 */
export function PasswordResetComplete() {
  const { updatePassword, signOut, clearPasswordRecovery } = useAuth();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const validation = isValidPassword(password);
    if (!validation.valid) {
      setError(validation.message || 'Invalid password');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await updatePassword(password);
      setDone(true);
    } catch (err) {
      logError(err, 'PasswordResetComplete.handleSubmit');
      const info = handleError(err);
      setError(info.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    clearPasswordRecovery();
    // The recovery link signs the user in implicitly. Sign them back out so
    // a hijacked email link can't leave a live session behind.
    try {
      await signOut();
    } catch {
      // Ignore — the AuthForm reload covers the worst case.
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--cm-bg-base)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
    >
      <div className="fade-up" style={{ width: '100%', maxWidth: '400px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div
            style={{
              width: '60px',
              height: '60px',
              background: 'var(--cm-accent-dim)',
              border: '1px solid var(--cm-accent-ring)',
              borderRadius: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}
          >
            <span
              style={{
                fontSize: '30px',
                lineHeight: 1,
                color: 'var(--cm-accent)',
                filter: 'drop-shadow(0 2px 6px rgba(240,168,64,0.4))',
              }}
            >
              ♟
            </span>
          </div>
          <h1
            style={{
              fontSize: '20px',
              fontWeight: 600,
              color: 'var(--cm-text-primary)',
              marginBottom: '6px',
              letterSpacing: '-0.3px',
            }}
          >
            Set a new password
          </h1>
          <p style={{ color: 'var(--cm-text-secondary)', fontSize: '13px', margin: 0 }}>
            Choose a strong password you don&rsquo;t use elsewhere.
          </p>
        </div>

        <div
          style={{
            background: 'var(--cm-bg-elevated)',
            border: '1px solid var(--cm-border-default)',
            borderRadius: '14px',
            padding: '28px',
            boxShadow:
              '0 16px 40px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.04)',
          }}
        >
          {done ? (
            <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <h2
                style={{
                  fontSize: '16px',
                  fontWeight: 600,
                  color: 'var(--cm-text-primary)',
                  margin: 0,
                }}
              >
                Password updated
              </h2>
              <p
                style={{
                  fontSize: '13px',
                  color: 'var(--cm-text-secondary)',
                  margin: 0,
                  lineHeight: 1.5,
                }}
              >
                Your password has been changed. You&rsquo;re now signed in.
              </p>
              <Button
                variant="primary"
                size="lg"
                fullWidth
                onClick={() => clearPasswordRecovery()}
              >
                Continue
              </Button>
            </div>
          ) : (
            <form
              noValidate
              onSubmit={handleSubmit}
              style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
            >
              <Input
                label="New password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={8}
                autoComplete="new-password"
                fullWidth
              />
              <Input
                label="Confirm new password"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••"
                required
                minLength={8}
                autoComplete="new-password"
                fullWidth
              />

              {error && (
                <div
                  role="alert"
                  style={{
                    padding: '10px 12px',
                    background: 'var(--cm-error-dim)',
                    border: '1px solid rgba(232,85,74,0.25)',
                    borderRadius: '6px',
                    color: 'var(--cm-error-bright)',
                    fontSize: '13px',
                    lineHeight: 1.4,
                  }}
                >
                  {error}
                </div>
              )}

              <Button type="submit" variant="primary" size="lg" fullWidth loading={loading}>
                Update password
              </Button>
              <button
                type="button"
                onClick={handleCancel}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  color: 'var(--cm-text-muted)',
                  fontSize: '12px',
                  textAlign: 'center',
                  textDecoration: 'underline',
                  textUnderlineOffset: '2px',
                }}
              >
                Cancel and sign out
              </button>
            </form>
          )}
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            marginTop: '20px',
          }}
        >
          <ThemeToggle />
        </div>
      </div>
    </div>
  );
}
