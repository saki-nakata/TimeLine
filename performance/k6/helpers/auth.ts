import http from 'k6/http';
import { check } from 'k6';
import { BASE_URL } from '../config/config.ts';

export type RequestHeaders = Record<string, string>;

export function login(email: string, password: string): RequestHeaders {
  const res = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify({ email, password }), {
    headers: { 'Content-Type': 'application/json' },
  });
  check(res, { 'login: status 200': (r) => r.status === 200 });
  const setCookie = (res.headers['Set-Cookie'] as string) ?? '';
  const match = setCookie.match(/access_token=([^;]+)/);
  const token = match ? match[1] : '';
  return { Cookie: `access_token=${token}`, 'Content-Type': 'application/json' };
}
