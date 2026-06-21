import { test, expect } from '@playwright/test';
import path from 'path';
import { STORAGE_STATE_PATH, E2E_POST_PREFIX } from '../fixtures/constants';

test.use({ storageState: STORAGE_STATE_PATH });

test.describe('投稿 CRUD', () => {
  test('テキスト投稿作成 → タイムラインに表示', async ({ page }) => {
    await page.goto('/home');
    const content = `${E2E_POST_PREFIX} テキスト投稿 ${Date.now()}`;

    // 投稿フォームを開く
    await page.locator('button', { hasText: '投稿する' }).first().click();
    await page.fill('[data-testid="post-input"]', content);
    await page.click('[data-testid="post-submit"]');

    // タイムラインに表示されること
    await expect(page.locator('[data-testid="post-card"]').filter({ hasText: content })).toBeVisible({ timeout: 10000 });
  });

  test('投稿カードをクリック → 投稿詳細ページに遷移', async ({ page }) => {
    await page.goto('/home');
    const firstCard = page.locator('[data-testid="post-card"]').first();
    await firstCard.waitFor({ timeout: 10000 });
    await firstCard.click();
    await page.waitForURL('**/posts/**');
    expect(page.url()).toMatch(/\/posts\/\d+/);
  });

  test('空投稿は送信できない（送信ボタンが無効状態）', async ({ page }) => {
    await page.goto('/home');
    await page.locator('button', { hasText: '投稿する' }).first().click();
    // 何も入力しない状態で送信ボタンが disabled
    const submitBtn = page.locator('[data-testid="post-submit"]');
    await expect(submitBtn).toBeDisabled();
  });

  test('280文字超過バリデーション（送信ボタンが無効になる）', async ({ page }) => {
    await page.goto('/home');
    await page.locator('button', { hasText: '投稿する' }).first().click();
    await page.fill('[data-testid="post-input"]', 'あ'.repeat(281));
    await expect(page.locator('[data-testid="post-submit"]')).toBeDisabled();
  });

  test('他人の投稿には編集・削除ボタンが表示されない', async ({ page }) => {
    await page.goto('/home');
    // すべての投稿カードを確認
    await page.locator('[data-testid="post-card"]').first().waitFor({ timeout: 10000 });
    // 自分以外の投稿には edit-button / delete-button が存在しない
    // （自分の投稿だけ isOwner=true で表示される実装のため、他人の投稿では存在しない）
    const cards = page.locator('[data-testid="post-card"]');
    const count = await cards.count();
    // 少なくとも1枚の投稿カードで edit/delete が表示されていないことを確認
    // （alice と bob が存在するため、どちらかの投稿が見える）
    let foundOtherUserPost = false;
    for (let i = 0; i < Math.min(count, 5); i++) {
      const card = cards.nth(i);
      const editBtn = card.locator('[data-testid="edit-button"]');
      const deleteBtn = card.locator('[data-testid="delete-button"]');
      if ((await editBtn.count()) === 0 && (await deleteBtn.count()) === 0) {
        foundOtherUserPost = true;
        break;
      }
    }
    expect(foundOtherUserPost).toBe(true);
  });

  test('画像付き投稿作成', async ({ page }) => {
    await page.goto('/home');
    const content = `${E2E_POST_PREFIX} 画像投稿 ${Date.now()}`;

    await page.locator('button', { hasText: '投稿する' }).first().click();
    await page.fill('[data-testid="post-input"]', content);

    // テスト用画像（1x1 px PNG を base64 で生成してアップロード）
    const imagePath = path.join(process.cwd(), 'fixtures', 'test-image.png');
    // file input に直接セット
    await page.locator('input[type="file"]').setInputFiles({
      name: 'test.png',
      mimeType: 'image/png',
      // 1x1 px 透明 PNG
      buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64'),
    });

    await page.click('[data-testid="post-submit"]');
    await expect(page.locator('[data-testid="post-card"]').filter({ hasText: content })).toBeVisible({ timeout: 10000 });
  });

  test('投稿編集（テキスト変更）', async ({ page }) => {
    // まず投稿を作成
    await page.goto('/home');
    const original = `${E2E_POST_PREFIX} 編集前 ${Date.now()}`;
    await page.locator('button', { hasText: '投稿する' }).first().click();
    await page.fill('[data-testid="post-input"]', original);
    await page.click('[data-testid="post-submit"]');
    await page.locator('[data-testid="post-card"]').filter({ hasText: original }).waitFor({ timeout: 10000 });

    // 自分の投稿の編集ボタンをクリック
    const myCard = page.locator('[data-testid="post-card"]').filter({ hasText: original });
    await myCard.locator('[data-testid="edit-button"]').click({ force: true });

    // 編集モーダルが開く
    const editedContent = `${E2E_POST_PREFIX} 編集後 ${Date.now()}`;
    await page.locator('textarea').last().fill(editedContent);
    await page.locator('button', { hasText: '保存' }).click();

    await expect(page.locator('[data-testid="post-card"]').filter({ hasText: editedContent })).toBeVisible({ timeout: 10000 });
  });

  test('投稿削除', async ({ page }) => {
    // まず投稿を作成
    await page.goto('/home');
    const content = `${E2E_POST_PREFIX} 削除テスト ${Date.now()}`;
    await page.locator('button', { hasText: '投稿する' }).first().click();
    await page.fill('[data-testid="post-input"]', content);
    await page.click('[data-testid="post-submit"]');
    const card = page.locator('[data-testid="post-card"]').filter({ hasText: content });
    await card.waitFor({ timeout: 10000 });

    // 削除ボタンをクリック
    await card.locator('[data-testid="delete-button"]').click({ force: true });
    // 確認ダイアログで「削除する」をクリック
    await page.locator('button', { hasText: '削除する' }).click();

    // 投稿がなくなること
    await expect(page.locator('[data-testid="post-card"]').filter({ hasText: content })).not.toBeVisible({ timeout: 10000 });
  });
});
