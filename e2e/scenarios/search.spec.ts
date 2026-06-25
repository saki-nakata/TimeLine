import { test, expect, type Page } from '@playwright/test';
import { API_BASE_URL, STORAGE_STATE_PATH, TEST_USERS } from '../fixtures/constants';

test.use({ storageState: STORAGE_STATE_PATH });

async function openSearch(page: Page) {
  await page.goto('/home');
  await page.click('[data-testid="nav-search"]');
  await page.locator('[data-testid="search-input"]').waitFor({ state: 'visible' });
}

test.describe('ユーザー検索', () => {
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

test.describe('投稿検索', () => {
  const UNIQUE_KEYWORD = `[E2E]searchtest_${Date.now()}`;

  test.beforeAll(async ({ request }) => {
    const res = await request.post(`${API_BASE_URL}/posts`, {
      multipart: { content: `${UNIQUE_KEYWORD} 投稿検索テスト用` },
    });
    expect(res.ok()).toBeTruthy();
  });

  test('キーワード入力 → ドロップダウンに投稿が表示される', async ({ page }) => {
    await openSearch(page);
    await page.fill('[data-testid="search-input"]', UNIQUE_KEYWORD);
    await expect(page.locator('[data-testid="search-no-results"]')).not.toBeVisible({ timeout: 500 }).catch(() => {});
    await expect(page.locator('text=' + UNIQUE_KEYWORD).first()).toBeVisible({ timeout: 5000 });
  });

  test('投稿クリック → 投稿詳細ページに遷移する', async ({ page }) => {
    await openSearch(page);
    await page.fill('[data-testid="search-input"]', UNIQUE_KEYWORD);
    await page.locator('text=' + UNIQUE_KEYWORD).first().waitFor({ timeout: 5000 });
    await page.locator('text=' + UNIQUE_KEYWORD).first().click();
    await page.waitForURL('**/posts/**');
    expect(page.url()).toMatch(/\/posts\/\d+/);
  });
});

test.describe('ハッシュタグ検索', () => {
  const UNIQUE_TAG = `e2etag${Date.now()}`;

  test.beforeAll(async ({ request }) => {
    await request.post(`${API_BASE_URL}/posts`, {
      multipart: { content: `[E2E] ハッシュタグ検索テスト #${UNIQUE_TAG}` },
    });
  });

  test('#タグ入力 → ドロップダウンに投稿が表示される', async ({ page }) => {
    await openSearch(page);
    await page.fill('[data-testid="search-input"]', `#${UNIQUE_TAG}`);
    await expect(page.locator(`text=#${UNIQUE_TAG}`).first()).toBeVisible({ timeout: 5000 });
  });
});
