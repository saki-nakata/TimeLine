import { sleep } from 'k6';
import { SharedArray } from 'k6/data';
import { login } from '../helpers/auth.ts';
import { searchUsers } from '../requests/userRequests.ts';
import { TEST_USER } from '../config/config.ts';

const keywords = new SharedArray<string>('keywords', function () {
  return open('../data/search_keywords.csv')
    .split('\n')
    .slice(1)
    .filter((line) => line.trim() !== '');
});

export function userSearchScenario(): void {
  const headers = login(TEST_USER.email, TEST_USER.password);
  const keyword = keywords[Math.floor(Math.random() * keywords.length)];
  searchUsers(headers, keyword.trim());
  sleep(1);
}
