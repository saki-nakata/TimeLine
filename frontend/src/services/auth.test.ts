import { describe, it, expect, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../test/mswServer'
import { authService } from './auth'
import api from './auth'

const mockUser = {
  id: 1,
  username: 'alice',
  email: 'alice@example.com',
  displayName: 'Alice',
  followerCount: 0,
  followingCount: 0,
}

// ─── authService ──────────────────────────────────────────────────────────────

describe('authService', () => {
  describe('login', () => {
    it('正常ログイン時にUserResponseが返る', async () => {
      server.use(http.post('/api/auth/login', () => HttpResponse.json(mockUser)))

      const res = await authService.login({ email: 'alice@example.com', password: 'password' })

      expect(res.data.username).toBe('alice')
    })

    it('認証失敗時に401エラーが伝播する', async () => {
      server.use(http.post('/api/auth/login', () => new HttpResponse(null, { status: 401 })))

      await expect(authService.login({ email: 'a@a.com', password: 'wrong' }))
        .rejects.toMatchObject({ response: { status: 401 } })
    })
  })

  describe('register', () => {
    it('登録成功時に201でUserResponseが返る', async () => {
      server.use(http.post('/api/auth/register', () => HttpResponse.json(mockUser, { status: 201 })))

      const res = await authService.register({ username: 'alice', email: 'alice@example.com', password: 'password123' })

      expect(res.status).toBe(201)
      expect(res.data.username).toBe('alice')
    })

    it('ユーザー名重複時に409エラーが伝播する', async () => {
      server.use(http.post('/api/auth/register', () => new HttpResponse(null, { status: 409 })))

      await expect(authService.register({ username: 'alice', email: 'alice@example.com', password: 'password123' }))
        .rejects.toMatchObject({ response: { status: 409 } })
    })
  })

  describe('logout', () => {
    it('204が返る', async () => {
      server.use(http.post('/api/auth/logout', () => new HttpResponse(null, { status: 204 })))

      const res = await authService.logout()

      expect(res.status).toBe(204)
    })
  })

  describe('me', () => {
    it('認証済みの場合UserResponseが返る', async () => {
      server.use(http.get('/api/auth/me', () => HttpResponse.json(mockUser)))

      const res = await authService.me()

      expect(res.data.id).toBe(1)
    })
  })
})

// ─── 401 自動リフレッシュインターセプター ─────────────────────────────────────

describe('401自動リフレッシュインターセプター', () => {
  it('401発生時にリフレッシュを試みて元のリクエストを再実行する', async () => {
    let callCount = 0
    server.use(
      http.get('/api/posts', () => {
        callCount++
        if (callCount === 1) return new HttpResponse(null, { status: 401 })
        return HttpResponse.json({ posts: [], nextCursor: null, hasMore: false })
      }),
      http.post('/api/auth/refresh', () => HttpResponse.json(mockUser)),
    )

    const res = await api.get('/posts')

    expect(callCount).toBe(2)
    expect(res.status).toBe(200)
  })

  it('リフレッシュも失敗した場合はエラーが伝播する', async () => {
    const originalLocation = window.location.href
    const assignMock = vi.fn()
    Object.defineProperty(window, 'location', {
      value: { pathname: '/home', href: originalLocation },
      writable: true,
    })
    Object.defineProperty(window.location, 'href', {
      set: assignMock,
      get: () => originalLocation,
    })

    server.use(
      http.get('/api/posts', () => new HttpResponse(null, { status: 401 })),
      http.post('/api/auth/refresh', () => new HttpResponse(null, { status: 401 })),
    )

    await expect(api.get('/posts')).rejects.toBeDefined()
  })

  it('/auth/refreshへのリクエストはリトライされない', async () => {
    server.use(
      http.post('/api/auth/refresh', () => new HttpResponse(null, { status: 401 })),
    )

    await expect(api.post('/auth/refresh')).rejects.toMatchObject({ response: { status: 401 } })
  })
})

// ─── 500系エラーインターセプター ──────────────────────────────────────────────

describe('500系エラーインターセプター', () => {
  it('500エラー時にapi-errorイベントが発火される', async () => {
    server.use(http.get('/api/posts', () => new HttpResponse(null, { status: 500 })))

    const events: CustomEvent[] = []
    const handler = (e: Event) => events.push(e as CustomEvent)
    window.addEventListener('api-error', handler)

    await expect(api.get('/posts')).rejects.toBeDefined()

    expect(events).toHaveLength(1)
    expect(events[0].detail.message).toContain('サーバーエラー')

    window.removeEventListener('api-error', handler)
  })

  it('503エラー時もapi-errorイベントが発火される', async () => {
    server.use(http.get('/api/posts', () => new HttpResponse(null, { status: 503 })))

    const events: CustomEvent[] = []
    const handler = (e: Event) => events.push(e as CustomEvent)
    window.addEventListener('api-error', handler)

    await expect(api.get('/posts')).rejects.toBeDefined()

    expect(events).toHaveLength(1)

    window.removeEventListener('api-error', handler)
  })

  it('400エラー時はapi-errorイベントが発火されない', async () => {
    server.use(http.get('/api/posts', () => new HttpResponse(null, { status: 400 })))

    const events: CustomEvent[] = []
    const handler = (e: Event) => events.push(e as CustomEvent)
    window.addEventListener('api-error', handler)

    await expect(api.get('/posts')).rejects.toBeDefined()

    expect(events).toHaveLength(0)

    window.removeEventListener('api-error', handler)
  })
})
