import { Options } from 'k6/options';
import { userSearchScenario } from '../../scenarios/userSearchScenario.ts';
import { generateSummary } from '../../helpers/summary.ts';

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

export default function (): void {
  userSearchScenario();
}

export const handleSummary = generateSummary('userSearch', 'smoke');
