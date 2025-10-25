import { test, expect } from '@playwright/test';

const SAMPLE_PGN = `[Event "Test Game"]
[Site "Online"]
[Date "2024.01.15"]
[White "Player1"]
[Black "Player2"]
[Result "1-0"]

1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7
6. Re1 b5 7. Bb3 d6 8. c3 O-O 9. h3 Nb8 10. d4 Nbd7 1-0`;

test.describe('Game Import Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should show import modal when import button is clicked', async ({ page }) => {
    await page.getByRole('button', { name: /Import/i }).click();

    await expect(page.getByRole('heading', { name: 'Import Games' })).toBeVisible();
  });

  test('should have upload and paste tabs', async ({ page }) => {
    await page.getByRole('button', { name: /Import/i }).click();

    await expect(page.getByRole('button', { name: /Upload/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Paste/i })).toBeVisible();
  });

  test('should accept PGN text input', async ({ page }) => {
    await page.getByRole('button', { name: /Import/i }).click();
    await page.getByRole('button', { name: /Paste/i }).click();

    const textarea = page.getByPlaceholder(/Paste your PGN/i);
    await expect(textarea).toBeVisible();
    await textarea.fill(SAMPLE_PGN);

    await expect(textarea).toHaveValue(SAMPLE_PGN);
  });

  test('should show validation for empty PGN', async ({ page }) => {
    await page.getByRole('button', { name: /Import/i }).click();
    await page.getByRole('button', { name: /Paste/i }).click();

    const addButton = page.getByRole('button', { name: /Add Game/i });
    await addButton.click();

    await expect(page.getByText(/Empty or invalid PGN/i)).toBeVisible();
  });

  test('should close modal on cancel', async ({ page }) => {
    await page.getByRole('button', { name: /Import/i }).click();

    await expect(page.getByRole('heading', { name: 'Import Games' })).toBeVisible();

    const closeButton = page.getByRole('button', { name: '×' });
    await closeButton.click();

    await expect(page.getByRole('heading', { name: 'Import Games' })).not.toBeVisible();
  });

  test('should have accessible file input', async ({ page }) => {
    await page.getByRole('button', { name: /Import/i }).click();

    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toHaveAttribute('accept', '.pgn');
  });

  test('should handle keyboard shortcuts', async ({ page }) => {
    await page.getByRole('button', { name: /Import/i }).click();

    await page.keyboard.press('Escape');
    await expect(page.getByRole('heading', { name: 'Import Games' })).not.toBeVisible();
  });
});
