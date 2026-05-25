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
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithGitHub: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(supabaseConfigured);
  const [authError, setAuthError] = useState<string | null>(null);

  const clearAuthError = () => setAuthError(null);

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
      } catch (error) {
        console.error('Auth initialization error:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
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

  return (
    <AuthContext.Provider value={{ user, loading, authError, clearAuthError, signIn, signUp, signInWithGoogle, signInWithGitHub, signOut }}>
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
