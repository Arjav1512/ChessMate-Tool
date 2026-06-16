import { test, expect } from '@playwright/test';

// ─────────────────────────────────────────────────────────────────────────────
// Empty-state coverage on unauthenticated landing.
//
// Visiting "/" while signed-out lands on the marketing/landing page. The
// authenticated app shell, the auth form, and the GameList sidebar must not
// leak through. Clicking "Get started" transitions into the auth form view.
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Landing page (unauthenticated)', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try { window.sessionStorage.removeItem('cm.preAuthView'); } catch { /* ignore */ }
    });
  });

  test('renders the hero with primary + secondary CTAs', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /Get better at chess/i })).toBeVisible();
    await expect(
      page.getByRole('button', { name: /Get started free/i }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: /I already have an account/i }),
    ).toBeVisible();
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

  test('does not render the welcome / authenticated empty state', async ({ page }) => {
    await page.goto('/');
    await expect(
      page.getByRole('heading', { name: /Welcome to ChessMate/i }),
    ).not.toBeVisible();
  });

  test('exposes section anchors for features / how it works / FAQ', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('link', { name: /Features/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /How it works/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /FAQ/i })).toBeVisible();
  });

  test('hides OAuth buttons when no provider env flags are set', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /Get started free/i }).first().click();
    // We're now on the auth form. Default env: both providers disabled
    // → no Continue-with-Google / Continue-with-GitHub buttons.
    await expect(
      page.getByRole('button', { name: /Continue with Google/i }),
    ).not.toBeVisible();
    await expect(
      page.getByRole('button', { name: /Continue with GitHub/i }),
    ).not.toBeVisible();
  });
});

test.describe('Landing → auth form transition', () => {
  test('clicking Get Started reveals the sign-in form', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /Get started free/i }).first().click();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
    await expect(page.getByRole('button', { name: /Forgot password\?/i })).toBeVisible();
  });

  test('Back to home link returns to the landing page', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /Get started free/i }).first().click();
    await page.getByRole('button', { name: /Back to home/i }).click();
    await expect(page.getByRole('heading', { name: /Get better at chess/i })).toBeVisible();
  });
});
