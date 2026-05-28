import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '../test/mswServer'
import PostForm from './PostForm'

const mockPost = {
  id: 1,
  userId: 1,
  username: 'alice',
  displayName: 'Alice',
  avatarUrl: null,
  content: 'テスト投稿',
  imageUrl: null,
  likeCount: 0,
  commentCount: 0,
  likedByCurrentUser: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

describe('PostForm', () => {
  it('open=falseのときは何も表示されない', () => {
    render(<PostForm open={false} onClose={vi.fn()} onPostCreated={vi.fn()} />)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('open=trueのときダイアログが表示される', () => {
    render(<PostForm open={true} onClose={vi.fn()} onPostCreated={vi.fn()} />)
    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(screen.getByPlaceholderText('いまどうしてる？')).toBeTruthy()
  })

  it('内容が空のときは投稿ボタンが無効', () => {
    render(<PostForm open={true} onClose={vi.fn()} onPostCreated={vi.fn()} />)
    expect(screen.getByText('投稿する')).toBeDisabled()
  })

  it('内容入力後に投稿ボタンが有効になる', async () => {
    render(<PostForm open={true} onClose={vi.fn()} onPostCreated={vi.fn()} />)
    await userEvent.type(screen.getByPlaceholderText('いまどうしてる？'), 'こんにちは')
    expect(screen.getByText('投稿する')).not.toBeDisabled()
  })

  it('キャンセルボタンクリックでonCloseが呼ばれる', async () => {
    const onClose = vi.fn()
    render(<PostForm open={true} onClose={onClose} onPostCreated={vi.fn()} />)
    await userEvent.click(screen.getByText('キャンセル'))
    expect(onClose).toHaveBeenCalled()
  })

  it('投稿成功時にonPostCreatedが呼ばれモーダルが閉じる', async () => {
    server.use(
      http.post('/api/posts', () => HttpResponse.json(mockPost, { status: 201 })),
    )
    const onPostCreated = vi.fn()
    const onClose = vi.fn()
    render(<PostForm open={true} onClose={onClose} onPostCreated={onPostCreated} />)
    await userEvent.type(screen.getByPlaceholderText('いまどうしてる？'), 'こんにちは')
    await userEvent.click(screen.getByText('投稿する'))
    await waitFor(() => expect(onPostCreated).toHaveBeenCalledWith(mockPost))
    expect(onClose).toHaveBeenCalled()
  })

  it('280文字を超えると投稿ボタンが無効になる', async () => {
    render(<PostForm open={true} onClose={vi.fn()} onPostCreated={vi.fn()} />)
    const longText = 'a'.repeat(281)
    await userEvent.type(screen.getByPlaceholderText('いまどうしてる？'), longText)
    expect(screen.getByText('投稿する')).toBeDisabled()
  })
})
