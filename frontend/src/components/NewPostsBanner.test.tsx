import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import NewPostsBanner from './NewPostsBanner'

describe('NewPostsBanner', () => {
  it('count=0のときは何も表示されない', () => {
    const { container } = render(<NewPostsBanner count={0} onClick={vi.fn()} />)
    expect(container.firstChild).toBeNull()
  })

  it('count>0のときに件数が表示される', () => {
    render(<NewPostsBanner count={3} onClick={vi.fn()} />)
    expect(screen.getByText('3件の新しい投稿 ↑')).toBeTruthy()
  })

  it('クリックでonClickが呼ばれる', async () => {
    const onClick = vi.fn()
    render(<NewPostsBanner count={1} onClick={onClick} />)
    await userEvent.click(screen.getByText('1件の新しい投稿 ↑'))
    expect(onClick).toHaveBeenCalled()
  })
})
