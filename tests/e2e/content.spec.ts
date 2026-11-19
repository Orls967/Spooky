import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      'spooky-settings',
      JSON.stringify({ state: { theme: 'dark', lang: 'en', lowPower: true }, version: 1 }),
    );
  });
});

test('intro story advances with scroll', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('quantum');
  const h = await page.evaluate(() => window.innerHeight);
  await page.evaluate((y) => window.scrollTo(0, y), Math.round(4.45 * h));
  await expect(page.getByTestId('intro-s5')).toHaveAttribute('aria-hidden', 'false', { timeout: 15_000 });
  await expect(page.getByTestId('intro-s5')).toContainText('Entanglement');
});

test('glossary filters terms and auto-links them in explanations', async ({ page }) => {
  await page.goto('./#/glossary');
  await page.getByTestId('glossary-filter').fill('concurrence');
  await expect(page.getByTestId('term-concurrence')).toBeVisible();
  await expect(page.getByTestId('term-qubit')).toHaveCount(0);
  // the definition of "concurrence" links other terms (but not itself)
  await expect(
    page.getByTestId('term-concurrence').locator('a[href*="glossary?t=entanglement"]').first(),
  ).toBeVisible();
  // deep link focuses a term
  await page.goto('./#/glossary?t=bloch-sphere');
  await expect(page.getByTestId('term-bloch-sphere')).toBeInViewport();
});

test('global search finds algorithms and glossary terms', async ({ page }) => {
  await page.goto('./#/about');
  await expect(page.getByTestId('about-limits')).toContainText('10 qubits');
  await page.keyboard.press('Control+k');
  await page.getByRole('combobox').fill('Grover');
  await page.getByRole('option', { name: /Grover search/ }).click();
  await expect(page).toHaveURL(/#\/algorithms\/grover/);
  await page.keyboard.press('Control+k');
  await page.getByRole('combobox').fill('Concurrence');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/glossary\?t=concurrence/);
});
