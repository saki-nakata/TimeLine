import { sleep } from 'k6';
import { login } from '../helpers/auth.ts';
import { getTimeline } from '../requests/postRequests.ts';
import { TEST_USER } from '../config/config.ts';

export function timelineScenario(): void {
  const headers = login(TEST_USER.email, TEST_USER.password);
  const res = getTimeline(headers, 'all');
  sleep(1);
  const cursor = (res.json('nextCursor') as string | null) ?? null;
  if (cursor) getTimeline(headers, 'all', cursor);
  sleep(1);
  getTimeline(headers, 'following');
  sleep(1);
}
