import http from 'k6/http';
import { Options } from 'k6/options';
import { profileScenario } from '../../scenarios/profileScenario.ts';
import { generateSummary } from '../../helpers/summary.ts';
import { login } from '../../helpers/auth.ts';
import { TEST_USER, BASE_URL } from '../../config/config.ts';

interface SetupData {
  userId: number;
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
  const res = http.get(`${BASE_URL}/api/auth/me`, { headers });
  const userId = (res.json('id') as number) ?? 0;
  return { userId };
}

export default function (data: SetupData): void {
  profileScenario(data.userId);
}

export const handleSummary = generateSummary('profile', 'smoke');
