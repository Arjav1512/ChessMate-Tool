import { test, expect } from '@playwright/test';

const SAMPLE_PGN = `[Event "Test Game"]
[Site "Online"]
[Date "2024.01.15"]
[White "Player1"]
[Black "Player2"]
[Result "1-0"]

1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7
6. Re1 b5 7. Bb3 d6 8. c3 O-O 9. h3 Nb8 10. d4 Nbd7 1-0`;

// ─────────────────────────────────────────────────────────────────────────────
// NOTE: The game import flow is only accessible to authenticated users.
// These tests are skipped in CI until test credentials / auth fixtures are set
// up via PLAYWRIGHT_TEST_USER and PLAYWRIGHT_TEST_PASSWORD env vars.
//
// To enable locally, create a .env.test with those variables and run:
//   npx playwright test e2e/game-import.spec.ts
// ─────────────────────────────────────────────────────────────────────────────

const needsAuth = !process.env.PLAYWRIGHT_TEST_USER;

test.describe('Game Import Flow (requires auth)', () => {
  test.skip(needsAuth, 'Skipped: set PLAYWRIGHT_TEST_USER / PLAYWRIGHT_TEST_PASSWORD to enable');

  test.beforeEach(async ({ page }) => {
    // Sign in using env-supplied credentials before each test.
    await page.goto('/');
    await page.getByLabel('Email').fill(process.env.PLAYWRIGHT_TEST_USER!);
    await page.getByLabel('Password').fill(process.env.PLAYWRIGHT_TEST_PASSWORD!);
    await page.getByRole('button', { name: 'Sign In', exact: true }).last().click();
    // Wait for the main app to be ready.
    await expect(page.getByRole('button', { name: /Import/i })).toBeVisible({ timeout: 10_000 });
  });

  test('should show import modal when import button is clicked', async ({ page }) => {
    await page.getByRole('button', { name: /Import/i }).click();

    await expect(page.getByRole('heading', { name: 'Import Games' })).toBeVisible();
  });

  test('should have upload and paste tabs', async ({ page }) => {
    await page.getByRole('button', { name: /Import/i }).click();

    await expect(page.getByRole('button', { name: /Upload/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Paste/i })).toBeVisible();
  });

  test('should accept PGN text input', async ({ page }) => {
    await page.getByRole('button', { name: /Import/i }).click();
    await page.getByRole('button', { name: /Paste/i }).click();

    const textarea = page.getByPlaceholder(/Paste your PGN/i);
    await expect(textarea).toBeVisible();
    await textarea.fill(SAMPLE_PGN);

    await expect(textarea).toHaveValue(SAMPLE_PGN);
  });

  test('should show validation for empty PGN', async ({ page }) => {
    await page.getByRole('button', { name: /Import/i }).click();
    await page.getByRole('button', { name: /Paste/i }).click();

    const addButton = page.getByRole('button', { name: /Add Game/i });
    await addButton.click();

    await expect(page.getByText(/Empty or invalid PGN/i)).toBeVisible();
  });

  test('should close modal on cancel', async ({ page }) => {
    await page.getByRole('button', { name: /Import/i }).click();

    await expect(page.getByRole('heading', { name: 'Import Games' })).toBeVisible();

    const closeButton = page.getByRole('button', { name: '×' });
    await closeButton.click();

    await expect(page.getByRole('heading', { name: 'Import Games' })).not.toBeVisible();
  });

  test('should have accessible file input', async ({ page }) => {
    await page.getByRole('button', { name: /Import/i }).click();

    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toHaveAttribute('accept', '.pgn');
  });

  test('should handle keyboard shortcuts', async ({ page }) => {
    await page.getByRole('button', { name: /Import/i }).click();

    await page.keyboard.press('Escape');
    await expect(page.getByRole('heading', { name: 'Import Games' })).not.toBeVisible();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Auth-page smoke test (always runs, no credentials needed)
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Auth page smoke test', () => {
  test('landing renders the marketing hero and routes to the sign-in form', async ({ page }) => {
    await page.goto('/');

    // The default unauthenticated surface is the marketing LandingPage: an H1
    // hero and a primary "Get started" CTA, not the auth form directly.
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
    const getStarted = page.getByRole('button', { name: /Get started/i }).first();
    await expect(getStarted).toBeVisible();

    // The Import button (authenticated-only) must not be visible to anonymous visitors.
    await expect(page.getByRole('button', { name: /^Import$/i })).not.toBeVisible();

    // Clicking the CTA reveals the sign-in form with an Email field.
    await getStarted.click();
    await expect(page.getByLabel('Email')).toBeVisible();
  });

  test('shows accessible custom validation on invalid submit', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /Get started/i }).first().click();
    await expect(page.getByLabel('Email')).toBeVisible();

    // The form uses noValidate so our styled, announced validation runs instead
    // of inconsistent browser-native popups. An invalid email must surface a
    // role="alert" error, not silently no-op.
    await page.getByLabel('Email').fill('not-an-email');
    await page.getByLabel('Password').fill('x');
    await page.getByRole('button', { name: /^Sign In$/i }).last().click();
    await expect(page.getByRole('alert')).toContainText(/valid email/i);
  });
});
