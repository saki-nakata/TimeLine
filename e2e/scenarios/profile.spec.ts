import { test, expect, type Page } from '@playwright/test';
import { STORAGE_STATE_PATH, E2E_POST_PREFIX, API_BASE_URL } from '../fixtures/constants';

test.use({ storageState: STORAGE_STATE_PATH });

test.describe('プロフィール', () => {
  async function getAliceId(page: Page): Promise<number> {
    const res = await page.request.get(`${API_BASE_URL}/auth/me`);
    const me = await res.json();
    return me.id;
  }

  test('プロフィールページが表示される', async ({ page }) => {
    const aliceId = await getAliceId(page);
    await page.goto(`/profile/${aliceId}`);
    await expect(page.locator('text=e2e_user_alice').first()).toBeVisible({ timeout: 10000 });
  });

  test('自分のプロフィールページに自分の投稿が表示される', async ({ page }) => {
    const aliceId = await getAliceId(page);

    // まず投稿を作成
    await page.goto('/home');
    const content = `${E2E_POST_PREFIX} プロフィール確認 ${Date.now()}`;
    await page.locator('button', { hasText: '投稿する' }).first().click();
    await page.fill('[data-testid="post-input"]', content);
    await page.click('[data-testid="post-submit"]');
    await page.locator('[data-testid="post-card"]').filter({ hasText: content }).waitFor({ timeout: 10000 });

    // プロフィールページで確認
    await page.goto(`/profile/${aliceId}`);
    await expect(page.locator('[data-testid="post-card"]').filter({ hasText: content })).toBeVisible({ timeout: 10000 });
  });

  test('プロフィール編集（表示名・bio 変更）', async ({ page }) => {
    const aliceId = await getAliceId(page);
    await page.goto(`/profile/${aliceId}`);

    // 編集ボタンをクリック
    await page.locator('button', { hasText: 'プロフィールを編集' }).click();

    const newDisplayName = `E2Eテスト表示名 ${Date.now()}`;
    // 表示名フィールドをクリア → 入力
    const displayNameInput = page.locator('[data-testid="profile-display-name-input"]');
    await displayNameInput.fill(newDisplayName);

    // 保存
    await page.locator('button', { hasText: '保存' }).click();
    await expect(page.locator(`text=${newDisplayName}`).first()).toBeVisible({ timeout: 10000 });
  });
});
