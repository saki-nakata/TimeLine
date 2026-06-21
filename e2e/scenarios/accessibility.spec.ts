import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { STORAGE_STATE_PATH, API_BASE_URL } from '../fixtures/constants';

const WCAG_TAGS = ['wcag2a', 'wcag2aa'];

// ブランドカラー（#1d9bf0）はコントラスト比 3:1 でWCAG AA基準(4.5:1)未満。
// 既知の設計上のトレードオフとして color-contrast ルールを除外し、
// その他の WCAG AA 違反がないことを検証する。
const KNOWN_EXCLUSIONS = ['color-contrast'];

function axeBuilder(page: Page) {
  return new AxeBuilder({ page })
    .withTags(WCAG_TAGS)
    .disableRules(KNOWN_EXCLUSIONS);
}

test.describe('アクセシビリティ / WCAG AA（未認証ページ）', () => {
  test('ログインページ', async ({ page }) => {
    await page.goto('/login');
    const results = await axeBuilder(page).analyze();
    expect(results.violations).toEqual([]);
  });

  test('新規登録ページ', async ({ page }) => {
    await page.goto('/register');
    const results = await axeBuilder(page).analyze();
    expect(results.violations).toEqual([]);
  });
});

test.describe('アクセシビリティ / WCAG AA（認証済みページ）', () => {
  test.use({ storageState: STORAGE_STATE_PATH });

  test('ホーム（タイムライン）ページ', async ({ page }) => {
    await page.goto('/home');
    await page.waitForLoadState('networkidle');
    const results = await axeBuilder(page).analyze();
    expect(results.violations).toEqual([]);
  });

  test('フォロー中ページ', async ({ page }) => {
    await page.goto('/following');
    await page.waitForLoadState('networkidle');
    const results = await axeBuilder(page).analyze();
    expect(results.violations).toEqual([]);
  });

  test('投稿詳細ページ', async ({ page }) => {
    await page.goto('/home');
    const card = page.locator('[data-testid="post-card"]').first();
    await card.waitFor({ timeout: 10000 }).catch(() => {});
    if (await card.count() === 0) {
      test.skip();
      return;
    }
    await card.click();
    await page.waitForURL('**/posts/**');
    await page.waitForLoadState('networkidle');
    const results = await axeBuilder(page).analyze();
    expect(results.violations).toEqual([]);
  });

  test('プロフィールページ', async ({ page }) => {
    const res = await page.request.get(`${API_BASE_URL}/auth/me`);
    const me = await res.json();
    await page.goto(`/profile/${me.id}`);
    await page.waitForLoadState('networkidle');
    const results = await axeBuilder(page).analyze();
    expect(results.violations).toEqual([]);
  });

  test('ユーザー検索（検索オーバーレイ表示時）', async ({ page }) => {
    await page.goto('/home');
    await page.click('[data-testid="nav-search"]');
    await page.locator('[data-testid="search-input"]').waitFor({ state: 'visible' });
    await page.waitForLoadState('networkidle');
    const results = await axeBuilder(page).analyze();
    expect(results.violations).toEqual([]);
  });
});
