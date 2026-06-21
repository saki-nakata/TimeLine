import { sleep } from 'k6';
import { login } from '../helpers/auth.ts';
import { getProfile, getUserPosts } from '../requests/userRequests.ts';
import { TEST_USER } from '../config/config.ts';

export function profileScenario(seedUserId: number): void {
  const headers = login(TEST_USER.email, TEST_USER.password);
  getProfile(headers, seedUserId);
  sleep(1);
  getUserPosts(headers, seedUserId);
  sleep(1);
}
