import { describe, it, expect } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../test/mswServer'
import { postService } from './post'

const mockPost = {
  id: 1,
  userId: 1,
  username: 'alice',
  displayName: 'Alice',
  content: 'テスト投稿',
  imageUrl: null,
  likeCount: 0,
  commentCount: 0,
  likedByCurrentUser: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

describe('postService', () => {
  describe('createPost', () => {
    it('FormDataにcontentが正しく含まれる', async () => {
      let capturedFormData: FormData | null = null
      server.use(
        http.post('/api/posts', async ({ request }) => {
          capturedFormData = await request.formData()
          return HttpResponse.json(mockPost, { status: 201 })
        }),
      )

      await postService.createPost('テスト投稿', null)

      expect(capturedFormData?.get('content')).toBe('テスト投稿')
    })

  })

  describe('updatePost', () => {
    it('FormDataにremoveImageフラグが含まれる', async () => {
      let capturedFormData: FormData | null = null
      server.use(
        http.put('/api/posts/1', async ({ request }) => {
          capturedFormData = await request.formData()
          return HttpResponse.json(mockPost)
        }),
      )

      await postService.updatePost(1, 'updated', null, true)

      expect(capturedFormData?.get('removeImage')).toBe('true')
    })
  })

  describe('getTimeline', () => {
    it('cursorなしで正常にタイムラインを取得する', async () => {
      server.use(
        http.get('/api/posts', () =>
          HttpResponse.json({ posts: [mockPost], nextCursor: null, hasMore: false }),
        ),
      )

      const res = await postService.getTimeline()

      expect(res.data.posts).toHaveLength(1)
      expect(res.data.hasMore).toBe(false)
    })

    it('cursor指定でパラメータが渡される', async () => {
      let capturedUrl: URL | null = null
      server.use(
        http.get('/api/posts', ({ request }) => {
          capturedUrl = new URL(request.url)
          return HttpResponse.json({ posts: [], nextCursor: null, hasMore: false })
        }),
      )

      await postService.getTimeline(100, 20)

      expect(capturedUrl?.searchParams.get('cursor')).toBe('100')
    })
  })

  describe('エラー伝播', () => {
    it('403エラーが正しく伝播する', async () => {
      server.use(http.delete('/api/posts/1', () => new HttpResponse(null, { status: 403 })))

      await expect(postService.deletePost(1))
        .rejects.toMatchObject({ response: { status: 403 } })
    })

    it('404エラーが正しく伝播する', async () => {
      server.use(http.get('/api/posts/999', () => new HttpResponse(null, { status: 404 })))

      await expect(postService.getPost(999))
        .rejects.toMatchObject({ response: { status: 404 } })
    })
  })
})
