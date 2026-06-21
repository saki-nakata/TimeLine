import { test, expect } from '@playwright/test';

test.describe('認証ガード（未ログイン）', () => {
  test('/home にアクセス → /login にリダイレクト', async ({ page }) => {
    await page.goto('/home');
    await page.waitForURL('**/login');
    expect(page.url()).toContain('/login');
  });

  test('/following にアクセス → /login にリダイレクト', async ({ page }) => {
    await page.goto('/following');
    await page.waitForURL('**/login');
    expect(page.url()).toContain('/login');
  });

  test('/profile/:id にアクセス → /login にリダイレクト', async ({ page }) => {
    await page.goto('/profile/1');
    await page.waitForURL('**/login');
    expect(page.url()).toContain('/login');
  });

});
