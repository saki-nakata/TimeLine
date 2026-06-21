import { sleep } from 'k6';
import { login } from '../helpers/auth.ts';
import { getComments, createComment, deleteComment } from '../requests/commentRequests.ts';
import { TEST_USER } from '../config/config.ts';

export function commentScenario(seedPostId: number): void {
  const headers = login(TEST_USER.email, TEST_USER.password);

  getComments(headers, seedPostId);
  sleep(1);

  const commentId = createComment(headers, seedPostId, 'パフォーマンステストコメント');
  sleep(1);

  if (commentId !== null) {
    deleteComment(headers, seedPostId, commentId);
  }
  sleep(1);
}
