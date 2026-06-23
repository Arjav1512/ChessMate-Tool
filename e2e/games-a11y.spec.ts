import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/** Accessibility gate for Game Library + Import (Phase 7). Dev preview + flag. */
test.describe('Accessibility — Game Library', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/games?shell&ff=ui.screen.games,ui.screen.analysis');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 15_000 });
  });

  test('no structural axe violations', async ({ page }) => {
    const r = await new AxeBuilder({ page }).include('.iv-games').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(r.violations.filter((v) => v.id !== 'color-contrast')).toEqual([]);
  });

  test('no color-contrast violations', async ({ page }) => {
    const r = await new AxeBuilder({ page }).include('.iv-games').withTags(['wcag2aa', 'wcag21aa']).analyze();
    expect(r.violations.filter((v) => v.id === 'color-contrast')).toEqual([]);
  });

  test('table + filters + import action; route focus on H1', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1, name: /your games/i })).toBeFocused();
    await expect(page.getByRole('group', { name: /collections/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Import PGN/i })).toBeVisible();
  });
});

test.describe('Accessibility — Game Import', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/games/import?shell&ff=ui.screen.games,ui.screen.analysis');
    await expect(page.getByRole('heading', { level: 1, name: /add games/i })).toBeVisible({ timeout: 15_000 });
  });

  test('no structural axe violations', async ({ page }) => {
    const r = await new AxeBuilder({ page }).include('.iv-gimport').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(r.violations.filter((v) => v.id !== 'color-contrast')).toEqual([]);
  });

  test('no color-contrast violations', async ({ page }) => {
    const r = await new AxeBuilder({ page }).include('.iv-gimport').withTags(['wcag2aa', 'wcag21aa']).analyze();
    expect(r.violations.filter((v) => v.id === 'color-contrast')).toEqual([]);
  });

  test('source picker + paste field present', async ({ page }) => {
    await expect(page.getByRole('radiogroup', { name: /import source/i })).toBeVisible();
    await expect(page.getByRole('textbox', { name: /paste pgn/i })).toBeVisible();
  });
});
