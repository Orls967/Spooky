import { expect, test } from '@playwright/test';

test('home renders, language and theme toggles persist', async ({ page }) => {
  await page.goto('./');
  await expect(page.locator('html')).toHaveAttribute('lang', 'id');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('komputasi');

  await page.getByTestId('lang-en').click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('quantum');

  await page.getByTestId('theme-menu').click();
  await page.getByTestId('theme-dark').click();
  await expect(page.locator('html')).toHaveClass(/dark/);
  await expect(page.getByRole('menu')).toBeHidden();
  await page.getByTestId('theme-menu').click();
  await page.getByTestId('theme-light').click();
  await expect(page.locator('html')).not.toHaveClass(/dark/);

  // persisted across reload, applied before first render
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
});

test('global search opens with keyboard and navigates', async ({ page }) => {
  await page.goto('./');
  await page.keyboard.press('Control+k');
  const input = page.getByRole('combobox');
  await expect(input).toBeVisible();
  await input.fill('Bloch');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#\/bloch/);
});
