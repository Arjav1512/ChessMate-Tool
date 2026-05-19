import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should display login page for unauthenticated users', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { name: 'ChessMate' })).toBeVisible();
    await expect(page.getByText('Your Personal Chess Mentor')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign Up' })).toBeVisible();
  });

  test('should show email and password inputs', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
  });

  test('should display OAuth buttons', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('button', { name: /Continue with Google/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Continue with GitHub/i })).toBeVisible();
  });

  test('should toggle between sign in and sign up', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('button', { name: 'Sign Up' }).click();
    await expect(page.getByLabel('Name')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create Account' })).toBeVisible();

    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page.getByLabel('Name')).not.toBeVisible();
  });

  test('should show validation error for empty form', async ({ page }) => {
    await page.goto('/');

    const signInButton = page.getByRole('button', { name: 'Sign In', exact: true }).last();
    await signInButton.click();

    await expect(page.getByLabel('Email')).toBeInvalid();
  });

  test('should have accessible form labels', async ({ page }) => {
    await page.goto('/');

    const emailInput = page.getByLabel('Email');
    const passwordInput = page.getByLabel('Password');

    await expect(emailInput).toHaveAttribute('type', 'email');
    await expect(emailInput).toHaveAttribute('required');
    await expect(passwordInput).toHaveAttribute('type', 'password');
    await expect(passwordInput).toHaveAttribute('required');
  });

  test('should have keyboard navigation', async ({ page }) => {
    await page.goto('/');

    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: 'Sign In', exact: true }).first()).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: 'Sign Up', exact: true }).first()).toBeFocused();
  });
});
