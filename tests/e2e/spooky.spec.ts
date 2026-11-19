import { expect, test } from '@playwright/test';

test.describe('Spooky Action', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem(
        'spooky-settings',
        JSON.stringify({ state: { theme: 'dark', lang: 'en', lowPower: true }, version: 1 }),
      );
    });
  });

  test('measuring Alice in Φ+ fixes Bob to the same outcome', async ({ page }) => {
    await page.goto('./#/spooky');
    await page.getByTestId('measure-alice').click();
    const a = (await page.getByTestId('result-alice').textContent()) ?? '';
    const v = a.includes('|1⟩') ? '|1⟩' : '|0⟩';
    await page.getByRole('button', { name: 'Measure Bob' }).click();
    await expect(page.getByTestId('result-bob')).toContainText(v);
  });

  test('quantum CHSH strategy beats the classical 75% bound', async ({ page }) => {
    await page.goto('./#/spooky');
    await page.getByTestId('tab-chsh').click();
    await page.getByTestId('play-many').click();
    const txt = (await page.getByTestId('win-rate').textContent()) ?? '';
    const pct = parseFloat(txt.replace(/[^0-9.]/g, ''));
    expect(pct).toBeGreaterThan(80);
  });
});
