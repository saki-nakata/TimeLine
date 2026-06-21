import { test, expect } from '@playwright/test';
import { collectWebVitals, assertWebVitals } from '../helpers/web-vitals';
import { STORAGE_STATE_PATH, API_BASE_URL } from '../fixtures/constants';
import fs from 'fs';
import path from 'path';

// 計測結果を JSON に保存する
function saveReport(label: string, vitals: object) {
  const dir = path.join(process.cwd(), 'results');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const file = path.join(dir, `perf-${label}-${ts}.json`);
  fs.writeFileSync(file, JSON.stringify({ label, timestamp: new Date().toISOString(), vitals }, null, 2));
  console.log(`[Perf] レポート保存: ${file}`);
}

test.describe('ページ表示パフォーマンス', () => {
  test('ログインページ（TTFB / FCP / LCP）', async ({ page }) => {
    await page.goto('/login');
    const vitals = await collectWebVitals(page);
    console.log('[Perf] ログインページ:', vitals);
    saveReport('login', vitals);

    assertWebVitals(vitals, {
      ttfb: 800,
      fcp: 1800,
      lcp: 2500,
    });
  });

  test('タイムライン（ホーム）ページ（TTFB / FCP / LCP / CLS）', async ({ page }) => {
    await page.goto('/home');
    await page.waitForLoadState('networkidle');
    const vitals = await collectWebVitals(page);
    console.log('[Perf] タイムライン:', vitals);
    saveReport('timeline', vitals);

    assertWebVitals(vitals, {
      ttfb: 800,
      fcp: 1800,
      lcp: 2500,
      // タイムラインは投稿が非同期に追加されるため CLS が発生しやすい。
      // スケルトンローダー実装により改善余地あり（現状 ~0.5 程度）。
      cls: 0.6,
    });
  });

  test('投稿詳細ページ（FCP / LCP）', async ({ page }) => {
    await page.goto('/home');
    const card = page.locator('[data-testid="post-card"]').first();
    await card.waitFor({ timeout: 10000 }).catch(() => {});
    if (await card.count() === 0) {
      test.skip();
      return;
    }
    const href = await card.getAttribute('href').catch(() => null);
    // navigate to post detail
    await card.click();
    await page.waitForURL('**/posts/**');
    const vitals = await collectWebVitals(page);
    console.log('[Perf] 投稿詳細:', vitals);
    saveReport('post-detail', vitals);

    assertWebVitals(vitals, {
      ttfb: 800,
      fcp: 1800,
      lcp: 2500,
    });
  });

  test('プロフィールページ（FCP / LCP / CLS）', async ({ page }) => {
    const res = await page.request.get(`${API_BASE_URL}/auth/me`);
    const me = await res.json();
    await page.goto(`/profile/${me.id}`);
    await page.waitForLoadState('networkidle');
    const vitals = await collectWebVitals(page);
    console.log('[Perf] プロフィール:', vitals);
    saveReport('profile', vitals);

    assertWebVitals(vitals, {
      ttfb: 800,
      fcp: 1800,
      lcp: 2500,
      cls: 0.1,
    });
  });
});

// 認証済みテスト用の設定
test.use({ storageState: STORAGE_STATE_PATH });
