import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { resolveInitialFlags, FLAG_KEYS } from './flags';

/** Helpers to drive the URL + storage sources the resolver reads. */
function setUrl(search: string) {
  window.history.replaceState({}, '', `/${search ? `?${search}` : ''}`);
}

describe('feature flags (§23) — resolution order', () => {
  beforeEach(() => { window.localStorage.clear(); setUrl(''); });
  afterEach(() => { window.localStorage.clear(); setUrl(''); });

  it('defaults every flag to OFF (production unchanged)', () => {
    const flags = resolveInitialFlags();
    for (const k of FLAG_KEYS) expect(flags[k]).toBe(false);
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
