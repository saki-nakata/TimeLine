import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '../test/mswServer'
import { ToastProvider } from '../context/ToastContext'
import CommentModal from './CommentModal'
import type { PostResponse } from '../types/post'
import type { UserResponse } from '../types/user'

const mockPost: PostResponse = {
  id: 1,
  content: 'テスト投稿',
  username: 'bob',
  displayName: 'Bob',
  avatarUrl: null,
  userId: 2,
  likeCount: 0,
  likedByCurrentUser: false,
  commentCount: 3,
  createdAt: '2026-01-01T00:00:00Z',
}

const mockCurrentUser: UserResponse = {
  id: 1,
  username: 'alice',
  displayName: 'Alice',
  avatarUrl: null,
  email: 'alice@example.com',
  bio: null,
  followerCount: 0,
  followingCount: 0,
}

function renderModal(onCommentCreated = vi.fn(), onClose = vi.fn()) {
  return render(
    <ToastProvider>
      <CommentModal
        open={true}
        post={mockPost}
        currentUser={mockCurrentUser}
        onClose={onClose}
        onCommentCreated={onCommentCreated}
      />
    </ToastProvider>
  )
}

describe('CommentModal', () => {
  it('コメント送信後、即座にonCommentCreated(count+1)とonCloseが呼ばれる', async () => {
    server.use(
      http.post('/api/posts/1/comments', () =>
        HttpResponse.json({ id: 10, postId: 1, userId: 1, username: 'alice', displayName: 'Alice', avatarUrl: null, content: 'テスト', createdAt: '2026-01-01T00:00:00Z' }, { status: 201 })
      ),
    )
    const onCommentCreated = vi.fn()
    const onClose = vi.fn()
    renderModal(onCommentCreated, onClose)

    await userEvent.type(screen.getByPlaceholderText('返信をポスト'), 'テスト')
    await userEvent.click(screen.getByText('返信する'))

    // 楽観的更新：APIを待たず即時呼ばれる
    expect(onCommentCreated).toHaveBeenCalledWith(1, 4)
    expect(onClose).toHaveBeenCalled()
  })

  it('APIエラー時にonCommentCreatedで元のカウントに戻す', async () => {
    server.use(
      http.post('/api/posts/1/comments', () => HttpResponse.error()),
    )
    const onCommentCreated = vi.fn()
    renderModal(onCommentCreated)

    await userEvent.type(screen.getByPlaceholderText('返信をポスト'), 'テスト')
    await userEvent.click(screen.getByText('返信する'))

    // 1回目：楽観的更新
    expect(onCommentCreated).toHaveBeenNthCalledWith(1, 1, 4)
    // 2回目：エラー時リバート
    await waitFor(() => expect(onCommentCreated).toHaveBeenNthCalledWith(2, 1, 3))
  })

  it('APIエラー時にトーストが表示される', async () => {
    server.use(
      http.post('/api/posts/1/comments', () => HttpResponse.error()),
    )
    renderModal()

    await userEvent.type(screen.getByPlaceholderText('返信をポスト'), 'テスト')
    await userEvent.click(screen.getByText('返信する'))

    await waitFor(() =>
      expect(screen.getByText('コメントの投稿に失敗しました')).toBeInTheDocument()
    )
  })
})
