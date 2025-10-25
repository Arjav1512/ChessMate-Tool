import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { Button } from './Button';
import { Input } from './Input';
import { Card, CardHeader, CardBody } from './Card';
import { ThemeToggle } from './ThemeToggle';
import { isValidEmail, isValidPassword, isValidDisplayName } from '../utils/validation';
import { handleError, logError } from '../utils/errorHandling';

export function AuthForm() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, signUp, signInWithGoogle, signInWithGitHub } = useAuth();
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
      console.log(`Attempting to sign in with ${provider}...`);
      
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
      
      setError(errorInfo.message);
      showToast(errorInfo.message, 'error');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-between mb-6">
            <div></div>
            <ThemeToggle />
          </div>
          <h1 className="text-4xl font-bold text-blue-600 dark:text-blue-400 mb-2">
            ChessMate
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-lg">
            Your Personal Chess Mentor
          </p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex gap-2">
              <Button
                variant={isLogin ? 'primary' : 'secondary'}
                size="md"
                fullWidth
                onClick={() => setIsLogin(true)}
              >
                Sign In
              </Button>
              <Button
                variant={!isLogin ? 'primary' : 'secondary'}
                size="md"
                fullWidth
                onClick={() => setIsLogin(false)}
              >
                Sign Up
              </Button>
            </div>
          </CardHeader>

          <CardBody>
            <form onSubmit={handleSubmit} className="space-y-4">
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
                minLength={6}
                fullWidth
              />

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                loading={loading}
              >
                {isLogin ? 'Sign In' : 'Create Account'}
              </Button>
            </form>

            <div className="flex items-center my-6">
              <div className="flex-1 h-px bg-gray-300 dark:bg-gray-600"></div>
              <span className="px-4 text-sm text-gray-500 dark:text-gray-400">
                OR
              </span>
              <div className="flex-1 h-px bg-gray-300 dark:bg-gray-600"></div>
            </div>

            <div className="space-y-3">
              <Button
                variant="outline"
                size="lg"
                fullWidth
                onClick={() => handleOAuthSignIn('google')}
                loading={loading}
                leftIcon={
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
                    <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853"/>
                    <path d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707 0-.593.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.55 0 9s.348 2.825.957 4.039l3.007-2.332z" fill="#FBBC05"/>
                    <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
                  </svg>
                }
              >
                Continue with Google
              </Button>

              <Button
                variant="outline"
                size="lg"
                fullWidth
                onClick={() => handleOAuthSignIn('github')}
                loading={loading}
                leftIcon={
                  <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
                  </svg>
                }
              >
                Continue with GitHub
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
