import { expect, type Page } from '@playwright/test';
import { test } from '../fixtures/test.fixture';
import { STORAGE_STATE_PATH, E2E_COMMENT_PREFIX, E2E_POST_PREFIX } from '../fixtures/constants';

test.use({ storageState: STORAGE_STATE_PATH });

test.describe('コメント', () => {
  let postUrl: string;

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
    const page = await context.newPage();
    await page.goto('/home');
    const content = `${E2E_POST_PREFIX} コメントテスト用投稿 ${Date.now()}`;
    await page.locator('button', { hasText: '投稿する' }).first().click();
    await page.fill('[data-testid="post-input"]', content);
    await page.click('[data-testid="post-submit"]');
    await page.locator('[data-testid="post-card"]').filter({ hasText: content }).waitFor({ timeout: 10000 });
    await page.locator('[data-testid="post-card"]').filter({ hasText: content }).click();
    await page.waitForURL('**/posts/**');
    postUrl = page.url();
    await context.close();
  });

  async function openPostDetail(page: Page) {
    await page.goto(postUrl);
    await page.waitForURL('**/posts/**');
  }

  test('投稿詳細ページでコメント一覧が表示される', async ({ page }) => {
    await openPostDetail(page);
    // コメントエリアが表示される（コメントがなくてもメッセージが表示される）
    await expect(
      page.locator('[data-testid="comment-item"]').first()
        .or(page.locator('text=まだコメントはありません'))
    ).toBeVisible({ timeout: 10000 });
  });

  test('コメント作成 → 一覧に反映される', async ({ page }) => {
    await openPostDetail(page);
    const comment = `${E2E_COMMENT_PREFIX} テストコメント ${Date.now()}`;

    await page.fill('[data-testid="detail-comment-input"]', comment);
    await page.click('[data-testid="detail-comment-submit"]');

    await expect(page.locator('[data-testid="comment-item"]').filter({ hasText: comment })).toBeVisible({ timeout: 10000 });
  });

  test('コメント削除（自分のコメントのみ削除可）', async ({ page }) => {
    await openPostDetail(page);
    const comment = `${E2E_COMMENT_PREFIX} 削除コメント ${Date.now()}`;

    await page.fill('[data-testid="detail-comment-input"]', comment);
    await page.click('[data-testid="detail-comment-submit"]');

    const commentItem = page.locator('[data-testid="comment-item"]').filter({ hasText: comment });
    await commentItem.waitFor({ timeout: 10000 });

    // 削除ボタンをクリック
    await commentItem.locator('[data-testid="comment-delete"]').click();
    // 確認ダイアログで「削除」をクリック
    await commentItem.locator('button', { hasText: '削除' }).click();

    await expect(commentItem).not.toBeVisible({ timeout: 5000 });
  });

  test('他人のコメントには削除ボタンが表示されない', async ({ alicePage, bobPage }) => {
    // alice が投稿を作成
    await alicePage.goto('/home');
    const postContent = `${E2E_COMMENT_PREFIX} 権限確認用投稿 ${Date.now()}`;
    await alicePage.locator('button', { hasText: '投稿する' }).first().click();
    await alicePage.fill('[data-testid="post-input"]', postContent);
    await alicePage.click('[data-testid="post-submit"]');
    await alicePage.locator('[data-testid="post-card"]').filter({ hasText: postContent }).waitFor({ timeout: 10000 });

    // 投稿詳細ページの URL を取得
    await alicePage.locator('[data-testid="post-card"]').filter({ hasText: postContent }).click();
    await alicePage.waitForURL('**/posts/**');
    const postUrl = alicePage.url();

    // bob が同じ投稿詳細ページでコメントを作成
    await bobPage.goto(postUrl);
    const bobComment = `${E2E_COMMENT_PREFIX} bobのコメント ${Date.now()}`;
    await bobPage.fill('[data-testid="detail-comment-input"]', bobComment);
    await bobPage.click('[data-testid="detail-comment-submit"]');
    await bobPage.locator('[data-testid="comment-item"]').filter({ hasText: bobComment }).waitFor({ timeout: 10000 });

    // alice の画面でリロードして bob のコメントに削除ボタンがないことを確認
    await alicePage.reload();
    const bobCommentItem = alicePage.locator('[data-testid="comment-item"]').filter({ hasText: bobComment });
    await bobCommentItem.waitFor({ timeout: 10000 });
    await expect(bobCommentItem.locator('[data-testid="comment-delete"]')).toHaveCount(0);
  });

});
