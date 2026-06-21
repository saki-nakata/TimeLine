import http from 'k6/http';
import { check } from 'k6';
import { BASE_URL } from '../config/config.ts';
import type { RequestHeaders } from '../helpers/auth.ts';

export function getTimeline(
  headers: RequestHeaders,
  type: 'all' | 'following' = 'all',
  cursor: string | null = null,
) {
  let url = `${BASE_URL}/api/posts?type=${type}&limit=20`;
  if (cursor) url += `&cursor=${cursor}`;
  const res = http.get(url, { headers });
  check(res, { 'getTimeline: status 200': (r) => r.status === 200 });
  return res;
}

export function getPost(headers: RequestHeaders, postId: number) {
  const res = http.get(`${BASE_URL}/api/posts/${postId}`, { headers });
  check(res, { 'getPost: status 200': (r) => r.status === 200 });
  return res;
}

function buildMultipart(fields: Record<string, string>): { body: string; contentType: string } {
  const boundary = `----k6Boundary${Math.random().toString(36).slice(2)}`;
  const parts = Object.entries(fields)
    .map(
      ([name, value]) =>
        `--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}`,
    )
    .join('\r\n');
  return {
    body: `${parts}\r\n--${boundary}--`,
    contentType: `multipart/form-data; boundary=${boundary}`,
  };
}

export function createPost(headers: RequestHeaders, content: string): number | null {
  const { body, contentType } = buildMultipart({ content });
  const res = http.post(`${BASE_URL}/api/posts`, body, {
    headers: { Cookie: headers['Cookie'], 'Content-Type': contentType },
  });
  check(res, { 'createPost: status 201': (r) => r.status === 201 });
  const resBody = res.json() as { id?: number } | null;
  return resBody?.id ?? null;
}

export function updatePost(headers: RequestHeaders, postId: number, content: string) {
  const { body, contentType } = buildMultipart({ content });
  const res = http.put(`${BASE_URL}/api/posts/${postId}`, body, {
    headers: { Cookie: headers['Cookie'], 'Content-Type': contentType },
  });
  check(res, { 'updatePost: status 200': (r) => r.status === 200 });
  return res;
}

export function deletePost(headers: RequestHeaders, postId: number): void {
  const res = http.del(`${BASE_URL}/api/posts/${postId}`, null, { headers });
  check(res, { 'deletePost: status 204': (r) => r.status === 204 });
}
