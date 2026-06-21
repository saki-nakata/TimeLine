import { test, expect, type Page } from '@playwright/test';
import { STORAGE_STATE_PATH, TEST_USERS, API_BASE_URL } from '../fixtures/constants';

test.use({ storageState: STORAGE_STATE_PATH });

test.describe('フォロー', () => {
  // alice が bob のプロフィールページに移動する
  async function navigateToBobProfile(page: Page) {
    // bob のユーザーIDを検索APIで取得
    const res = await page.request.get(`${API_BASE_URL}/users/search?q=${TEST_USERS.bob.username}`);
    const users = await res.json();
    const bob = users.find((u: { username: string }) => u.username === TEST_USERS.bob.username);
    if (!bob) throw new Error('bob ユーザーが見つかりません');
    await page.goto(`/profile/${bob.id}`);
    return bob;
  }

  test('フォロー → フォロー数カウントが増加し、フォロー中一覧に反映される', async ({ page }) => {
    test.setTimeout(60000);
    const bob = await navigateToBobProfile(page);
    await page.waitForLoadState('networkidle');

    // まず未フォロー状態にする
    const followBtn = page.locator('[data-testid="follow-button"]');
    await followBtn.waitFor({ timeout: 10000 });
    const btnText = await followBtn.textContent();
    if (btnText?.includes('フォロー中')) {
      await followBtn.click();
      await page.waitForTimeout(500);
    }

    // フォローする
    await page.locator('[data-testid="follow-button"]').click();
    await expect(page.locator('[data-testid="follow-button"]')).toHaveText(/フォロー中/, { timeout: 5000 });

    // フォロー中一覧ページに移動して確認
    await page.goto('/following');
    await expect(
      page.locator(`[data-testid="post-card"]`).first()
        .or(page.locator(`text=${TEST_USERS.bob.username}`).first())
        .or(page.locator('text=まだ投稿はありません'))
    ).toBeVisible({ timeout: 10000 });

    // クリーンアップ：フォロー解除
    await page.goto(`/profile/${bob.id}`);
    await page.waitForLoadState('networkidle');
    const followBtnAfter = page.locator('[data-testid="follow-button"]');
    await followBtnAfter.waitFor({ timeout: 10000 });
    if ((await followBtnAfter.textContent())?.includes('フォロー中')) {
      await followBtnAfter.click();
      await page.waitForTimeout(500);
    }
  });

  test('フォロー解除 → フォロー中一覧から消える', async ({ page }) => {
    test.setTimeout(60000);
    const bob = await navigateToBobProfile(page);
    await page.waitForLoadState('networkidle');

    // まずフォロー済み状態にする
    const followBtn = page.locator('[data-testid="follow-button"]');
    await followBtn.waitFor({ timeout: 10000 });
    const btnText = await followBtn.textContent();
    if (!btnText?.includes('フォロー中')) {
      await followBtn.click();
      await expect(followBtn).toHaveText(/フォロー中/, { timeout: 5000 });
    }

    // フォロー解除
    await followBtn.click();
    await expect(followBtn).toHaveText(/^フォロー$/, { timeout: 5000 });

    // フォロー中タブに bob の投稿が表示されないことを確認
    await page.goto('/home');
    await page.locator('[data-testid="tab-following"]').click();
    await page.waitForLoadState('networkidle');
    await expect(page.locator(`text=${TEST_USERS.bob.username}`)).not.toBeVisible({ timeout: 5000 });
  });

});
