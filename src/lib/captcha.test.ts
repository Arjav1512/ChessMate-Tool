import { afterEach, describe, expect, it, vi } from 'vitest';

// captcha reads import.meta.env at module load, so each case stubs the env and
// re-imports a fresh module instance.
async function loadCaptcha(siteKey?: string) {
  vi.resetModules();
  if (siteKey === undefined) vi.stubEnv('VITE_CAPTCHA_SITE_KEY', '');
  else vi.stubEnv('VITE_CAPTCHA_SITE_KEY', siteKey);
  return import('./captcha');
}

describe('captcha seam (audit item 15 — prepared, disabled by default)', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('is disabled and returns no token when no site key is configured', async () => {
    const captcha = await loadCaptcha(undefined);
    expect(captcha.captchaEnabled()).toBe(false);
    expect(captcha.captchaSiteKey()).toBeUndefined();
    await expect(captcha.getCaptchaToken()).resolves.toBeUndefined();
  });

  it('reports enabled and exposes the key when a site key is set', async () => {
    const captcha = await loadCaptcha('test-site-key');
    expect(captcha.captchaEnabled()).toBe(true);
    expect(captcha.captchaSiteKey()).toBe('test-site-key');
  });

  it('fails loudly if enabled but no provider widget is wired', async () => {
    // Guards against silently shipping an unprotected auth form after someone
    // sets the key without implementing the provider.
    const captcha = await loadCaptcha('test-site-key');
    await expect(captcha.getCaptchaToken()).rejects.toThrow(/no provider widget is wired/i);
  });
});
