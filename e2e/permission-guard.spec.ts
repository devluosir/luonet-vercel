import { test, expect } from '@playwright/test';

/**
 * 页面级权限守卫冒烟：已登录用户访问各业务路由时，
 * 不应卡在登录页；有权限则进入业务页，无权限则显示「权限不足」。
 * （E2E 账号通常为管理员或具备全模块权限，故以「不回登录页」为主断言。）
 */
const GUARDED_ROUTES: Array<{ path: string; label: string }> = [
  { path: '/quotation', label: '报价' },
  { path: '/packing', label: '装箱单' },
  { path: '/invoice', label: '发票' },
  { path: '/purchase', label: '采购订单' },
  { path: '/history', label: '历史' },
  { path: '/customer', label: '客户' },
  { path: '/mail', label: 'AI 邮件' },
  { path: '/clock', label: '时区汇率' },
  { path: '/holidays', label: '全球假日' },
  { path: '/rmb', label: 'RMB 大写' },
  { path: '/inquiry', label: '询报价登记' },
  { path: '/order', label: '订单状态表' },
];

test.describe('页面级权限守卫', () => {
  for (const route of GUARDED_ROUTES) {
    test(`已登录访问 ${route.label}（${route.path}）不回登录页`, async ({ page }) => {
      await page.goto(route.path);
      await page.waitForLoadState('domcontentloaded');

      // 守卫加载中可能短暂 spinner；等待页面稳定
      await page.waitForTimeout(800);

      await expect(page.locator('#username')).toHaveCount(0);
      await expect(page).not.toHaveURL(/\/$/);

      const bodyText = await page.locator('body').innerText();
      const isDenied = bodyText.includes('权限不足');
      const hasContent = bodyText.length > 20;

      expect(isDenied || hasContent).toBeTruthy();
    });
  }

  test('未登录直链 /quotation 应回到登录页', async ({ browser }) => {
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const page = await context.newPage();

    await page.goto('/quotation');
    await expect(page.locator('#username')).toBeVisible({ timeout: 10_000 });

    await context.close();
  });
});
