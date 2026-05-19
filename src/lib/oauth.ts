/**
 * OAuth utility functions for handling authentication callbacks and redirects
 */

import { supabase } from './supabase';

/**
 * Handle OAuth callback after redirect
 * This should be called on app initialization to process any pending OAuth flows
 */
export async function handleOAuthCallback(): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('OAuth callback error:', error);
      return { success: false, error: error.message };
    }
    
    if (data.session) {
      console.log('OAuth callback successful, user authenticated');
      return { success: true };
    }
    
    return { success: false, error: 'No session found' };
  } catch (err) {
    console.error('OAuth callback handler error:', err);
    return { 
      success: false, 
      error: err instanceof Error ? err.message : 'Unknown error' 
    };
  }
}

/**
 * Check if the current URL contains OAuth callback parameters
 */
export function isOAuthCallback(): boolean {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.has('code') || urlParams.has('state') || urlParams.has('error');
}

/**
 * Clear OAuth callback parameters from URL
 */
export function clearOAuthCallback(): void {
  if (isOAuthCallback()) {
    const url = new URL(window.location.href);
    url.searchParams.delete('code');
    url.searchParams.delete('state');
    url.searchParams.delete('error');
    url.searchParams.delete('error_description');
    window.history.replaceState({}, '', url.toString());
  }
}

/**
 * Get OAuth error from URL parameters
 */
export function getOAuthError(): string | null {
  const urlParams = new URLSearchParams(window.location.search);
  const error = urlParams.get('error');
  const errorDescription = urlParams.get('error_description');
  
  if (error) {
    return errorDescription || error;
  }
  
  return null;
}
