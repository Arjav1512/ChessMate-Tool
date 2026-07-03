import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { resolveInitialFlags, FLAG_KEYS } from './flags';

/** Helpers to drive the URL + storage sources the resolver reads. */
function setUrl(search: string) {
  window.history.replaceState({}, '', `/${search ? `?${search}` : ''}`);
}

describe('feature flags (§23) — resolution order', () => {
  beforeEach(() => { window.localStorage.clear(); setUrl(''); });
  afterEach(() => { window.localStorage.clear(); setUrl(''); });

  it('post-cutover defaults: Ivory shell + 4 ready screens ON, rest OFF', () => {
    const flags = resolveInitialFlags();
    const on = ['ui.newShell', 'ui.screen.dashboard', 'ui.screen.analysis', 'ui.screen.improve', 'ui.screen.games'];
    for (const k of on) expect(flags[k as (typeof FLAG_KEYS)[number]]).toBe(true);
    // Unbuilt screens stay OFF → graceful PlaceholderPage.
    for (const k of ['ui.screen.coach', 'ui.screen.weaknesses', 'ui.screen.progress', 'ui.screen.settings', 'ui.screen.profile'] as const) {
      expect(flags[k]).toBe(false);
    }
  });

  it('emergency rollback: ?ff=-ui.newShell forces the legacy shell off-default', () => {
    setUrl('ff=-ui.newShell');
    expect(resolveInitialFlags()['ui.newShell']).toBe(false);
  });

  it('localStorage enables a flag', () => {
    window.localStorage.setItem('cm.flags', JSON.stringify({ 'ui.newShell': true }));
    expect(resolveInitialFlags()['ui.newShell']).toBe(true);
  });

  it('URL ?ff= enables listed flags', () => {
    setUrl('ff=ui.newShell,ui.screen.dashboard');
    const flags = resolveInitialFlags();
    expect(flags['ui.newShell']).toBe(true);
    expect(flags['ui.screen.dashboard']).toBe(true);
    expect(flags['ui.screen.coach']).toBe(false);
  });

  it('URL override beats storage (can force-disable with -name)', () => {
    window.localStorage.setItem('cm.flags', JSON.stringify({ 'ui.newShell': true }));
    setUrl('ff=-ui.newShell');
    expect(resolveInitialFlags()['ui.newShell']).toBe(false);
  });

  it('ignores unknown flag keys', () => {
    setUrl('ff=not.a.real.flag');
    const flags = resolveInitialFlags();
    expect(Object.keys(flags)).toEqual([...FLAG_KEYS]);
  });
});
