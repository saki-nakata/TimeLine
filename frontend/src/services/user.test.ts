import { describe, it, expect } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../test/mswServer'
import { userService } from './user'

const mockProfile = {
  id: 1,
  username: 'alice',
  displayName: 'Alice',
  avatarUrl: null,
  bio: null,
  followerCount: 0,
  followingCount: 0,
  followedByCurrentUser: false,
  createdAt: new Date().toISOString(),
}

describe('userService', () => {
  describe('followUser / unfollowUser', () => {
    it('followUserが正しいエンドポイントにPOSTする', async () => {
      server.use(
        http.post('/api/users/2/follows', () =>
          HttpResponse.json({ followerCount: 1, followingCount: 1, following: true }),
        ),
      )

      const res = await userService.followUser(2)

      expect(res.data.following).toBe(true)
    })

    it('unfollowUserが正しいエンドポイントにDELETEする', async () => {
      server.use(
        http.delete('/api/users/2/follows', () =>
          HttpResponse.json({ followerCount: 0, followingCount: 0, following: false }),
        ),
      )

      const res = await userService.unfollowUser(2)

      expect(res.data.following).toBe(false)
    })
  })

  describe('searchUsers', () => {
    it('クエリパラメータqが正しく渡される', async () => {
      let capturedUrl: URL | null = null
      server.use(
        http.get('/api/users/search', ({ request }) => {
          capturedUrl = new URL(request.url)
          return HttpResponse.json([mockProfile])
        }),
      )

      await userService.searchUsers('ali')

      expect(capturedUrl?.searchParams.get('q')).toBe('ali')
    })
  })

  describe('エラー伝播', () => {
    it('存在しないユーザーで404が伝播する', async () => {
      server.use(http.get('/api/users/999', () => new HttpResponse(null, { status: 404 })))

      await expect(userService.getProfile(999))
        .rejects.toMatchObject({ response: { status: 404 } })
    })

    it('権限なしで403が伝播する', async () => {
      server.use(http.put('/api/users/2', () => new HttpResponse(null, { status: 403 })))

      await expect(userService.updateProfile(2, { username: 'hacked' }))
        .rejects.toMatchObject({ response: { status: 403 } })
    })
  })
})
