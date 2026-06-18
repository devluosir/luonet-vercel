import { test, expect } from '@playwright/test';

test.describe('历史记录页', () => {
  test('能访问历史页且不报错', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto('/history');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/history/);

    await page.waitForTimeout(1_000);

    const fatalErrors = errors.filter((error) =>
      !error.includes('D1') && !error.includes('fetch') && !error.includes('network')
    );
    expect(fatalErrors).toHaveLength(0);
  });

  test('历史页包含页面标题或空状态文字', async ({ page }) => {
    await page.goto('/history');
    await page.waitForLoadState('networkidle');

    const bodyText = await page.locator('body').innerText();
    expect(bodyText).toMatch(/历史|记录|暂无|empty|单据管理中心/i);
  });
});
