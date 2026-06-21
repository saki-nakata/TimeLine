export const BASE_URL = 'http://localhost:8080';
export const TIMEOUT = '10s';

export interface TestUser {
  email: string;
  password: string;
}

export const TEST_USER: TestUser = {
  email: 'perf_user_001@example.com',
  password: 'perfPassword1!',
};
