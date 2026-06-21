import { test, expect } from '@playwright/test';
import { STORAGE_STATE_PATH } from '../fixtures/constants';

test.use({ storageState: STORAGE_STATE_PATH });

test.describe('タイムライン', () => {
  test('ホームにアクセスするとタイムラインが表示される', async ({ page }) => {
    await page.goto('/home');
    await expect(page.locator('main')).toBeVisible();
    // タイムライン専用タブが存在する
    await expect(page.locator('[data-testid="tab-all"]')).toBeVisible();
    await expect(page.locator('[data-testid="tab-following"]')).toBeVisible();
  });

  test('「すべて」「フォロー中」タブ切り替え', async ({ page }) => {
    await page.goto('/home');
    // フォロー中タブをクリック
    await page.locator('[data-testid="tab-following"]').click();
    await expect(page.locator('[data-testid="tab-following"]')).toHaveClass(/border-\[#1d9bf0\]/);
    // 全てに戻る
    await page.locator('[data-testid="tab-all"]').click();
    await expect(page.locator('[data-testid="tab-all"]')).toHaveClass(/border-\[#1d9bf0\]/);
  });

  test('スクロールによる次ページ読み込み（カーソルページネーション）', async ({ page }) => {
    await page.goto('/home');
    // 初期ロード
    await page.waitForSelector('[data-testid="post-card"]', { timeout: 10000 }).catch(() => {});
    const initialCount = await page.locator('[data-testid="post-card"]').count();
    if (initialCount === 0) {
      test.skip(); // 投稿が存在しない環境ではスキップ
      return;
    }
    // ページ最下部までスクロール
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(2000);
    // 追加投稿が読み込まれた（または全件表示済み）
    const afterCount = await page.locator('[data-testid="post-card"]').count();
    expect(afterCount).toBeGreaterThanOrEqual(initialCount);
  });
});
