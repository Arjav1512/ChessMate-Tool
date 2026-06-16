import { describe, it, expect } from 'vitest';
import { explainOAuthError } from './oauthProviders';

describe('explainOAuthError', () => {
  it('translates "Unsupported provider" into a user-friendly message', () => {
    expect(explainOAuthError('google', 'Unsupported provider: provider is not enabled')).toMatch(
      /Google sign-in isn't enabled/i,
    );
    expect(explainOAuthError('github', 'Unsupported provider')).toMatch(
      /GitHub sign-in isn't enabled/i,
    );
  });

  it('detects "provider not enabled" wording in any form', () => {
    expect(explainOAuthError('google', 'provider is not enabled')).toMatch(/isn't enabled/i);
  });

  it('detects popup-blocker problems', () => {
    expect(explainOAuthError('google', 'Popup window was blocked')).toMatch(/pop-?ups/i);
  });

  it('falls back to a clear prefix for unknown errors', () => {
    expect(explainOAuthError('github', 'Some other error')).toBe('GitHub sign-in failed: Some other error');
  });
});
