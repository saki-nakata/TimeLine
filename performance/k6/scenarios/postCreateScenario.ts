import { sleep } from 'k6';
import { login } from '../helpers/auth.ts';
import { createPost, deletePost } from '../requests/postRequests.ts';
import { TEST_USER } from '../config/config.ts';

export function postCreateScenario(): void {
  const headers = login(TEST_USER.email, TEST_USER.password);

  const postId = createPost(headers, 'パフォーマンステスト投稿');
  sleep(1);

  if (postId !== null) {
    deletePost(headers, postId);
  }
  sleep(1);
}
