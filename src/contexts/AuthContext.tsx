import { createContext, useContext, useEffect, useState } from 'react';
import { supabase, supabaseConfigured } from '../lib/supabase';
import { handleOAuthCallback, isOAuthCallback, clearOAuthCallback, getOAuthError } from '../lib/oauth';
import type { User } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  /** Non-null when an OAuth callback returned an error (e.g. access_denied). */
  authError: string | null;
  clearAuthError: () => void;
  /** True when the user clicked a password-reset email link and Supabase
   *  emitted a PASSWORD_RECOVERY event. Surfaces the "set new password" UI. */
  passwordRecovery: boolean;
  clearPasswordRecovery: () => void;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithGitHub: () => Promise<void>;
  signOut: () => Promise<void>;
  /** Send a password-reset email. The link in the email lands back at the
   *  app and triggers the PASSWORD_RECOVERY flow. */
  sendPasswordResetEmail: (email: string) => Promise<void>;
  /** Set a new password during the recovery flow. */
  updatePassword: (newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Derive a display_name from auth metadata for OAuth users who never went
// through email signUp. Google sets full_name/name; GitHub sets user_name/name.
// Falls back to the local part of the email address.
function deriveDisplayName(user: User): string {
  const md = (user.user_metadata ?? {}) as Record<string, unknown>;
  const candidates = [md.full_name, md.name, md.user_name, md.preferred_username];
  for (const c of candidates) {
    if (typeof c === 'string' && c.trim()) return c.trim().slice(0, 50);
  }
  if (user.email) return user.email.split('@')[0].slice(0, 50);
  return 'Player';
}

// Insert a profile row if one doesn't already exist. games.user_id FKs
// profiles(id), so OAuth users must have a row before they can upload games.
// ignoreDuplicates ensures we don't clobber a display_name set during email
// signUp or in the Profile modal.
//
// Retries with exponential backoff to survive transient network failures.
// A failure here leaves the user in a broken state (game inserts fail with
// FK violations), so it's worth a handful of retries before giving up.
const PROFILE_RETRY_ATTEMPTS = 4;
const PROFILE_RETRY_BASE_MS = 250;

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function ensureProfileExists(user: User): Promise<{ ok: boolean; error?: string }> {
  let lastError: string | undefined;

  for (let attempt = 0; attempt < PROFILE_RETRY_ATTEMPTS; attempt++) {
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert(
          { id: user.id, email: user.email ?? '', display_name: deriveDisplayName(user) },
          { onConflict: 'id', ignoreDuplicates: true },
        );

      if (!error) {
        if (attempt > 0) {
          console.info(`ensureProfileExists: succeeded on attempt ${attempt + 1}`);
        }
        return { ok: true };
      }

      lastError = error.message;
      console.warn(
        `ensureProfileExists: attempt ${attempt + 1}/${PROFILE_RETRY_ATTEMPTS} failed:`,
        error.message,
      );
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      console.warn(
        `ensureProfileExists: attempt ${attempt + 1}/${PROFILE_RETRY_ATTEMPTS} threw:`,
        lastError,
      );
    }

    // Don't sleep after the final attempt.
    if (attempt < PROFILE_RETRY_ATTEMPTS - 1) {
      const jitter = Math.floor(Math.random() * 100);
      await sleep(PROFILE_RETRY_BASE_MS * Math.pow(2, attempt) + jitter);
    }
  }

  // Final failure — log loud but don't throw. The games INSERT path will
  // surface a clearer error to the user if/when they try to upload.
  console.error('ensureProfileExists: giving up after retries:', lastError);
  return { ok: false, error: lastError };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(supabaseConfigured);
  const [authError, setAuthError] = useState<string | null>(null);
  const [passwordRecovery, setPasswordRecovery] = useState(false);

  const clearAuthError = () => setAuthError(null);
  const clearPasswordRecovery = () => setPasswordRecovery(false);

  useEffect(() => {
    if (!supabaseConfigured) return;

    const initializeAuth = async () => {
      try {
        // Handle OAuth callback if present
        if (isOAuthCallback()) {
          const oauthError = getOAuthError();
          if (oauthError) {
            // Surface the OAuth error to the user instead of silently dropping it
            setAuthError(
              oauthError === 'access_denied'
                ? 'Sign-in was cancelled or access was denied. Please try again.'
                : `Authentication error: ${oauthError}`
            );
          }

          const { success, error } = await handleOAuthCallback();
          if (!success && error) {
            console.error('OAuth callback failed:', error);
            if (!oauthError) setAuthError(`Sign-in failed: ${error}`);
          }

          // Clear OAuth parameters from URL
          clearOAuthCallback();
        }

        // Get current session
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user ?? null);
        if (session?.user) await ensureProfileExists(session.user);
      } catch (error) {
        console.error('Auth initialization error:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (event === 'SIGNED_IN' && session?.user) {
        // Fire-and-forget: the games INSERT path catches FK errors anyway.
        ensureProfileExists(session.user);
      }
      if (event === 'PASSWORD_RECOVERY') {
        setPasswordRecovery(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signUp = async (email: string, password: string, displayName: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;

    if (data.user) {
      const { error: profileError } = await supabase.from('profiles').insert({
        id: data.user.id,
        email,
        display_name: displayName,
      });
      if (profileError) throw profileError;
    }
  };

  const signInWithGoogle = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });
      
      if (error) {
        console.error('Google OAuth error:', error);
        throw new Error(`Google authentication failed: ${error.message}`);
      }
      
      // Log success for debugging
      console.log('Google OAuth initiated successfully', data);
      
      // Handle successful redirect
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error('Failed to initiate Google sign-in:', err);
      throw new Error(`Google sign-in failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const signInWithGitHub = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: `${window.location.origin}`,
        },
      });
      
      if (error) {
        console.error('GitHub OAuth error:', error);
        throw new Error(`GitHub authentication failed: ${error.message}`);
      }
      
      // Log success for debugging
      console.log('GitHub OAuth initiated successfully', data);
      
      // Handle successful redirect
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error('Failed to initiate GitHub sign-in:', err);
      throw new Error(`GitHub sign-in failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const sendPasswordResetEmail = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/?recovery=1`,
    });
    if (error) throw error;
  };

  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
    setPasswordRecovery(false);
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      authError,
      clearAuthError,
      passwordRecovery,
      clearPasswordRecovery,
      signIn,
      signUp,
      signInWithGoogle,
      signInWithGitHub,
      signOut,
      sendPasswordResetEmail,
      updatePassword,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
