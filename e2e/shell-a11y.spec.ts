import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Accessibility gate for the new Ivory app shell (Phase 3.5).
 *
 * The shell is reachable without auth via the `?shell` dev preview, which mounts
 * the routed shell (post-cutover `/` → the real Dashboard). These tests certify the shell
 * CHROME (sidebar nav, command menu, keyboard model, contrast) — the surface
 * Phase 3.5 is responsible for. Real-browser rendering means color-contrast is
 * meaningful here (jsdom component tests cannot compute it).
 */
test.describe('Accessibility — Ivory app shell', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/?shell');
    // Shell render signal: the primary nav "Dashboard" link.
    await expect(page.getByRole('link', { name: /Dashboard/ })).toBeVisible({ timeout: 15_000 });
  });

  test('no structural axe violations on the shell', async ({ page }) => {
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    const nonContrast = results.violations.filter((v) => v.id !== 'color-contrast');
    expect(nonContrast).toEqual([]);
  });

  test('sidebar chrome has no color-contrast violations', async ({ page }) => {
    const results = await new AxeBuilder({ page })
      .include('.ivs-sidebar')
      .exclude('.ivs-sidebar__search') // placeholder text is --text-faint by spec (§6)
      .withTags(['wcag2aa', 'wcag21aa'])
      .analyze();
    const contrast = results.violations.filter((v) => v.id === 'color-contrast');
    expect(contrast).toEqual([]);
  });

  test('command menu opens on Ctrl/⌘+K, traps focus, closes on Escape, and is contrast-clean', async ({ page }) => {
    await page.keyboard.press('Control+k');
    const dialog = page.getByRole('dialog', { name: 'Command menu' });
    await expect(dialog).toBeVisible();
    await expect(page.getByRole('combobox')).toBeFocused();

    // Contrast over the open menu (type first so no placeholder is measured).
    await page.getByRole('combobox').fill('a');
    const results = await new AxeBuilder({ page })
      .include('.ivs-cmdk')
      .withTags(['wcag2aa', 'wcag21aa'])
      .analyze();
    expect(results.violations.filter((v) => v.id === 'color-contrast')).toEqual([]);

    // Tab stays trapped on the input (combobox pattern).
    await page.keyboard.press('Tab');
    await expect(page.getByRole('combobox')).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
  });

  test('skip-to-content link is the first tab stop and keyboard-focusable', async ({ page }) => {
    // Contract: the skip link is the first focusable element in the shell (before
    // the nav) and can take keyboard focus. Asserted structurally to avoid racing
    // the route-focus pattern (real screens focus their <h1> on mount).
    const skip = page.getByRole('link', { name: /Skip to content/i });
    await expect(skip).toHaveAttribute('href', '#ivs-main');
    const firstIsSkip = await page.evaluate(() => {
      const focusables = [...document.querySelectorAll<HTMLElement>('a[href], button, input, select, textarea, [tabindex]')]
        .filter((e) => e.tabIndex >= 0 && !e.hasAttribute('disabled'));
      return focusables[0]?.classList.contains('ivs-skiplink') ?? false;
    });
    expect(firstIsSkip).toBe(true);
    await skip.focus();
    await expect(skip).toBeFocused();
  });
});
