import { test, expect, type Page } from '@playwright/test';

async function fillCustomerName(page: Page, name: string) {
  const candidates = [
    page.getByPlaceholder('Enter customer name and address').first(),
    page.locator('label:has-text("客户名称")').locator('..').locator('input, textarea').first(),
    page.locator('textarea, input[type="text"]').first(),
  ];

  for (const candidate of candidates) {
    if ((await candidate.count()) > 0 && await candidate.isVisible()) {
      await candidate.fill(name);
      return;
    }
  }

  throw new Error('未找到客户名称输入框');
}

test.describe('报价单保存 + D1 双写', () => {
  test('保存报价单 → 触发 POST /api/documents', async ({ page }) => {
    await page.goto('/quotation');
    await page.waitForLoadState('networkidle');

    const d1RequestPromise = page.waitForRequest(
      (req) => req.url().includes('/api/documents') && req.method() === 'POST',
      { timeout: 15_000 },
    );

    await fillCustomerName(page, 'E2E Test Customer');
    await page.locator('button[title="保存新记录"], button[title="保存修改"]').click();

    const d1Req = await d1RequestPromise;
    expect(d1Req.method()).toBe('POST');
    expect(d1Req.url()).toContain('/api/documents');

    const d1Resp = await d1Req.response();
    expect(d1Resp).not.toBeNull();
    expect([200, 201, 409]).toContain(d1Resp!.status());
  });

  test('保存后 localStorage 包含新记录', async ({ page }) => {
    await page.goto('/quotation');
    await page.waitForLoadState('networkidle');

    const beforeCount = await page.evaluate(() => {
      const existing = JSON.parse(localStorage.getItem('quotation_history') || '[]');
      return Array.isArray(existing) ? existing.length : 0;
    });

    await fillCustomerName(page, 'E2E LocalStorage Test');
    await page.locator('button[title="保存新记录"], button[title="保存修改"]').click();

    await expect(page.getByText('保存成功')).toBeVisible({ timeout: 8_000 });

    const afterCount = await page.evaluate(() => {
      const list = JSON.parse(localStorage.getItem('quotation_history') || '[]');
      return Array.isArray(list) ? list.length : 0;
    });

    expect(afterCount).toBeGreaterThan(beforeCount);
  });
});
