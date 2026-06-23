import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Accessibility gate for the Phase 6 Improve Hub. Reached via the dev preview
 * with the per-screen flag on. Real-browser axe so color-contrast is meaningful.
 */
test.describe('Accessibility — Improve Hub', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/improve?shell&ff=ui.screen.improve');
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

  test('route focus on H1; one primary; radar labelled', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1, name: /improvement plan/i })).toBeFocused();
    await expect(page.getByRole('button', { name: /Continue · session/i })).toBeVisible();
    await expect(page.getByRole('img', { name: /Skill profile/i })).toBeVisible();
  });
});
