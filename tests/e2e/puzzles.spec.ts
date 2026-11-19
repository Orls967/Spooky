import { expect, test } from '@playwright/test';

test.describe('Puzzles', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem(
        'spooky-settings',
        JSON.stringify({ state: { theme: 'dark', lang: 'id', lowPower: true }, version: 1 }),
      );
    });
  });

  test('solve level 1 with three stars and unlock level 2', async ({ page }) => {
    await page.goto('./#/puzzles');
    await expect(page.getByTestId('level-2')).toHaveCount(0); // locked
    await page.getByTestId('level-1').click();
    await page.getByTestId('pal-X').click();
    await page.getByTestId('cell-0-0').click();
    await expect(page.getByTestId('puzzle-solved')).toBeVisible();
    await expect(page.getByTestId('fidelity')).toHaveText('1.0000');
    await expect(page.getByTestId('puzzle-solved').locator('[aria-label="3/3"]')).toBeVisible();
    await page.getByTestId('next-level').click();
    await expect(page).toHaveURL(/#\/puzzles\/2/);
    // progress persisted
    await page.goto('./#/puzzles');
    await expect(page.getByTestId('star-total')).toContainText('3');
    await expect(page.getByTestId('level-2')).toBeVisible();
  });
});
