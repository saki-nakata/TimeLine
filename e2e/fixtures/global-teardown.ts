import { API_BASE_URL, TEST_USERS } from './constants';

async function loginAndGetCookies(email: string, password: string): Promise<string> {
  const res = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
    redirect: 'manual',
  });
  const setCookie = res.headers.get('set-cookie') ?? '';
  return setCookie;
}

export default async function globalTeardown() {
  console.log('\n[E2E Teardown] テストデータをクリーンアップしています...');

  for (const user of Object.values(TEST_USERS)) {
    try {
      const cookies = await loginAndGetCookies(user.email, user.password);
      // ユーザーの投稿を取得して削除
      const meRes = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: { Cookie: cookies },
      });
      if (!meRes.ok) continue;
      const me = await meRes.json();

      const postsRes = await fetch(`${API_BASE_URL}/users/${me.id}/posts?limit=100`, {
        headers: { Cookie: cookies },
      });
      if (postsRes.ok) {
        const data = await postsRes.json();
        const e2ePosts = (data.posts ?? []).filter((p: { content: string }) =>
          p.content.startsWith('[E2E]'),
        );
        for (const post of e2ePosts) {
          await fetch(`${API_BASE_URL}/posts/${post.id}`, {
            method: 'DELETE',
            headers: { Cookie: cookies },
          });
        }
      }
      console.log(`  - ${user.username} のE2Eデータを削除済み`);
    } catch (e) {
      console.warn(`  - ${user.username} のクリーンアップに失敗: ${e}`);
    }
  }

  console.log('[E2E Teardown] 完了\n');
}
