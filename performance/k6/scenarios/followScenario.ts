import { sleep } from 'k6';
import { login } from '../helpers/auth.ts';
import { followUser, unfollowUser } from '../requests/userRequests.ts';
import { TEST_USER } from '../config/config.ts';

export function followScenario(targetUserId: number): void {
  const headers = login(TEST_USER.email, TEST_USER.password);
  followUser(headers, targetUserId);
  sleep(1);
  unfollowUser(headers, targetUserId);
  sleep(1);
}
