import { sleep } from 'k6';
import { login } from '../helpers/auth.ts';
import { getMe, logout } from '../requests/authRequests.ts';
import { TEST_USER } from '../config/config.ts';

export function authScenario(): void {
  const headers = login(TEST_USER.email, TEST_USER.password);
  sleep(1);
  getMe(headers);
  sleep(1);
  logout(headers);
  sleep(1);
}
