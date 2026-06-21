import http from 'k6/http';
import { check } from 'k6';
import { BASE_URL } from '../config/config.ts';
import type { RequestHeaders } from '../helpers/auth.ts';

export function getProfile(headers: RequestHeaders, userId: number) {
  const res = http.get(`${BASE_URL}/api/users/${userId}`, { headers });
  check(res, { 'getProfile: status 200': (r) => r.status === 200 });
  return res;
}

export function getUserPosts(
  headers: RequestHeaders,
  userId: number,
  cursor: string | null = null,
) {
  let url = `${BASE_URL}/api/users/${userId}/posts?limit=20`;
  if (cursor) url += `&cursor=${cursor}`;
  const res = http.get(url, { headers });
  check(res, { 'getUserPosts: status 200': (r) => r.status === 200 });
  return res;
}

export function searchUsers(headers: RequestHeaders, keyword: string) {
  const res = http.get(
    `${BASE_URL}/api/users/search?q=${encodeURIComponent(keyword)}`,
    { headers },
  );
  check(res, { 'searchUsers: status 200': (r) => r.status === 200 });
  return res;
}

export function followUser(headers: RequestHeaders, userId: number): void {
  const res = http.post(`${BASE_URL}/api/users/${userId}/follows`, null, { headers });
  check(res, { 'followUser: status 200': (r) => r.status === 200 });
}

export function unfollowUser(headers: RequestHeaders, userId: number): void {
  const res = http.del(`${BASE_URL}/api/users/${userId}/follows`, null, { headers });
  check(res, { 'unfollowUser: status 200': (r) => r.status === 200 });
}
