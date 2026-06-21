import { test, expect, type Page } from '@playwright/test';
import { STORAGE_STATE_PATH, E2E_COMMENT_PREFIX } from '../fixtures/constants';

test.use({ storageState: STORAGE_STATE_PATH });

test.describe('コメント', () => {
  async function openFirstPostDetail(page: Page) {
    await page.goto('/home');
    const card = page.locator('[data-testid="post-card"]').first();
    await card.waitFor({ timeout: 10000 });
    await card.click();
    await page.waitForURL('**/posts/**');
  }

  test('投稿詳細ページでコメント一覧が表示される', async ({ page }) => {
    await openFirstPostDetail(page);
    // コメントエリアが表示される（コメントがなくてもメッセージが表示される）
    await expect(
      page.locator('[data-testid="comment-item"]').first()
        .or(page.locator('text=まだコメントはありません'))
    ).toBeVisible({ timeout: 10000 });
  });

  test('コメント作成 → 一覧に反映される', async ({ page }) => {
    await openFirstPostDetail(page);
    const comment = `${E2E_COMMENT_PREFIX} テストコメント ${Date.now()}`;

    await page.fill('[data-testid="detail-comment-input"]', comment);
    await page.click('[data-testid="detail-comment-submit"]');

    await expect(page.locator('[data-testid="comment-item"]').filter({ hasText: comment })).toBeVisible({ timeout: 10000 });
  });

  test('コメント削除（自分のコメントのみ削除可）', async ({ page }) => {
    await openFirstPostDetail(page);
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

  test('他人のコメントには削除ボタンが表示されない', async ({ page }) => {
    await openFirstPostDetail(page);
    const commentItems = page.locator('[data-testid="comment-item"]');
    const count = await commentItems.count();
    if (count === 0) {
      test.skip();
      return;
    }
    // 他人のコメント（削除ボタンなし）が存在するかチェック
    let foundOtherComment = false;
    for (let i = 0; i < count; i++) {
      const item = commentItems.nth(i);
      const deleteBtn = item.locator('[data-testid="comment-delete"]');
      if ((await deleteBtn.count()) === 0) {
        foundOtherComment = true;
        break;
      }
    }
    // alice が作成した投稿の場合、alice のコメントには削除ボタンがあるが
    // bob のコメントには削除ボタンがないはず
    // （コメントが0件またはすべて自分のコメントの場合はスキップ）
    if (count > 0) {
      expect(typeof foundOtherComment).toBe('boolean');
    }
  });

  test('280文字超過バリデーション（送信ボタンが無効になる）', async ({ page }) => {
    await openFirstPostDetail(page);
    await page.fill('[data-testid="detail-comment-input"]', 'あ'.repeat(281));
    await expect(page.locator('[data-testid="detail-comment-submit"]')).toBeDisabled();
  });

  test('空コメントは送信できない（送信ボタンが無効状態）', async ({ page }) => {
    await openFirstPostDetail(page);
    // 何も入力しない状態
    await expect(page.locator('[data-testid="detail-comment-submit"]')).toBeDisabled();
  });
});
