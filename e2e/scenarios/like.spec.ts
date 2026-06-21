import { test, expect, type Page } from '@playwright/test';
import { STORAGE_STATE_PATH, E2E_POST_PREFIX } from '../fixtures/constants';

test.use({ storageState: STORAGE_STATE_PATH });

test.describe('いいね', () => {
  async function getFirstPostCard(page: Page) {
    await page.goto('/home');
    const card = page.locator('[data-testid="post-card"]').first();
    await card.waitFor({ timeout: 10000 });
    return card;
  }

  test('いいねボタン押下 → カウントが +1 される', async ({ page }) => {
    const card = await getFirstPostCard(page);
    const likeBtn = card.locator('[data-testid="like-button"]');
    const likeCount = card.locator('[data-testid="like-count"]');

    // まず未いいね状態にする
    const isLiked = (await likeBtn.getAttribute('data-liked')) === 'true';
    if (isLiked) {
      await likeBtn.click({ force: true });
      await page.waitForTimeout(600);
    }

    const before = parseInt((await likeCount.textContent()) ?? '0', 10);
    await likeBtn.click({ force: true });
    await expect(likeCount).toHaveText(String(before + 1));
  });

  test('いいねを取り消す → カウントが -1 される', async ({ page }) => {
    const card = await getFirstPostCard(page);
    const likeBtn = card.locator('[data-testid="like-button"]');
    const likeCount = card.locator('[data-testid="like-count"]');

    // まずいいね済み状態にする
    const isLiked = (await likeBtn.getAttribute('data-liked')) === 'true';
    if (!isLiked) {
      await likeBtn.click({ force: true });
      await page.waitForTimeout(600);
    }

    const after = parseInt((await likeCount.textContent()) ?? '0', 10);
    // 取り消す
    await likeBtn.click({ force: true });
    await expect(likeCount).toHaveText(String(after - 1));
  });

  test('ページリロード後もいいね状態が維持される', async ({ page }) => {
    const card = await getFirstPostCard(page);
    const likeBtn = card.locator('[data-testid="like-button"]');

    // いいね状態にする
    const isLiked = (await likeBtn.getAttribute('data-liked')) === 'true';
    if (!isLiked) {
      await likeBtn.click({ force: true });
      await page.waitForTimeout(1000);
    }

    const countBefore = await card.locator('[data-testid="like-count"]').textContent();

    // リロード
    await page.reload();
    await page.waitForSelector('[data-testid="post-card"]', { timeout: 10000 });

    const reloadedCard = page.locator('[data-testid="post-card"]').first();
    const reloadedCount = await reloadedCard.locator('[data-testid="like-count"]').textContent();

    // カウントが同じ（いいね状態が保持されている）
    expect(reloadedCount).toBe(countBefore);
  });

});
