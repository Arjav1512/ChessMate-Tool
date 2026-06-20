import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { ThemeToggle } from '../layout/ThemeToggle';
import { PrivacyPage } from '../legal/PrivacyPage';
import { PasswordResetRequest } from './PasswordResetRequest';
import { isValidEmail, isValidPassword, isValidDisplayName } from '../../utils/validation';
import { handleError, logError } from '../../utils/errorHandling';
import { oauthProviders, anyOAuthEnabled, explainOAuthError } from '../../lib/oauthProviders';

interface AuthFormProps {
  /** When provided, render a back-arrow link to the landing page. */
  onBackToLanding?: () => void;
}

export function AuthForm({ onBackToLanding }: AuthFormProps = {}) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [legalView, setLegalView] = useState<'privacy' | 'terms' | null>(null);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const { signIn, signUp, signInWithGoogle, signInWithGitHub, authError, clearAuthError } = useAuth();
  const { showToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Validate inputs
      if (!isValidEmail(email)) {
        setError('Please enter a valid email address');
        setLoading(false);
        return;
      }

      const passwordValidation = isValidPassword(password);
      if (!passwordValidation.valid) {
        setError(passwordValidation.message || 'Invalid password');
        setLoading(false);
        return;
      }

      if (!isLogin) {
        const nameValidation = isValidDisplayName(displayName);
        if (!nameValidation.valid) {
          setError(nameValidation.message || 'Invalid name');
          setLoading(false);
          return;
        }
      }

      if (isLogin) {
        await signIn(email, password);
      } else {
        await signUp(email, password, displayName);
      }
    } catch (err) {
      logError(err, 'AuthForm.handleSubmit');
      const errorInfo = handleError(err);
      setError(errorInfo.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthSignIn = async (provider: 'google' | 'github') => {
    setError('');
    setLoading(true);

    try {
      if (provider === 'google') {
        await signInWithGoogle();
      } else {
        await signInWithGitHub();
      }

      // Note: The user will be redirected to the OAuth provider
      // The loading state will be reset when they return
    } catch (err) {
      logError(err, `AuthForm.handleOAuthSignIn.${provider}`);
      const errorInfo = handleError(err);
      const friendly = explainOAuthError(provider, errorInfo.message);
      setError(friendly);
      showToast(friendly, 'error');
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--cm-bg-base)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
    }}>
      <div className="fade-up" style={{ width: '100%', maxWidth: '400px' }}>
        {onBackToLanding && (
          <button
            type="button"
            onClick={onBackToLanding}
            style={{
              background: 'none',
              border: 'none',
              padding: '4px 0',
              marginBottom: '8px',
              cursor: 'pointer',
              color: 'var(--cm-text-muted)',
              fontSize: '12px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'color 0.15s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--cm-text-primary)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--cm-text-muted)')}
            aria-label="Back to home"
          >
            ← Back to home
          </button>
        )}
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '60px',
            height: '60px',
            background: 'var(--cm-accent-dim)',
            border: '1px solid var(--cm-accent-ring)',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            <span style={{ fontSize: '30px', lineHeight: 1, color: 'var(--cm-accent)', filter: 'drop-shadow(0 2px 6px rgba(240,168,64,0.4))' }}>♟</span>
          </div>
          <h1 style={{
            fontSize: '24px',
            fontWeight: 600,
            color: 'var(--cm-text-primary)',
            marginBottom: '6px',
            letterSpacing: '-0.3px',
          }}>
            Chess<span style={{ color: 'var(--cm-accent)' }}>Mate</span>
          </h1>
          <p style={{ color: 'var(--cm-text-secondary)', fontSize: '13px', margin: 0 }}>
            AI-powered chess analysis & coaching
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: 'var(--cm-bg-elevated)',
          border: '1px solid var(--cm-border-default)',
          borderRadius: '14px',
          padding: '28px',
          boxShadow: '0 16px 40px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.04)',
        }}>
          {/* Tab switcher (hidden during password reset) */}
          {!showForgotPassword && (
            <div style={{
              display: 'flex',
              background: 'var(--cm-bg-surface)',
              borderRadius: '8px',
              padding: '3px',
              marginBottom: '24px',
              border: '1px solid var(--cm-border-subtle)',
            }}>
              {['Sign In', 'Sign Up'].map((label, i) => (
                <button
                  key={label}
                  onClick={() => { setIsLogin(i === 0); clearAuthError(); }}
                  style={{
                    flex: 1,
                    padding: '7px',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: 500,
                    transition: 'all 0.15s',
                    background: (i === 0) === isLogin ? 'var(--cm-bg-elevated)' : 'transparent',
                    color: (i === 0) === isLogin ? 'var(--cm-text-primary)' : 'var(--cm-text-muted)',
                    boxShadow: (i === 0) === isLogin ? '0 1px 3px rgba(0,0,0,0.2)' : 'none',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {showForgotPassword && (
            <PasswordResetRequest
              initialEmail={email}
              onBack={() => { setShowForgotPassword(false); setError(''); }}
            />
          )}

          {!showForgotPassword && (
          <>


          {/* Form */}
          {/* noValidate: use our styled, accessible validation (isValidEmail /
              isValidPassword) instead of inconsistent browser-native popups. */}
          <form noValidate onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {!isLogin && (
              <Input
                label="Name"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
                required={!isLogin}
                fullWidth
              />
            )}
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              fullWidth
            />
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={8}
              autoComplete={isLogin ? 'current-password' : 'new-password'}
              fullWidth
            />

            {isLogin && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '-6px' }}>
                <button
                  type="button"
                  onClick={() => { setShowForgotPassword(true); setError(''); clearAuthError(); }}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    color: 'var(--cm-accent-bright)',
                    fontSize: '12px',
                    textDecoration: 'underline',
                    textUnderlineOffset: '2px',
                  }}
                >
                  Forgot password?
                </button>
              </div>
            )}

            {(error || authError) && (
              <div role="alert" style={{
                padding: '10px 12px',
                background: 'var(--cm-error-dim)',
                border: '1px solid rgba(232,85,74,0.25)',
                borderRadius: '6px',
                color: 'var(--cm-error-bright)',
                fontSize: '13px',
                lineHeight: 1.4,
              }}>
                {authError || error}
              </div>
            )}

            <Button type="submit" variant="primary" size="lg" fullWidth loading={loading}>
              {isLogin ? 'Sign In' : 'Create Account'}
            </Button>
          </form>

          {/* Divider (only when at least one OAuth provider is enabled) */}
          {anyOAuthEnabled() && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '20px 0' }}>
              <div style={{ flex: 1, height: '1px', background: 'var(--cm-border-subtle)' }} />
              <span style={{ fontSize: '11px', color: 'var(--cm-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                or
              </span>
              <div style={{ flex: 1, height: '1px', background: 'var(--cm-border-subtle)' }} />
            </div>
          )}

          {/* OAuth buttons — each gated by its own env flag so an un-configured
              provider never appears as a clickable, guaranteed-to-fail button. */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {oauthProviders.google && (
            <button
              onClick={() => handleOAuthSignIn('google')}
              disabled={loading}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                width: '100%',
                padding: '10px 16px',
                background: 'var(--cm-bg-hover)',
                border: '1px solid var(--cm-border-default)',
                borderRadius: '8px',
                color: 'var(--cm-text-primary)',
                fontSize: '14px',
                fontWeight: 500,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1,
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.borderColor = 'var(--cm-border-strong)'; }}
              onMouseLeave={e => { if (!loading) e.currentTarget.style.borderColor = 'var(--cm-border-default)'; }}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853"/>
                <path d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707 0-.593.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.55 0 9s.348 2.825.957 4.039l3.007-2.332z" fill="#FBBC05"/>
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </button>
            )}

            {oauthProviders.github && (
            <button
              onClick={() => handleOAuthSignIn('github')}
              disabled={loading}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                width: '100%',
                padding: '10px 16px',
                background: 'var(--cm-bg-hover)',
                border: '1px solid var(--cm-border-default)',
                borderRadius: '8px',
                color: 'var(--cm-text-primary)',
                fontSize: '14px',
                fontWeight: 500,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1,
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.borderColor = 'var(--cm-border-strong)'; }}
              onMouseLeave={e => { if (!loading) e.currentTarget.style.borderColor = 'var(--cm-border-default)'; }}
            >
              <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
              </svg>
              Continue with GitHub
            </button>
            )}
          </div>
          </>
          )}
        </div>

        {/* Theme toggle + legal links */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', marginTop: '20px' }}>
          <ThemeToggle />
          <p style={{ fontSize: '11px', color: 'var(--cm-text-muted)', margin: 0, textAlign: 'center' }}>
            By continuing you agree to our{' '}
            <button
              onClick={() => setLegalView('terms')}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                color: 'var(--cm-accent-bright)',
                fontSize: '11px',
                textDecoration: 'underline',
                textUnderlineOffset: '2px',
              }}
            >
              Terms of Service
            </button>
            {' '}and{' '}
            <button
              onClick={() => setLegalView('privacy')}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                color: 'var(--cm-accent-bright)',
                fontSize: '11px',
                textDecoration: 'underline',
                textUnderlineOffset: '2px',
              }}
            >
              Privacy Policy
            </button>
            .
          </p>
        </div>
      </div>

      {legalView && (
        <PrivacyPage view={legalView} onClose={() => setLegalView(null)} />
      )}
    </div>
  );
}
