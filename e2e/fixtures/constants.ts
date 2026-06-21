export const API_BASE_URL = 'http://localhost:8080/api';
export const APP_BASE_URL = 'http://localhost:5173';

export const E2E_PREFIX = 'e2e_user_';
export const E2E_POST_PREFIX = '[E2E]';
export const E2E_COMMENT_PREFIX = '[E2E]';

export const TEST_USERS = {
  alice: {
    username: 'e2e_user_alice',
    email: 'e2e_alice@test.example',
    password: 'E2eTest1234!',
  },
  bob: {
    username: 'e2e_user_bob',
    email: 'e2e_bob@test.example',
    password: 'E2eTest1234!',
  },
};

export const STORAGE_STATE_PATH = './fixtures/auth-alice.json';
export const STORAGE_STATE_BOB_PATH = './fixtures/auth-bob.json';
