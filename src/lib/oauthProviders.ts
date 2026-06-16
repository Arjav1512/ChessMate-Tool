/**
 * OAuth provider availability — driven by Vite env flags so an
 * un-configured Supabase project never shows a button that's
 * guaranteed to fail.
 *
 * `VITE_OAUTH_GOOGLE_ENABLED=true` / `VITE_OAUTH_GITHUB_ENABLED=true`
 * in `.env.local` flips the button on. Defaults are `false` so a fresh
 * clone of the repo doesn't strand users on "provider is not enabled".
 *
 * The flag does NOT replace the dashboard-side provider setup. It is a
 * UX gate. Owners still need to configure the provider in Supabase
 * before flipping the flag.
 */

const TRUTHY = new Set(['1', 'true', 'yes', 'on']);

function isEnabled(envValue: string | undefined): boolean {
  if (!envValue) return false;
  return TRUTHY.has(envValue.trim().toLowerCase());
}

export const oauthProviders = {
  google: isEnabled(import.meta.env.VITE_OAUTH_GOOGLE_ENABLED as string | undefined),
  github: isEnabled(import.meta.env.VITE_OAUTH_GITHUB_ENABLED as string | undefined),
} as const;

export type OAuthProvider = keyof typeof oauthProviders;

export function isOAuthProviderEnabled(p: OAuthProvider): boolean {
  return oauthProviders[p];
}

/**
 * True iff at least one OAuth provider is enabled — used to decide
 * whether to render the "or" divider above the OAuth section.
 */
export function anyOAuthEnabled(): boolean {
  return oauthProviders.google || oauthProviders.github;
}

/**
 * Translate the raw Supabase "Unsupported provider" error into a
 * user-actionable message. Called from the catch path so even with a
 * stale build, the user sees something helpful.
 */
export function explainOAuthError(provider: OAuthProvider, raw: string): string {
  const lc = raw.toLowerCase();
  const label = provider === 'google' ? 'Google' : 'GitHub';
  if (lc.includes('unsupported provider') || lc.includes('not enabled')) {
    return `${label} sign-in isn't enabled for this project yet.`;
  }
  if (lc.includes('popup') && lc.includes('block')) {
    return `Your browser blocked the ${label} sign-in popup. Allow pop-ups and try again.`;
  }
  return `${label} sign-in failed: ${raw}`;
}
