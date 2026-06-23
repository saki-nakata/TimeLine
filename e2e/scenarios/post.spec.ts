import { expect } from '@playwright/test';
import { test } from '../fixtures/test.fixture';
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

  test('他人の投稿には編集・削除ボタンが表示されない', async ({ alicePage, bobPage }) => {
    // bob が投稿を作成
    await bobPage.goto('/home');
    const bobPost = `${E2E_POST_PREFIX} bob投稿 ${Date.now()}`;
    await bobPage.locator('button', { hasText: '投稿する' }).first().click();
    await bobPage.fill('[data-testid="post-input"]', bobPost);
    await bobPage.click('[data-testid="post-submit"]');
    await bobPage.locator('[data-testid="post-card"]').filter({ hasText: bobPost }).waitFor({ timeout: 10000 });

    // alice のホームに bob の投稿が表示され、edit/delete ボタンがないことを確認
    await alicePage.goto('/home');
    await alicePage.locator('[data-testid="post-card"]').first().waitFor({ timeout: 10000 });
    const cards = alicePage.locator('[data-testid="post-card"]');
    const count = await cards.count();
    let foundOtherUserPost = false;
    for (let i = 0; i < Math.min(count, 10); i++) {
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
