import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Accessibility gate for the Phase 5 Analysis Workspace. Reached via the dev
 * preview with the per-screen flag on. Real-browser axe so color-contrast is
 * meaningful.
 */
test.describe('Accessibility — Analysis Workspace', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/analysis/sample?shell&ff=ui.screen.analysis');
    await expect(page.getByRole('heading', { level: 1 })).toBeAttached({ timeout: 15_000 });
    // Let progressive analysis settle.
    await page.waitForTimeout(3000);
  });

  test('no structural axe violations', async ({ page }) => {
    const results = await new AxeBuilder({ page })
      .include('.iv-aw')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    const nonContrast = results.violations.filter((v) => v.id !== 'color-contrast');
    expect(nonContrast).toEqual([]);
  });

  test('no color-contrast violations', async ({ page }) => {
    const results = await new AxeBuilder({ page })
      .include('.iv-aw')
      .withTags(['wcag2aa', 'wcag21aa'])
      .analyze();
    expect(results.violations.filter((v) => v.id === 'color-contrast')).toEqual([]);
  });

  test('Analysis is the default tab; Coach is not auto-selected (§14.7)', async ({ page }) => {
    await expect(page.getByRole('tab', { name: 'Analysis' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('tab', { name: 'Coach' })).toHaveAttribute('aria-selected', 'false');
  });

  test('charts are labelled and route focus lands on the H1', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toBeFocused();
    // EvalBar label starts "Evaluation:"; EvalTimeline is "Evaluation timeline …".
    // Disambiguate so neither selector matches both elements.
    await expect(page.getByRole('img', { name: /^Evaluation: / })).toBeVisible();
    await expect(page.getByRole('img', { name: /^Evaluation timeline/ })).toBeVisible();
  });
});
