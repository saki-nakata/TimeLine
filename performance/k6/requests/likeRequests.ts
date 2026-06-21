import http from 'k6/http';
import { check } from 'k6';
import { BASE_URL } from '../config/config.ts';
import type { RequestHeaders } from '../helpers/auth.ts';

export function addLike(headers: RequestHeaders, postId: number): void {
  const res = http.post(`${BASE_URL}/api/posts/${postId}/likes`, null, { headers });
  check(res, { 'addLike: status 200': (r) => r.status === 200 });
}

export function removeLike(headers: RequestHeaders, postId: number): void {
  const res = http.del(`${BASE_URL}/api/posts/${postId}/likes`, null, { headers });
  check(res, { 'removeLike: status 200': (r) => r.status === 200 });
}
