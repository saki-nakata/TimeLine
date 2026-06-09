import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '../test/mswServer'
import FollowButton from './FollowButton'

describe('FollowButton', () => {
  it('isFollowing=falseのとき「フォロー」ボタンが表示される', () => {
    render(<FollowButton userId={2} isFollowing={false} followerCount={10} onFollowChange={vi.fn()} />)
    expect(screen.getByText('フォロー')).toBeTruthy()
  })

  it('isFollowing=trueのとき「フォロー中」ボタンが表示される', () => {
    render(<FollowButton userId={2} isFollowing={true} followerCount={10} onFollowChange={vi.fn()} />)
    expect(screen.getByText('フォロー中')).toBeTruthy()
  })

  it('フォローボタンクリックで楽観的更新→サーバー確定値の順にonFollowChangeが呼ばれる', async () => {
    server.use(
      http.post('/api/users/2/follows', () =>
        HttpResponse.json({ followerCount: 11, followingCount: 0, following: true }),
      ),
    )
    const onFollowChange = vi.fn()
    render(<FollowButton userId={2} isFollowing={false} followerCount={10} onFollowChange={onFollowChange} />)
    await userEvent.click(screen.getByText('フォロー'))
    // 1回目：楽観的更新（即時）
    expect(onFollowChange).toHaveBeenNthCalledWith(1, true, 11)
    // 2回目：サーバー確定値
    await waitFor(() => expect(onFollowChange).toHaveBeenNthCalledWith(2, true, 11))
  })

  it('フォロー解除ボタンクリックで楽観的更新→サーバー確定値の順にonFollowChangeが呼ばれる', async () => {
    server.use(
      http.delete('/api/users/2/follows', () =>
        HttpResponse.json({ followerCount: 9, followingCount: 0, following: false }),
      ),
    )
    const onFollowChange = vi.fn()
    render(<FollowButton userId={2} isFollowing={true} followerCount={10} onFollowChange={onFollowChange} />)
    await userEvent.click(screen.getByText('フォロー中'))
    // 1回目：楽観的更新（即時）
    expect(onFollowChange).toHaveBeenNthCalledWith(1, false, 9)
    // 2回目：サーバー確定値
    await waitFor(() => expect(onFollowChange).toHaveBeenNthCalledWith(2, false, 9))
  })

  it('フォローAPIエラー時にリバートのonFollowChangeが呼ばれる', async () => {
    server.use(
      http.post('/api/users/2/follows', () => HttpResponse.error()),
    )
    const onFollowChange = vi.fn()
    render(<FollowButton userId={2} isFollowing={false} followerCount={10} onFollowChange={onFollowChange} />)
    await userEvent.click(screen.getByText('フォロー'))
    // 1回目：楽観的更新
    expect(onFollowChange).toHaveBeenNthCalledWith(1, true, 11)
    // 2回目：リバート（元の状態に戻す）
    await waitFor(() => expect(onFollowChange).toHaveBeenNthCalledWith(2, false, 10))
  })

  it('フォロー解除APIエラー時にリバートのonFollowChangeが呼ばれる', async () => {
    server.use(
      http.delete('/api/users/2/follows', () => HttpResponse.error()),
    )
    const onFollowChange = vi.fn()
    render(<FollowButton userId={2} isFollowing={true} followerCount={10} onFollowChange={onFollowChange} />)
    await userEvent.click(screen.getByText('フォロー中'))
    // 1回目：楽観的更新
    expect(onFollowChange).toHaveBeenNthCalledWith(1, false, 9)
    // 2回目：リバート（元の状態に戻す）
    await waitFor(() => expect(onFollowChange).toHaveBeenNthCalledWith(2, true, 10))
  })
})
