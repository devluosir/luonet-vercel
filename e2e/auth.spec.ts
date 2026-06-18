import { test, expect } from '@playwright/test';

test.describe('认证流程', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('未登录访问 /dashboard 应重定向到登录页', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.locator('#username')).toBeVisible({ timeout: 10_000 });
  });

  test('填写正确凭据后跳转到 dashboard', async ({ page }) => {
    const username = process.env.E2E_USERNAME;
    const password = process.env.E2E_PASSWORD;

    expect(username, 'E2E_USERNAME must be set').toBeTruthy();
    expect(password, 'E2E_PASSWORD must be set').toBeTruthy();

    await page.goto('/');
    await page.fill('#username', username!);
    await page.fill('#password', password!);
    await page.click('button[type="submit"]');

    await page.waitForURL('**/dashboard', { timeout: 15_000 });
    await expect(page).toHaveURL(/dashboard/);
  });

  test('填写错误密码显示错误信息', async ({ page }) => {
    await page.goto('/');
    await page.fill('#username', 'nonexistent_user_xyz');
    await page.fill('#password', 'wrong_password_xyz');
    await page.click('button[type="submit"]');

    await expect(page.getByText('用户名或密码错误')).toBeVisible({ timeout: 8_000 });
    await expect(page.locator('#username')).toBeVisible();
  });
});
