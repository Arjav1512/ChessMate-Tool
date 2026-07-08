import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { queryClient } from '../services/queryClient';
import { IMPROVE_QUEUE_KEY, QUEUE_EVENT } from '../features/improve/queue';
import { clearUserState, USER_CACHE_NAMES, USER_LOCAL_KEYS } from './clearUserState';

// ─────────────────────────────────────────────────────────────────────────────
// Sign-out hygiene (audit M2): after clearUserState() no user data may remain
// in the React Query cache, user-scoped localStorage, or the service worker's
// supabase-cache — while device preferences (theme, flags) survive.
// ─────────────────────────────────────────────────────────────────────────────

describe('clearUserState', () => {
  let deleted: string[];

  beforeEach(() => {
    deleted = [];
    vi.stubGlobal('caches', {
      delete: vi.fn(async (name: string) => { deleted.push(name); return true; }),
    });
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    queryClient.clear();
  });

  it('empties the React Query cache', async () => {
    queryClient.setQueryData(['games', 'list'], [{ id: 'g1' }]);
    queryClient.setQueryData(['weeklyFocus'], { title: 'secret' });
    await clearUserState();
    expect(queryClient.getQueryData(['games', 'list'])).toBeUndefined();
    expect(queryClient.getQueryData(['weeklyFocus'])).toBeUndefined();
  });

  it('removes user-scoped localStorage and notifies same-tab listeners', async () => {
    window.localStorage.setItem(IMPROVE_QUEUE_KEY, JSON.stringify([{ gameId: 'g1', ply: 3, motif: 'fork', san: 'Nxd5' }]));
    const onQueue = vi.fn();
    window.addEventListener(QUEUE_EVENT, onQueue);
    await clearUserState();
    window.removeEventListener(QUEUE_EVENT, onQueue);
    expect(window.localStorage.getItem(IMPROVE_QUEUE_KEY)).toBeNull();
    expect(onQueue).toHaveBeenCalled();
  });

  it('preserves device preferences (theme, feature flags)', async () => {
    window.localStorage.setItem('cm.theme', JSON.stringify({ theme: 'light' }));
    window.localStorage.setItem('cm.flags', JSON.stringify({ 'ui.newShell': true }));
    await clearUserState();
    expect(window.localStorage.getItem('cm.theme')).not.toBeNull();
    expect(window.localStorage.getItem('cm.flags')).not.toBeNull();
  });

  it('deletes the service worker supabase-cache bucket', async () => {
    await clearUserState();
    expect(deleted).toEqual([...USER_CACHE_NAMES]);
    expect(deleted).toContain('supabase-cache');
  });

  it('survives an environment without Cache Storage', async () => {
    vi.stubGlobal('caches', undefined);
    await expect(clearUserState()).resolves.toBeUndefined();
  });

  it('classifies the improve queue as user data', () => {
    // Regression pin: if a future key holds user data it must be listed here,
    // and the improve queue must never fall out of the purge list.
    expect(USER_LOCAL_KEYS).toContain(IMPROVE_QUEUE_KEY);
  });
});
