import { Options } from 'k6/options';
import { commentScenario } from '../../scenarios/commentScenario.ts';
import { generateSummary } from '../../helpers/summary.ts';
import { login } from '../../helpers/auth.ts';
import { createPost, deletePost } from '../../requests/postRequests.ts';
import { TEST_USER } from '../../config/config.ts';
import type { RequestHeaders } from '../../helpers/auth.ts';

interface SetupData {
  postId: number | null;
  headers: RequestHeaders;
}

export const options: Options = {
  scenarios: {
    default: {
      executor: 'constant-vus',
      vus: 1,
      duration: '10s',
      gracefulStop: '5s',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<200'],
    http_req_failed: ['rate<0.01'],
  },
};

export function setup(): SetupData {
  const headers = login(TEST_USER.email, TEST_USER.password);
  const postId = createPost(headers, 'コメントスモークテスト用シード投稿');
  return { postId, headers };
}

export default function (data: SetupData): void {
  if (data.postId !== null) {
    commentScenario(data.postId);
  }
}

export function teardown(data: SetupData): void {
  if (data.postId !== null) {
    deletePost(data.headers, data.postId);
  }
}

export const handleSummary = generateSummary('comment', 'smoke');
