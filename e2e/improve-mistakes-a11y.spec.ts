import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Accessibility gate for Improve → Review Mistakes (Phase 7). Reached via the dev
 * preview with the per-screen flag on. Real-browser axe so contrast is meaningful.
 */
test.describe('Accessibility — Review Mistakes', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/improve/mistakes?shell&ff=ui.screen.improve,ui.screen.analysis');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 15_000 });
  });

  test('no structural axe violations', async ({ page }) => {
    const results = await new AxeBuilder({ page })
      .include('.iv-improve')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    expect(results.violations.filter((v) => v.id !== 'color-contrast')).toEqual([]);
  });

  test('no color-contrast violations', async ({ page }) => {
    const results = await new AxeBuilder({ page })
      .include('.iv-improve')
      .withTags(['wcag2aa', 'wcag21aa'])
      .analyze();
    expect(results.violations.filter((v) => v.id === 'color-contrast')).toEqual([]);
  });

  test('feed + one Primary + view switcher', async ({ page }) => {
    await expect(page.getByRole('group', { name: /mistake filters/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Open in Analysis/i })).toBeVisible();
    await expect(page.getByRole('radiogroup', { name: /improve view/i })).toBeVisible();
  });
});
