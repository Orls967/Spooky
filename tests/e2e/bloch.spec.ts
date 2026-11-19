import { expect, test } from '@playwright/test';

test.describe('Bloch Studio', () => {
  test.beforeEach(async ({ page }) => {
    // keep software-rendered CI fast
    await page.addInitScript(() => {
      localStorage.setItem(
        'spooky-settings',
        JSON.stringify({ state: { theme: 'dark', lang: 'id', lowPower: true }, version: 1 }),
      );
    });
  });

  test('H gate creates |+⟩ and shots are replayable', async ({ page, isMobile }) => {
    await page.goto('./#/bloch');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await page.getByTestId('gate-H').first().click();
    if (isMobile) {
      await page.getByTestId('open-panel').click();
    }
    await expect(page.getByTestId('bloch-state').first()).toContainText('0.707');
    if (!isMobile) {
      await page.getByTestId('run-shots').click();
      await expect(page.getByText(/garis putus-putus/)).toBeVisible();
    }
  });
});
