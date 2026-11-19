import { expect, test } from '@playwright/test';

test.use({ serviceWorkers: 'allow' });

test('works offline after the first load', async ({ page, context, browserName }) => {
  test.skip(browserName !== 'chromium');
  await page.goto('./');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  // give the precache a moment to finish
  await page.waitForFunction(async () => (await caches.keys()).some((k) => k.startsWith('spooky-')), null, {
    timeout: 30_000,
  });
  await page.waitForFunction(
    async () => {
      const k = (await caches.keys()).find((x) => x.startsWith('spooky-'))!;
      return (await (await caches.open(k)).keys()).length > 50;
    },
    null,
    { timeout: 30_000 },
  );
  // the page must be controlled by the worker before going offline
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null, null, { timeout: 30_000 });
  await context.setOffline(true);
  await page.goto('./#/glossary');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await page.goto('./#/composer');
  await expect(page.getByTestId('circuit-grid')).toBeVisible();
  await context.setOffline(false);
});
