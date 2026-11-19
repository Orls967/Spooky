import { expect, test } from '@playwright/test';
import { encodeCircuitForURL } from '../../src/lib/quantum/serialize';

test.describe('Circuit Composer', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem(
        'spooky-settings',
        JSON.stringify({ state: { theme: 'light', lang: 'en', lowPower: true }, version: 1 }),
      );
      localStorage.removeItem('spooky-composer');
    });
  });

  test('tap-to-place builds a Bell pair and the worker simulates it', async ({ page }) => {
    await page.goto('./#/composer');
    await page.getByTestId('pal-H').click();
    await page.getByTestId('cell-0-0').click();
    await page.getByTestId('pal-CX').click();
    await page.getByTestId('cell-0-1').click();
    const list = page.getByTestId('amplitude-list').first();
    await expect(list).toContainText('|000⟩');
    await expect(list).toContainText('|110⟩');
    await expect(list).toContainText('50.0%');
    // step back to the initial state
    await page.getByTestId('step-back').click();
    await page.getByTestId('step-back').click();
    await expect(list).toContainText('100.0%');
  });

  test('drag and drop a gate from the palette', async ({ page, isMobile }) => {
    test.skip(isMobile, 'drag is exercised on desktop; mobile uses tap');
    await page.goto('./#/composer');
    await page.getByTestId('circuit-grid').evaluate((el) => el.scrollIntoView({ block: 'center' }));
    const src = page.getByTestId('pal-X');
    const dst = page.getByTestId('cell-1-0');
    const a = (await src.boundingBox())!;
    const b = (await dst.boundingBox())!;
    await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
    await page.mouse.down();
    await page.mouse.move(a.x + 20, a.y + 20, { steps: 4 });
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 12 });
    await page.mouse.up();
    await expect(page.getByTestId('amplitude-list').first()).toContainText('|010⟩');
  });

  test('a shared URL loads its circuit', async ({ page }) => {
    const c = encodeCircuitForURL({
      qubits: 2,
      columns: [
        [
          { gate: 'X', targets: [0] },
          { gate: 'X', targets: [1] },
        ],
      ],
    });
    await page.goto(`./#/composer?c=${c}`);
    await expect(page.getByTestId('amplitude-list').first()).toContainText('|11⟩');
    await expect(page.getByTestId('qubit-count')).toContainText('2');
  });
});
