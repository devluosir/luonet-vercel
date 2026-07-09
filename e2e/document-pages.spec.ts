import { test, expect } from '@playwright/test';

test.describe('单据页面可达性', () => {
  test('装箱单页可打开且无致命控制台错误', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto('/packing');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/packing/);

    const bodyText = await page.locator('body').innerText();
    expect(bodyText.length).toBeGreaterThan(10);

    const fatalErrors = errors.filter(
      (error) =>
        !error.includes('D1') &&
        !error.includes('fetch') &&
        !error.includes('network') &&
        !error.includes('Failed to load resource'),
    );
    expect(fatalErrors).toHaveLength(0);
  });

  test('发票页可打开且无致命控制台错误', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto('/invoice');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/invoice/);

    const bodyText = await page.locator('body').innerText();
    expect(bodyText.length).toBeGreaterThan(10);

    const fatalErrors = errors.filter(
      (error) =>
        !error.includes('D1') &&
        !error.includes('fetch') &&
        !error.includes('network') &&
        !error.includes('Failed to load resource'),
    );
    expect(fatalErrors).toHaveLength(0);
  });

  test('采购订单页可打开', async ({ page }) => {
    await page.goto('/purchase');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/purchase/);

    const bodyText = await page.locator('body').innerText();
    expect(bodyText.length).toBeGreaterThan(10);
  });
});
