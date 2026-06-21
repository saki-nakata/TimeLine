import { test, expect } from '@playwright/test';
import { TEST_USERS, STORAGE_STATE_PATH } from '../fixtures/constants';

test.describe('認証', () => {
  test('新規登録 → ログイン → ログアウトの一連フロー', async ({ page }) => {
    const uniqueSuffix = Date.now();
    const username = `e2e_flow_${uniqueSuffix}`;
    const email = `e2e_flow_${uniqueSuffix}@test.example`;
    const password = 'E2eTest1234!';

    // 新規登録
    await page.goto('/register');
    await page.fill('[data-testid="username-input"]', username);
    await page.fill('[data-testid="register-email-input"]', email);
    await page.fill('[data-testid="register-password-input"]', password);
    await page.fill('[data-testid="register-confirm-input"]', password);
    await page.click('[data-testid="register-submit"]');
    await page.waitForURL('**/login');

    // ログイン
    await page.fill('[data-testid="email-input"]', email);
    await page.fill('[data-testid="password-input"]', password);
    await page.click('[data-testid="login-submit"]');
    await page.waitForURL('**/home');
    await expect(page.locator('[data-testid="nav-home"]')).toBeVisible();

    // ログアウト（ユーザーメニューを開いてから「ログアウト」をクリック）
    await page.click('[data-testid="user-menu-toggle"]');
    await page.click('[data-testid="logout-button"]');
    await page.waitForURL('**/login');
  });

  test('無効な認証情報でログイン → エラーメッセージが表示される', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'wrong@example.com');
    await page.fill('[data-testid="password-input"]', 'wrongpassword');
    await page.click('[data-testid="login-submit"]');
    await expect(page.locator('[data-testid="login-error"]')).toBeVisible();
  });

  test('未認証でプライベートページにアクセス → ログインページにリダイレクト', async ({ page }) => {
    await page.goto('/home');
    await page.waitForURL('**/login');
    expect(page.url()).toContain('/login');
  });
});

