/**
 * Sign-out hygiene (audit M2): purge every client-side trace of the user's
 * data when their session ends, so the next person on a shared computer
 * cannot see residue of the previous account.
 *
 * Cleared:
 *  - the React Query cache (games, analysis, dashboard view-models, …)
 *  - the in-memory weakness-profile and mistake-review session caches
 *  - user-scoped localStorage (the Send-to-Improve queue)
 *  - the service worker's `supabase-cache` in Cache Storage, where the PWA's
 *    NetworkFirst strategy keeps copies of authenticated API responses
 *    (vite.config.ts runtimeCaching)
 *
 * Deliberately kept: `cm.flags` (device/QA feature toggles) and the theme
 * preference — device settings, not personal data.
 *
 * Wired via `installSignOutCleanup()` from main.tsx — an auth-event listener
 * rather than a call inside AuthContext.signOut, so it also fires when
 * Supabase ends the session without a click (token expiry, sign-out from
 * another tab) and so this module's imports (hooks → AuthContext) never form
 * an import cycle with the context.
 */
import { queryClient } from '../services/queryClient';
import { supabase } from './supabase';
import { invalidateWeaknessProfile } from '../hooks/useWeaknessProfile';
import { invalidateMistakeReview } from '../hooks/useMistakeReview';
import { IMPROVE_QUEUE_KEY, QUEUE_EVENT } from '../features/improve/queue';

/** localStorage keys that hold user data (not device preferences). */
export const USER_LOCAL_KEYS: readonly string[] = [IMPROVE_QUEUE_KEY];

/** Cache Storage buckets that can contain authenticated API responses. */
export const USER_CACHE_NAMES: readonly string[] = ['supabase-cache'];

export async function clearUserState(): Promise<void> {
  // 1. Server-state mirrors in memory.
  queryClient.clear();
  invalidateWeaknessProfile();
  invalidateMistakeReview();

  // 2. User-scoped localStorage. Notify same-tab listeners (the DOM `storage`
  //    event only fires cross-tab) so a mounted Improve screen re-reads.
  try {
    for (const key of USER_LOCAL_KEYS) window.localStorage.removeItem(key);
    window.dispatchEvent(new Event(QUEUE_EVENT));
  } catch { /* privacy mode / quota — nothing to clear */ }

  // 3. Service-worker runtime caches holding API responses.
  try {
    if (typeof caches !== 'undefined') {
      await Promise.all(USER_CACHE_NAMES.map((name) => caches.delete(name)));
    }
  } catch { /* Cache Storage unavailable (older browser, sandboxed frame) */ }
}

let installed = false;

/**
 * Subscribe once to Supabase auth events and purge client state whenever the
 * session ends. Idempotent; returns immediately on repeat calls.
 */
export function installSignOutCleanup(): void {
  if (installed) return;
  installed = true;
  supabase.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT') void clearUserState();
  });
}
