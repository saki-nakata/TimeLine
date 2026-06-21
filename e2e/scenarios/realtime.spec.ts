import { test, expect, chromium } from '@playwright/test';
import { STORAGE_STATE_PATH, STORAGE_STATE_BOB_PATH, E2E_POST_PREFIX } from '../fixtures/constants';

test.describe('リアルタイム通知（WebSocket）', () => {
  test('Bob が投稿すると Alice の画面に新着バナーが表示される', async () => {
    // 2つのブラウザコンテキストを独立して起動
    const browser = await chromium.launch();

    const aliceContext = await browser.newContext({ storageState: STORAGE_STATE_PATH });
    const bobContext = await browser.newContext({ storageState: STORAGE_STATE_BOB_PATH });

    const alicePage = await aliceContext.newPage();
    const bobPage = await bobContext.newPage();

    try {
      // Alice がホームページを開いて待機
      await alicePage.goto('http://localhost:5173/home');
      await alicePage.waitForSelector('[data-testid="post-card"]', { timeout: 15000 }).catch(() => {});

      // Bob が新しい投稿を作成
      await bobPage.goto('http://localhost:5173/home');
      const content = `${E2E_POST_PREFIX} WebSocket テスト ${Date.now()}`;
      await bobPage.locator('button', { hasText: '投稿する' }).first().click();
      await bobPage.fill('[data-testid="post-input"]', content);
      await bobPage.click('[data-testid="post-submit"]');
      await bobPage.locator('[data-testid="post-card"]').filter({ hasText: content }).waitFor({ timeout: 10000 });

      // Alice の画面に新着バナーが表示されるまで待機（最大15秒）
      await expect(alicePage.locator('[data-testid="new-posts-banner"]')).toBeVisible({ timeout: 15000 });
    } finally {
      await aliceContext.close();
      await bobContext.close();
      await browser.close();
    }
  });
});
