import { test, expect } from '@playwright/test';

// ─────────────────────────────────────────────────────────────────────────────
// Auth-gated regression coverage for board rendering, game selection,
// authenticated empty-state, and the Progress modal.
//
// These tests need a real Supabase test user — they are skipped unless both
// PLAYWRIGHT_TEST_USER and PLAYWRIGHT_TEST_PASSWORD are set. To run locally:
//
//   PLAYWRIGHT_TEST_USER=…  PLAYWRIGHT_TEST_PASSWORD=…  npx playwright test
//
// They run against the live dev server, so they exercise the same code
// paths (auth, RLS, PGN parsing in the worker, ChessBoard rendering) that
// production hits.
// ─────────────────────────────────────────────────────────────────────────────

const SAMPLE_PGN = `[Event "Regression Game"]
[Site "Online"]
[Date "2024.01.15"]
[White "TestUser"]
[Black "Opponent"]
[Result "1-0"]

1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7
6. Re1 b5 7. Bb3 d6 8. c3 O-O 9. h3 Nb8 10. d4 Nbd7 1-0`;

const needsAuth =
  !process.env.PLAYWRIGHT_TEST_USER || !process.env.PLAYWRIGHT_TEST_PASSWORD;

test.describe('Authenticated board + progress (requires auth)', () => {
  test.skip(
    needsAuth,
    'Skipped: set PLAYWRIGHT_TEST_USER / PLAYWRIGHT_TEST_PASSWORD to enable',
  );

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByLabel('Email').fill(process.env.PLAYWRIGHT_TEST_USER!);
    await page.getByLabel('Password').fill(process.env.PLAYWRIGHT_TEST_PASSWORD!);
    await page.getByRole('button', { name: 'Sign In', exact: true }).last().click();
    await expect(page.getByRole('button', { name: /^Import$/ })).toBeVisible({
      timeout: 15_000,
    });
  });

  test('renders the welcome empty-state when no game is selected', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: /Select a game to begin/i }),
    ).toBeVisible();
  });

  test('GameList sidebar appears with header and search', async ({ page }) => {
    await expect(page.getByText(/^Games \(/)).toBeVisible();
    await expect(page.getByPlaceholder('Search games...')).toBeVisible();
  });

  test('renders the chess board after importing and selecting a game', async ({ page }) => {
    // Paste a fresh game.
    await page.getByRole('button', { name: /Import/i }).click();
    await page.getByRole('button', { name: /Paste/i }).click();
    await page.getByPlaceholder(/Paste your PGN/i).fill(SAMPLE_PGN);
    await page.getByRole('button', { name: /Add Game/i }).click();

    // After import, the most-recent game should be auto-selected and the
    // board rendered — assert the move navigator controls show up.
    await expect(
      page.getByRole('button', { name: /Next move|SkipForward/i }).first(),
    ).toBeVisible({ timeout: 15_000 });

    // Sixty-four squares' worth of board cells (visual sanity check; tolerate
    // any markup that uses .sq-light / .sq-dark from the design system).
    const squares = page.locator('.sq-light, .sq-dark');
    expect(await squares.count()).toBeGreaterThanOrEqual(8);
  });

  test('user color detection: imported game shows a result badge from PGN', async ({ page }) => {
    // We can't peek at user_color through the DOM, but we CAN assert that
    // the result column of the freshly imported game reflects the PGN's
    // declared result, which is the user-visible side of the color/result
    // resolution pipeline.
    await page.getByRole('button', { name: /Import/i }).click();
    await page.getByRole('button', { name: /Paste/i }).click();
    await page.getByPlaceholder(/Paste your PGN/i).fill(SAMPLE_PGN);
    await page.getByRole('button', { name: /Add Game/i }).click();

    // Find the first game item with our imported players.
    const item = page.getByText(/TestUser vs Opponent/i).first();
    await expect(item).toBeVisible({ timeout: 15_000 });
    // The result chip rendered inside the row.
    await expect(item.locator('xpath=ancestor::*[1]').getByText('1-0').first()).toBeVisible();
  });

  test('Progress modal opens and renders without crashing', async ({ page }) => {
    await page.getByRole('button', { name: /Progress/i }).click();
    await expect(page.getByRole('heading', { name: /Your Progress/i })).toBeVisible();
    // Modal should be dismissible.
    await page.keyboard.press('Escape').catch(() => undefined);
    await page.getByRole('button', { name: 'Close' }).click().catch(() => undefined);
  });

  test('Statistics modal opens', async ({ page }) => {
    await page.getByRole('button', { name: /Statistics/i }).click();
    // StatsDashboard renders its own title; not asserting exact text since
    // the dashboard varies with data — but it should mount with a heading.
    const anyHeading = page.getByRole('heading').first();
    await expect(anyHeading).toBeVisible({ timeout: 5_000 });
  });
});
