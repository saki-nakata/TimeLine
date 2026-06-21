import { test, expect, type Page } from '@playwright/test';
import { STORAGE_STATE_PATH, TEST_USERS } from '../fixtures/constants';

test.use({ storageState: STORAGE_STATE_PATH });

test.describe('ユーザー検索', () => {
  async function openSearch(page: Page) {
    await page.goto('/home');
    await page.click('[data-testid="nav-search"]');
    await page.locator('[data-testid="search-input"]').waitFor({ state: 'visible' });
  }

  test('キーワード入力 → ドロップダウンにユーザー候補が表示される', async ({ page }) => {
    await openSearch(page);
    await page.fill('[data-testid="search-input"]', TEST_USERS.bob.username);
    await expect(page.locator('[data-testid="search-result-item"]').first()).toBeVisible({ timeout: 5000 });
  });

  test('候補クリック → プロフィールページに遷移する', async ({ page }) => {
    await openSearch(page);
    await page.fill('[data-testid="search-input"]', TEST_USERS.bob.username);
    await page.locator('[data-testid="search-result-item"]').first().waitFor({ timeout: 5000 });
    await page.locator('[data-testid="search-result-item"]').first().click();
    await page.waitForURL('**/profile/**');
    expect(page.url()).toMatch(/\/profile\/\d+/);
  });

  test('ヒットしないキーワード → 「結果なし」が表示される', async ({ page }) => {
    await openSearch(page);
    await page.fill('[data-testid="search-input"]', 'xyzxyzxyznotexistuser12345');
    await expect(page.locator('[data-testid="search-no-results"]')).toBeVisible({ timeout: 5000 });
  });
});
