import { test, expect } from '@playwright/test';

// ─────────────────────────────────────────────────────────────────────────────
// Empty-state coverage on unauthenticated landing.
//
// The signed-out shell should expose ONLY the auth form. None of the
// authenticated nav buttons or game UI should leak through, and the auth
// form itself should render its empty-state cues (logo, tagline, forgot
// password link, OAuth options).
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Empty state — unauthenticated landing', () => {
  test('renders the auth empty-state surface (logo, tagline, tabs)', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'ChessMate' })).toBeVisible();
    await expect(page.getByText('AI-powered chess analysis & coaching')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign Up' })).toBeVisible();
  });

  test('does not leak any authenticated nav buttons', async ({ page }) => {
    await page.goto('/');
    for (const name of [/^Import$/, /^Analyze$/, /^Statistics$/, /^Progress$/, /Sign Out/i]) {
      await expect(page.getByRole('button', { name })).not.toBeVisible();
    }
  });

  test('does not render the GameList sidebar', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByPlaceholder('Search games...')).not.toBeVisible();
  });

  test('does not render the welcome / select-a-game pane', async ({ page }) => {
    await page.goto('/');
    await expect(
      page.getByRole('heading', { name: /Select a game to begin/i }),
    ).not.toBeVisible();
  });

  test('exposes both OAuth options as accessible buttons', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('button', { name: /Continue with Google/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Continue with GitHub/i })).toBeVisible();
  });

  test('exposes the forgot-password recovery affordance', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('button', { name: /Forgot password\?/i })).toBeVisible();
  });
});
