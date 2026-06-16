import { test, expect } from '@playwright/test';

/**
 * The landing page intercepts unauthenticated visits to "/". The auth form
 * is reached by clicking "Get started free" (or "I already have an account").
 * Tests below set the sessionStorage flag so we skip the landing page and
 * load the AuthForm directly — keeps each test focused on the form itself.
 */
test.use({
  storageState: undefined,
});

async function gotoAuthForm(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    try { window.sessionStorage.setItem('cm.preAuthView', 'auth'); } catch { /* ignore */ }
  });
  await page.goto('/');
}

test.describe('Authentication Form', () => {
  test('should display the auth form on a direct visit', async ({ page }) => {
    await gotoAuthForm(page);
    await expect(page.getByRole('heading', { name: 'ChessMate' })).toBeVisible();
    await expect(page.getByText('AI-powered chess analysis & coaching')).toBeVisible();
    // Both tab and submit can carry "Sign In" — assert the first match (the tab) is visible.
    await expect(page.getByRole('button', { name: 'Sign In', exact: true }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign Up', exact: true }).first()).toBeVisible();
  });

  test('should show email and password inputs', async ({ page }) => {
    await gotoAuthForm(page);
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
  });

  test('should toggle between sign in and sign up', async ({ page }) => {
    await gotoAuthForm(page);
    await page.getByRole('button', { name: 'Sign Up' }).click();
    await expect(page.getByLabel('Name')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create Account' })).toBeVisible();

    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page.getByLabel('Name')).not.toBeVisible();
  });

  test('should show validation error for empty form', async ({ page }) => {
    await gotoAuthForm(page);
    const signInButton = page.getByRole('button', { name: 'Sign In', exact: true }).last();
    await signInButton.click();
    // HTML5 `required` rejects an empty submit; the input's native
    // `validity.valid` becomes false. (Playwright has no `toBeInvalid()`.)
    const isInvalid = await page.getByLabel('Email').evaluate(
      (el) => !(el as HTMLInputElement).validity.valid,
    );
    expect(isInvalid).toBe(true);
  });

  test('should have accessible form labels', async ({ page }) => {
    await gotoAuthForm(page);
    const emailInput = page.getByLabel('Email');
    const passwordInput = page.getByLabel('Password');

    await expect(emailInput).toHaveAttribute('type', 'email');
    await expect(emailInput).toHaveAttribute('required');
    await expect(passwordInput).toHaveAttribute('type', 'password');
    await expect(passwordInput).toHaveAttribute('required');
  });

  test('should have keyboard-accessible tab buttons', async ({ page }) => {
    await gotoAuthForm(page);
    const signInBtn = page.getByRole('button', { name: 'Sign In', exact: true }).first();
    const signUpBtn = page.getByRole('button', { name: 'Sign Up', exact: true }).first();

    await expect(signInBtn).toBeVisible();
    await expect(signUpBtn).toBeVisible();

    await signInBtn.focus();
    await expect(signInBtn).toBeFocused();

    await signUpBtn.focus();
    await expect(signUpBtn).toBeFocused();
  });
});
