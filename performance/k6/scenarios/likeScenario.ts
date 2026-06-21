import { sleep } from 'k6';
import { login } from '../helpers/auth.ts';
import { addLike, removeLike } from '../requests/likeRequests.ts';
import { TEST_USER } from '../config/config.ts';

export function likeScenario(seedPostId: number): void {
  const headers = login(TEST_USER.email, TEST_USER.password);
  addLike(headers, seedPostId);
  sleep(1);
  removeLike(headers, seedPostId);
  sleep(1);
}
