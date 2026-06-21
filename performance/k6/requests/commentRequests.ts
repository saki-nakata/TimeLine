import http from 'k6/http';
import { check } from 'k6';
import { BASE_URL } from '../config/config.ts';
import type { RequestHeaders } from '../helpers/auth.ts';

export function getComments(headers: RequestHeaders, postId: number) {
  const res = http.get(`${BASE_URL}/api/posts/${postId}/comments`, { headers });
  check(res, { 'getComments: status 200': (r) => r.status === 200 });
  return res;
}

export function createComment(
  headers: RequestHeaders,
  postId: number,
  content: string,
): number | null {
  const res = http.post(`${BASE_URL}/api/posts/${postId}/comments`, JSON.stringify({ content }), {
    headers,
  });
  check(res, { 'createComment: status 201': (r) => r.status === 201 });
  const body = res.json() as { id?: number } | null;
  return body?.id ?? null;
}

export function deleteComment(headers: RequestHeaders, postId: number, commentId: number): void {
  const res = http.del(`${BASE_URL}/api/posts/${postId}/comments/${commentId}`, null, { headers });
  check(res, { 'deleteComment: status 204': (r) => r.status === 204 });
}
