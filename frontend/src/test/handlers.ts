import { http, HttpResponse } from 'msw'

const baseUrl = 'http://localhost'

export const handlers = [
  http.post(`${baseUrl}/api/auth/login`, () =>
    HttpResponse.json({ id: 1, username: 'alice', email: 'alice@example.com', displayName: 'Alice', followerCount: 0, followingCount: 0 })
  ),
  http.post(`${baseUrl}/api/auth/register`, () =>
    HttpResponse.json({ id: 1, username: 'alice', email: 'alice@example.com', displayName: 'Alice', followerCount: 0, followingCount: 0 }, { status: 201 })
  ),
  http.post(`${baseUrl}/api/auth/logout`, () => new HttpResponse(null, { status: 204 })),
  http.get(`${baseUrl}/api/auth/me`, () =>
    HttpResponse.json({ id: 1, username: 'alice', email: 'alice@example.com', displayName: 'Alice', followerCount: 0, followingCount: 0 })
  ),
  http.post(`${baseUrl}/api/auth/refresh`, () =>
    HttpResponse.json({ id: 1, username: 'alice', email: 'alice@example.com', displayName: 'Alice', followerCount: 0, followingCount: 0 })
  ),
  http.get(`${baseUrl}/api/posts`, () =>
    HttpResponse.json({ posts: [], nextCursor: null, hasMore: false })
  ),
  http.get(`${baseUrl}/api/users/:userId`, ({ params }) =>
    HttpResponse.json({ id: Number(params.userId), username: 'alice', displayName: 'Alice', followerCount: 0, followingCount: 0, followedByCurrentUser: false })
  ),
  http.get(`${baseUrl}/api/users/search`, () =>
    HttpResponse.json([])
  ),
]
