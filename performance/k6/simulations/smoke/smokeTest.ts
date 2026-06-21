import http from 'k6/http';
import { Options } from 'k6/options';
import { login } from '../../helpers/auth.ts';
import { generateSummary } from '../../helpers/summary.ts';
import { authScenario } from '../../scenarios/authScenario.ts';
import { timelineScenario } from '../../scenarios/timelineScenario.ts';
import { postCreateScenario } from '../../scenarios/postCreateScenario.ts';
import { likeScenario } from '../../scenarios/likeScenario.ts';
import { commentScenario } from '../../scenarios/commentScenario.ts';
import { profileScenario } from '../../scenarios/profileScenario.ts';
import { userSearchScenario } from '../../scenarios/userSearchScenario.ts';
import { createPost, deletePost } from '../../requests/postRequests.ts';
import { TEST_USER, BASE_URL } from '../../config/config.ts';
import type { RequestHeaders } from '../../helpers/auth.ts';

interface SetupData {
  postId: number | null;
  userId: number;
  headers: RequestHeaders;
}

export const options: Options = {
  scenarios: {
    default: {
      executor: 'per-vu-iterations',
      vus: 1,
      iterations: 1,
      maxDuration: '90s',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<200'],
    http_req_failed: ['rate<0.01'],
  },
};

export function setup(): SetupData {
  const headers = login(TEST_USER.email, TEST_USER.password);
  const postId = createPost(headers, 'スモークテスト用シード投稿');
  const res = http.get(`${BASE_URL}/api/auth/me`, { headers });
  const userId = (res.json('id') as number) ?? 0;
  return { postId, userId, headers };
}

export default function (data: SetupData): void {
  authScenario();
  timelineScenario();
  postCreateScenario();
  if (data.postId !== null) likeScenario(data.postId);
  if (data.postId !== null) commentScenario(data.postId);
  profileScenario(data.userId);
  userSearchScenario();
}

export function teardown(data: SetupData): void {
  if (data.postId !== null) {
    deletePost(data.headers, data.postId);
  }
}

export const handleSummary = generateSummary('combined', 'smoke');
