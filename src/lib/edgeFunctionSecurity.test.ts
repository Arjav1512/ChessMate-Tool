import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// ─────────────────────────────────────────────────────────────────────────────
// Edge Function security regression tests (AUD-01 / AUD-03).
//
// These do NOT execute the Deno function — that needs a Supabase runtime. They
// are structural guards over the source so the security posture can't silently
// regress in a future edit:
//
//   1. The chess-mentor function VERIFIES the caller's JWT via auth.getUser()
//      and does NOT fall back to trusting an unverified base64 decode of the
//      token (a forged `sub` would otherwise bypass per-user rate limiting).
//   2. CORS fails CLOSED: with no ALLOWED_ORIGINS configured, only localhost
//      is echoed; arbitrary request origins are not reflected.
//   3. supabase/config.toml pins verify_jwt = true for chess-mentor so the
//      platform rejects bad tokens before the function runs (defense-in-depth).
// ─────────────────────────────────────────────────────────────────────────────

const ROOT = join(__dirname, '..', '..');
const FN_SRC = readFileSync(
  join(ROOT, 'supabase', 'functions', 'chess-mentor', 'index.ts'),
  'utf-8',
);
const CONFIG = readFileSync(join(ROOT, 'supabase', 'config.toml'), 'utf-8');

describe('chess-mentor edge function — authentication', () => {
  it('verifies the JWT via auth.getUser() before trusting the caller', () => {
    expect(FN_SRC).toMatch(/auth\.getUser\(\s*token\s*\)/);
  });

  it('does not derive identity from an unverified base64 JWT decode', () => {
    // The old, insecure helper trusted payload.sub without verifying the
    // signature. It must be gone.
    expect(FN_SRC).not.toContain('getUserIdFromJWT');
    expect(FN_SRC).not.toMatch(/payload\.sub/);
  });

  it('rejects callers without a verified user id', () => {
    expect(FN_SRC).toMatch(/getVerifiedUserId/);
    expect(FN_SRC).toMatch(/status:\s*401/);
  });
});

describe('chess-mentor edge function — CORS', () => {
  it('fails closed when no allowlist is configured (localhost only)', () => {
    expect(FN_SRC).toMatch(/isLocalhostOrigin/);
    // The previous behaviour echoed any origin (`origin || "*"`) — ensure the
    // permissive wildcard fallback is gone.
    expect(FN_SRC).not.toMatch(/origin\s*\|\|\s*["']\*["']/);
  });
});

describe('supabase config — edge function JWT verification', () => {
  it('pins verify_jwt = true for chess-mentor', () => {
    expect(CONFIG).toMatch(/\[functions\.chess-mentor\]/);
    expect(CONFIG).toMatch(/verify_jwt\s*=\s*true/);
  });
});
