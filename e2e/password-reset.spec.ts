import { test, expect } from '@playwright/test';

// ─────────────────────────────────────────────────────────────────────────────
// Password reset flow — request side only.
//
// We don't have access to a real inbox in CI, so we exercise the request page
// (forgot password link → email entry → submit → success state) without
// actually clicking the email link. Reaching the "Set new password" UI from
// a recovery link is covered by component-level tests / manual QA.
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Password reset request flow', () => {
  test('forgot-password link is visible on the sign-in tab', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('button', { name: /Forgot password\?/i })).toBeVisible();
  });

  test('forgot-password link is hidden on the sign-up tab', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Sign Up', exact: true }).first().click();
    await expect(
      page.getByRole('button', { name: /Forgot password\?/i }),
    ).not.toBeVisible();
  });

  test('clicking forgot-password reveals the reset form', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /Forgot password\?/i }).click();
    await expect(page.getByRole('heading', { name: /Reset your password/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Send reset link/i })).toBeVisible();
  });

  test('reset form prefills the email entered above', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel('Email').fill('player@example.com');
    await page.getByRole('button', { name: /Forgot password\?/i }).click();
    await expect(page.getByLabel('Email')).toHaveValue('player@example.com');
  });

  test('reset form rejects an invalid email client-side', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /Forgot password\?/i }).click();
    await page.getByLabel('Email').fill('not-an-email');
    await page.getByRole('button', { name: /Send reset link/i }).click();
    // Either the browser invalid state OR an inline error from our validator.
    const inlineError = page.getByRole('alert');
    const emailField = page.getByLabel('Email');
    const eitherShown = (await inlineError.isVisible()) || (await emailField.evaluate((el) => !(el as HTMLInputElement).validity.valid));
    expect(eitherShown).toBe(true);
  });

  test('"Back to sign in" returns to the credentials form', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /Forgot password\?/i }).click();
    await expect(page.getByRole('heading', { name: /Reset your password/i })).toBeVisible();
    await page.getByRole('button', { name: /Back to sign in/i }).click();
    // Tab switcher is back and password field is visible again.
    await expect(page.getByLabel('Password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign Up' })).toBeVisible();
  });
});
