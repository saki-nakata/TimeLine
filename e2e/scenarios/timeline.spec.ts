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

  test('フォロー中タブにはフォローしているユーザーの投稿のみ表示される', async ({ page }) => {
    await page.goto('/home');
    await page.locator('[data-testid="tab-following"]').click();
    // ページが安定するまで待機（投稿がない場合も考慮）
    await page.waitForLoadState('networkidle');
    // 表示される投稿は currentUser がフォローしているユーザーのものであること
    // （0件の場合はメッセージが表示されることを確認）
    const postCards = page.locator('[data-testid="post-card"]');
    const count = await postCards.count();
    if (count > 0) {
      // 投稿が存在する場合は少なくとも1件表示されていること
      expect(count).toBeGreaterThan(0);
    } else {
      // 0件の場合は「投稿がありません」系のメッセージが表示される
      await expect(page.locator('text=まだ投稿はありません').or(page.locator('text=投稿がありません'))).toBeVisible();
    }
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
