import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export function AuthForm() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await signIn(email, password);
      } else {
        if (!displayName.trim()) {
          setError('Please enter your name');
          setLoading(false);
          return;
        }
        await signUp(email, password, displayName);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--color-background)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 'var(--space-16)'
    }}>
      <div style={{ width: '100%', maxWidth: '480px' }}>
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-32)' }}>
          <h1 style={{
            fontSize: 'var(--font-size-4xl)',
            fontWeight: 'var(--font-weight-bold)',
            color: 'var(--color-primary)',
            marginBottom: 'var(--space-8)'
          }}>
            ChessMate
          </h1>
          <p style={{
            color: 'var(--color-text-secondary)',
            fontSize: 'var(--font-size-lg)'
          }}>
            Your Personal Chess Mentor
          </p>
        </div>

        <div className="card" style={{ padding: 'var(--space-32)' }}>
          <div style={{ display: 'flex', gap: 'var(--space-8)', marginBottom: 'var(--space-24)' }}>
            <button
              onClick={() => setIsLogin(true)}
              className={isLogin ? 'btn btn--primary btn--full-width' : 'btn btn--secondary btn--full-width'}
            >
              Sign In
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={!isLogin ? 'btn btn--primary btn--full-width' : 'btn btn--secondary btn--full-width'}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            {!isLogin && (
              <div className="form-group">
                <label className="form-label">Name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="form-control"
                  placeholder="Your name"
                  required={!isLogin}
                />
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="form-control"
                placeholder="you@example.com"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="form-control"
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>

            {error && (
              <div style={{
                padding: 'var(--space-12)',
                background: 'rgba(var(--color-error-rgb), 0.1)',
                border: '1px solid rgba(var(--color-error-rgb), 0.3)',
                borderRadius: 'var(--radius-base)',
                color: 'var(--color-error)',
                fontSize: 'var(--font-size-sm)',
                marginBottom: 'var(--space-16)'
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn btn--primary btn--full-width"
            >
              {loading ? 'Processing...' : isLogin ? 'Sign In' : 'Create Account'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
