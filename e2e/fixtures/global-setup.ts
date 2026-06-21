import { chromium } from '@playwright/test';
import { API_BASE_URL, TEST_USERS, STORAGE_STATE_PATH, STORAGE_STATE_BOB_PATH } from './constants';

async function registerUser(username: string, email: string, password: string) {
  const res = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email, password }),
  });
  // 409 (already exists) は無視する
  if (!res.ok && res.status !== 409) {
    const body = await res.text();
    throw new Error(`Failed to register ${username}: ${res.status} ${body}`);
  }
}

async function saveStorageState(email: string, password: string, outputPath: string) {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto('http://localhost:5173/login');
  await page.fill('[data-testid="email-input"]', email);
  await page.fill('[data-testid="password-input"]', password);
  await page.click('[data-testid="login-submit"]');
  await page.waitForURL('**/home');

  await context.storageState({ path: outputPath });
  await browser.close();
}

export default async function globalSetup() {
  console.log('\n[E2E Setup] テストユーザーを作成しています...');

  for (const user of Object.values(TEST_USERS)) {
    await registerUser(user.username, user.email, user.password);
    console.log(`  - ${user.username} 登録済み`);
  }

  console.log('[E2E Setup] storageState を保存しています...');
  await saveStorageState(TEST_USERS.alice.email, TEST_USERS.alice.password, STORAGE_STATE_PATH);
  await saveStorageState(TEST_USERS.bob.email, TEST_USERS.bob.password, STORAGE_STATE_BOB_PATH);

  console.log('[E2E Setup] 完了\n');
}
