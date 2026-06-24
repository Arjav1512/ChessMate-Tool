import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Accessibility gate for the Phase 4 Dashboard. Reached via the dev preview with
 * the per-screen flag on: `?shell&ff=ui.screen.dashboard`. Real-browser axe so
 * color-contrast is meaningful (jsdom component tests can't compute it).
 */
test.describe('Accessibility — Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/?shell&ff=ui.screen.dashboard');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 15_000 });
  });

  test('no structural axe violations', async ({ page }) => {
    const results = await new AxeBuilder({ page })
      .include('.dash')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    const nonContrast = results.violations.filter((v) => v.id !== 'color-contrast');
    expect(nonContrast).toEqual([]);
  });

  test('no color-contrast violations on the dashboard', async ({ page }) => {
    const results = await new AxeBuilder({ page })
      .include('.dash')
      .withTags(['wcag2aa', 'wcag21aa'])
      .analyze();
    expect(results.violations.filter((v) => v.id === 'color-contrast')).toEqual([]);
  });

  test('route focus lands on the H1; one primary; Weekly Focus is the hero', async ({ page }) => {
    // Phase 8A: Dashboard simplified to momentum line · Weekly Focus hero · plan
    // strip. The Rating chart moved to Progress; the score is now a momentum line.
    await expect(page.getByRole('heading', { level: 1 })).toBeFocused();
    await expect(page.getByRole('button', { name: /Continue improving/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Improvement score \d+ of 100/i })).toBeVisible();
  });
});
