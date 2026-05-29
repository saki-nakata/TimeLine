import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import PostCard from './PostCard'
import type { PostResponse } from '../types/post'

const mockPost: PostResponse = {
  id: 1,
  userId: 1,
  username: 'alice',
  displayName: 'Alice',
  avatarUrl: null,
  content: 'テスト投稿',
  imageUrl: null,
  likeCount: 3,
  commentCount: 2,
  likedByCurrentUser: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

function renderPostCard(overrides?: Partial<PostResponse>, currentUserId = 1) {
  const post = { ...mockPost, ...overrides }
  const onDelete = vi.fn()
  const onEdit = vi.fn()
  const onLikeToggle = vi.fn()
  const onCommentClick = vi.fn()
  render(
    <MemoryRouter>
      <PostCard
        post={post}
        currentUserId={currentUserId}
        onDelete={onDelete}
        onEdit={onEdit}
        onLikeToggle={onLikeToggle}
        onCommentClick={onCommentClick}
      />
    </MemoryRouter>,
  )
  return { onDelete, onEdit, onLikeToggle, onCommentClick }
}

describe('PostCard', () => {
  it('投稿内容が表示される', () => {
    renderPostCard()
    expect(screen.getByText('テスト投稿')).toBeTruthy()
  })

  it('displayNameとusernameが表示される', () => {
    renderPostCard()
    expect(screen.getByText('Alice')).toBeTruthy()
    expect(screen.getByText('@alice')).toBeTruthy()
  })

  it('likeCountとcommentCountが表示される', () => {
    renderPostCard()
    expect(screen.getByText('3')).toBeTruthy()
    expect(screen.getByText('2')).toBeTruthy()
  })

  it('自分の投稿には編集・削除ボタンが表示される', () => {
    renderPostCard({}, 1)
    expect(screen.getByTitle('編集')).toBeTruthy()
    expect(screen.getByTitle('削除')).toBeTruthy()
  })

  it('他人の投稿には編集・削除ボタンが表示されない', () => {
    renderPostCard({}, 99)
    expect(screen.queryByTitle('編集')).toBeNull()
    expect(screen.queryByTitle('削除')).toBeNull()
  })

  it('いいねボタンクリックでonLikeToggleが呼ばれる', async () => {
    const { onLikeToggle } = renderPostCard()
    await userEvent.click(screen.getByText('3').closest('button')!)
    expect(onLikeToggle).toHaveBeenCalledWith(mockPost)
  })

  it('コメントボタンクリックでonCommentClickが呼ばれる', async () => {
    const { onCommentClick } = renderPostCard()
    await userEvent.click(screen.getByText('2').closest('button')!)
    expect(onCommentClick).toHaveBeenCalledWith(mockPost)
  })

  it('削除ボタンクリックでonDeleteが呼ばれる', async () => {
    const { onDelete } = renderPostCard()
    await userEvent.click(screen.getByTitle('削除'))
    expect(onDelete).toHaveBeenCalledWith(1)
  })

  it('編集ボタンクリックでonEditが呼ばれる', async () => {
    const { onEdit } = renderPostCard()
    await userEvent.click(screen.getByTitle('編集'))
    expect(onEdit).toHaveBeenCalledWith(mockPost)
  })

  it('画像URLがある場合は画像が表示される', () => {
    renderPostCard({ imageUrl: 'http://example.com/img.jpg' })
    expect(screen.getByAltText('投稿画像')).toBeTruthy()
  })
})
