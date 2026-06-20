import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Landing page is the default surface for unauthenticated visits — these
// tests gate the "axe is happy with what we ship to anonymous traffic"
// invariant.

test.describe('Accessibility — landing page', () => {
  // ChessMate is a client-rendered SPA: page.goto('/') resolves on the initial
  // HTML (an empty <div id="root">) before React mounts. Asserting immediately
  // — especially with .count(), which does NOT auto-retry — races the render and
  // intermittently sees zero buttons/landmarks. Wait for the hero <h1> (the
  // landing's render signal) before every test so the suite is deterministic.
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible({ timeout: 15_000 });
  });

  test('axe finds no structural violations on the marketing landing page', async ({ page }) => {
    const results = await new AxeBuilder({ page }).analyze();
    // Color-contrast is covered by its own test below — keep this signal
    // focused on ARIA, role correctness, missing labels, broken landmarks.
    const nonContrast = results.violations.filter((v) => v.id !== 'color-contrast');
    expect(nonContrast).toEqual([]);
  });

  test('exposes an H1 the first time the page loads', async ({ page }) => {
    const h1 = page.getByRole('heading', { level: 1 }).first();
    await expect(h1).toBeVisible();
    await expect(h1).toHaveText(/Get better at chess|ChessMate/i);
  });

  test('first five interactive buttons are keyboard-focusable', async ({ page }) => {
    const buttons = page.getByRole('button');
    await expect(buttons.first()).toBeVisible();
    const count = await buttons.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < Math.min(count, 5); i++) {
      const button = buttons.nth(i);
      // Skip disabled buttons; they're focusable but Playwright reports false.
      const disabled = await button.isDisabled().catch(() => false);
      if (disabled) continue;
      await button.focus();
      await expect(button).toBeFocused();
    }
  });

  test('hero CTAs have accessible names', async ({ page }) => {
    const cta = page.getByRole('button', { name: /Get started/i }).first();
    await expect(cta).toBeVisible();
    await expect(cta).toHaveAccessibleName(/Get started/i);
  });

  test('exposes landmark roles for screen reader navigation', async ({ page }) => {
    // Marketing page uses <nav> (navigation landmark) + <footer> (contentinfo).
    const landmarks = page.locator(
      'nav, footer, [role="main"], [role="navigation"], [role="banner"], [role="contentinfo"]',
    );
    await expect(landmarks.first()).toBeVisible();
    expect(await landmarks.count()).toBeGreaterThan(0);
  });

  // Dark-theme contrast across the hero + nav. After the AA pass (accent-strong
  // button fills, error-bright chips, accent-bright text) this should be clean.
  test('dark-theme has no color-contrast violations on hero + nav', async ({ page }) => {
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-color-scheme', 'dark');
    });
    const results = await new AxeBuilder({ page })
      .include('nav')
      .include('header, main > section:nth-of-type(1)')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    const contrast = results.violations.filter((v) => v.id === 'color-contrast');
    expect(contrast).toEqual([]);
  });

  test('every <img> has an alt attribute', async ({ page }) => {
    const images = page.locator('img');
    const count = await images.count();
    for (let i = 0; i < count; i++) {
      const img = images.nth(i);
      await expect(img).toHaveAttribute('alt');
    }
  });
});
