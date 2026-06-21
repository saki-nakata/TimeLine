import http from 'k6/http';
import { check } from 'k6';
import { BASE_URL } from '../config/config.ts';
import type { RequestHeaders } from '../helpers/auth.ts';

export function register(username: string, email: string, password: string): void {
  const res = http.post(
    `${BASE_URL}/api/auth/register`,
    JSON.stringify({ username, email, password }),
    { headers: { 'Content-Type': 'application/json' } },
  );
  check(res, { 'register: status 201': (r) => r.status === 201 });
}

export function getMe(headers: RequestHeaders) {
  const res = http.get(`${BASE_URL}/api/auth/me`, { headers });
  check(res, { 'getMe: status 200': (r) => r.status === 200 });
  return res;
}

export function logout(headers: RequestHeaders): void {
  const res = http.post(`${BASE_URL}/api/auth/logout`, null, { headers });
  check(res, { 'logout: status 204': (r) => r.status === 204 });
}
