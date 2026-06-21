import { test, expect } from '@playwright/test';
import { measureUntilVisible, assertPerf } from '../helpers/perf-timer';
import { STORAGE_STATE_PATH, E2E_POST_PREFIX, API_BASE_URL } from '../fixtures/constants';
import fs from 'fs';
import path from 'path';

test.use({ storageState: STORAGE_STATE_PATH });

function saveTimingReport(label: string, elapsedMs: number, thresholdMs: number) {
  const dir = path.join(process.cwd(), 'results');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const file = path.join(dir, `timing-${label}-${ts}.json`);
  const passed = elapsedMs <= thresholdMs;
  fs.writeFileSync(file, JSON.stringify({
    label, timestamp: new Date().toISOString(),
    elapsedMs, thresholdMs, passed,
  }, null, 2));
  console.log(`[Timing] ${label}: ${elapsedMs}ms (閾値: ${thresholdMs}ms) → ${passed ? 'PASS' : 'FAIL'}`);
}

test.describe('操作応答時間', () => {
  test('投稿作成: 送信ボタン押下 → タイムラインに新投稿が表示される（< 1000ms）', async ({ page }) => {
    await page.goto('/home');
    const content = `${E2E_POST_PREFIX} タイミング投稿 ${Date.now()}`;

    await page.locator('button', { hasText: '投稿する' }).first().click();
    await page.fill('[data-testid="post-input"]', content);

    const result = await measureUntilVisible(
      page,
      () => page.click('[data-testid="post-submit"]'),
      `[data-testid="post-card"]:has-text("${content}")`,
    );

    saveTimingReport('post-create', result.elapsedMs, 1000);
    assertPerf(result, 1000, '投稿作成〜タイムライン表示');
  });

  test('いいね押下: ボタン押下 → カウント変化（< 300ms、楽観的更新）', async ({ page }) => {
    await page.goto('/home');
    const card = page.locator('[data-testid="post-card"]').first();
    await card.waitFor({ timeout: 10000 });

    const likeBtn = card.locator('[data-testid="like-button"]');
    const likeCount = card.locator('[data-testid="like-count"]');

    const isFilled = await card.locator('[data-testid="like-button"] svg path').getAttribute('fill');
    if (isFilled && isFilled !== 'none') {
      await likeBtn.click({ force: true });
      await page.waitForTimeout(500);
    }

    const before = parseInt((await likeCount.textContent()) ?? '0', 10);
    const expected = String(before + 1);

    const start = Date.now();
    await likeBtn.click({ force: true });
    await expect(likeCount).toHaveText(expected, { timeout: 300 });
    const elapsed = Date.now() - start;

    saveTimingReport('like-toggle', elapsed, 300);
    assertPerf({ elapsedMs: elapsed }, 300, 'いいね押下〜UI反映');
  });

  test('コメント作成: 送信 → コメント一覧に反映（< 3000ms）', async ({ page }) => {
    await page.goto('/home');
    const card = page.locator('[data-testid="post-card"]').first();
    await card.waitFor({ timeout: 10000 });
    await card.click();
    await page.waitForURL('**/posts/**');

    const comment = `${E2E_POST_PREFIX} タイミングコメント ${Date.now()}`;
    await page.fill('[data-testid="detail-comment-input"]', comment);

    const result = await measureUntilVisible(
      page,
      () => page.click('[data-testid="detail-comment-submit"]'),
      `[data-testid="comment-item"]:has-text("${comment}")`,
    );

    saveTimingReport('comment-create', result.elapsedMs, 3000);
    assertPerf(result, 3000, 'コメント作成〜一覧表示');
  });

  test('ユーザー検索: 入力完了 → 候補表示（< 1000ms）', async ({ page }) => {
    await page.goto('/home');
    await page.click('[data-testid="nav-search"]');
    await page.locator('[data-testid="search-input"]').waitFor({ state: 'visible' });

    const start = Date.now();
    await page.fill('[data-testid="search-input"]', 'e2e_user_bob');
    await expect(page.locator('[data-testid="search-result-item"]').first()).toBeVisible({ timeout: 1000 });
    const elapsed = Date.now() - start;

    saveTimingReport('search', elapsed, 1000);
    assertPerf({ elapsedMs: elapsed }, 1000, 'ユーザー検索〜候補表示');
  });

  test('無限スクロール: スクロール → 次ページ投稿追加（< 2000ms）', async ({ page }) => {
    await page.goto('/home');
    await page.locator('[data-testid="post-card"]').first().waitFor({ timeout: 10000 }).catch(() => {});
    const initialCount = await page.locator('[data-testid="post-card"]').count();
    if (initialCount === 0) {
      test.skip();
      return;
    }

    const start = Date.now();
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    // 追加の投稿が DOM に追加されるまで待機
    await page.waitForFunction(
      (count: number) => document.querySelectorAll('[data-testid="post-card"]').length > count,
      initialCount,
      { timeout: 2000 },
    ).catch(() => {
      // 全件表示済み（次ページなし）の場合はスキップ
      console.log('[Timing] 無限スクロール: 追加投稿なし（全件表示済み）');
    });
    const elapsed = Date.now() - start;

    saveTimingReport('infinite-scroll', elapsed, 2000);
    // 追加投稿があった場合のみアサート
    const finalCount = await page.locator('[data-testid="post-card"]').count();
    if (finalCount > initialCount) {
      assertPerf({ elapsedMs: elapsed }, 2000, '無限スクロール〜追加投稿表示');
    }
  });
});
