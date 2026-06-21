import http from 'k6/http';
import { Options } from 'k6/options';
import { login } from '../../helpers/auth.ts';
import { generateSummary } from '../../helpers/summary.ts';
import { timelineScenario } from '../../scenarios/timelineScenario.ts';
import { postCreateScenario } from '../../scenarios/postCreateScenario.ts';
import { likeScenario } from '../../scenarios/likeScenario.ts';
import { commentScenario } from '../../scenarios/commentScenario.ts';
import { profileScenario } from '../../scenarios/profileScenario.ts';
import { createPost, deletePost } from '../../requests/postRequests.ts';
import { TEST_USER, BASE_URL } from '../../config/config.ts';
import type { RequestHeaders } from '../../helpers/auth.ts';

interface SetupData {
  postId: number | null;
  userId: number;
  headers: RequestHeaders;
}

export const options: Options = {
  stages: [
    { duration: '3m', target: 10 },
    { duration: '3m', target: 30 },
    { duration: '3m', target: 50 },
    { duration: '3m', target: 100 },
    { duration: '3m', target: 150 },
    { duration: '3m', target: 200 },
    { duration: '2m', target: 0 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<2000'],
  },
};

export function setup(): SetupData {
  const headers = login(TEST_USER.email, TEST_USER.password);
  const postId = createPost(headers, 'ストレステスト用インタラクションシード投稿');
  const res = http.get(`${BASE_URL}/api/auth/me`, { headers });
  const userId = (res.json('id') as number) ?? 0;
  return { postId, userId, headers };
}

export default function (data: SetupData): void {
  const r = Math.random();

  if (r < 0.6) {
    timelineScenario();
  } else if (r < 0.75) {
    postCreateScenario();
  } else if (r < 0.825) {
    if (data.postId !== null) likeScenario(data.postId);
  } else if (r < 0.9) {
    if (data.postId !== null) commentScenario(data.postId);
  } else {
    profileScenario(data.userId);
  }
}

export function teardown(data: SetupData): void {
  if (data.postId !== null) {
    deletePost(data.headers, data.postId);
  }
}

export const handleSummary = generateSummary('combined', 'stress');
