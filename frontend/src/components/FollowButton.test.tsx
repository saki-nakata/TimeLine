import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '../test/mswServer'
import FollowButton from './FollowButton'

describe('FollowButton', () => {
  it('isFollowing=falseのとき「フォロー」ボタンが表示される', () => {
    render(<FollowButton userId={2} isFollowing={false} onFollowChange={vi.fn()} />)
    expect(screen.getByText('フォロー')).toBeTruthy()
  })

  it('isFollowing=trueのとき「フォロー中」ボタンが表示される', () => {
    render(<FollowButton userId={2} isFollowing={true} onFollowChange={vi.fn()} />)
    expect(screen.getByText('フォロー中')).toBeTruthy()
  })

  it('フォローボタンクリックでフォローAPIが呼ばれonFollowChangeが呼ばれる', async () => {
    server.use(
      http.post('/api/users/2/follows', () =>
        HttpResponse.json({ followerCount: 1, followingCount: 0, following: true }),
      ),
    )
    const onFollowChange = vi.fn()
    render(<FollowButton userId={2} isFollowing={false} onFollowChange={onFollowChange} />)
    await userEvent.click(screen.getByText('フォロー'))
    await waitFor(() => expect(onFollowChange).toHaveBeenCalledWith(true, 1))
  })

  it('フォロー解除ボタンクリックでunfollowAPIが呼ばれonFollowChangeが呼ばれる', async () => {
    server.use(
      http.delete('/api/users/2/follows', () =>
        HttpResponse.json({ followerCount: 0, followingCount: 0, following: false }),
      ),
    )
    const onFollowChange = vi.fn()
    render(<FollowButton userId={2} isFollowing={true} onFollowChange={onFollowChange} />)
    await userEvent.click(screen.getByText('フォロー中'))
    await waitFor(() => expect(onFollowChange).toHaveBeenCalledWith(false, 0))
  })
})
