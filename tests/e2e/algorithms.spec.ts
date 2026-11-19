import { expect, test } from '@playwright/test';

test.describe('Algorithms', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem(
        'spooky-settings',
        JSON.stringify({ state: { theme: 'dark', lang: 'en', lowPower: true }, version: 1 }),
      );
    });
  });

  test('index lists all seven algorithms', async ({ page }) => {
    await page.goto('./#/algorithms');
    for (const id of ['deutsch-jozsa', 'bernstein-vazirani', 'teleportation', 'superdense', 'grover', 'qft', 'shor'])
      await expect(page.getByTestId(`algo-${id}`)).toBeVisible();
  });

  test('Bernstein–Vazirani walkthrough reveals the secret', async ({ page }) => {
    await page.goto('./#/algorithms/bernstein-vazirani');
    for (let i = 0; i < 5; i++) await page.getByTestId('algo-next').click();
    await expect(page.getByTestId('algo-result')).toContainText('|1011⟩');
  });

  test('a step opens in the Circuit Composer', async ({ page }) => {
    await page.goto('./#/algorithms/grover');
    await page.getByTestId('algo-next').click();
    await page.getByTestId('open-in-composer').click();
    await expect(page).toHaveURL(/#\/composer/);
    await expect(page.getByTestId('amplitude-list').first()).toContainText('12.5%');
  });
});
