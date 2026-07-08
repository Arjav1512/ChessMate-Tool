/**
 * CAPTCHA integration seam (audit item 15) — prepared, not enabled.
 *
 * Signup/sign-in are currently ungated. Supabase Auth has built-in CAPTCHA
 * support (hCaptcha / Cloudflare Turnstile): with it enabled in the dashboard,
 * every auth call must carry a `captchaToken`. This module is the single client
 * seam for that, wired so turning CAPTCHA ON is a configuration change, not a
 * code change:
 *
 *   1. Set `VITE_CAPTCHA_SITE_KEY` (build-time) and enable the matching provider
 *      in Supabase → Authentication → Settings → Bot & Abuse Protection.
 *   2. Render the provider widget on the auth form and feed its token to
 *      `getCaptchaToken()` (replace the stub below with the provider's
 *      `execute()` call — no other code changes needed; AuthContext already
 *      threads the token into Supabase).
 *
 * Default (no site key): `captchaEnabled()` is false and `getCaptchaToken()`
 * returns `undefined`, so auth behaves exactly as it does today. No provider
 * script or dependency is bundled until a key is set.
 */

// Treat an unset var and an empty `VITE_CAPTCHA_SITE_KEY=` (as shipped in
// .env.example) identically: both mean "disabled".
const RAW_SITE_KEY = import.meta.env.VITE_CAPTCHA_SITE_KEY as string | undefined;
const SITE_KEY = RAW_SITE_KEY ? RAW_SITE_KEY : undefined;

/** True only when a CAPTCHA site key is configured at build time. */
export function captchaEnabled(): boolean {
  return Boolean(SITE_KEY);
}

/** The configured provider site key (undefined when CAPTCHA is off). */
export function captchaSiteKey(): string | undefined {
  return SITE_KEY;
}

/**
 * Resolve a CAPTCHA token for an auth request, or `undefined` when CAPTCHA is
 * disabled (the default) so callers pass nothing to Supabase and behavior is
 * unchanged.
 *
 * When enabled, this must return a fresh provider token. It intentionally
 * throws rather than returning `undefined` in the enabled-but-unwired state, so
 * a misconfiguration fails loudly at development time instead of silently
 * shipping an unprotected auth form.
 */
export async function getCaptchaToken(): Promise<string | undefined> {
  if (!captchaEnabled()) return undefined;
  // ── Wire the provider here (e.g. hCaptcha/Turnstile `execute()`) ──────────
  throw new Error(
    'CAPTCHA is enabled (VITE_CAPTCHA_SITE_KEY is set) but no provider widget is ' +
    'wired. Implement getCaptchaToken() in src/lib/captcha.ts before enabling.',
  );
}
