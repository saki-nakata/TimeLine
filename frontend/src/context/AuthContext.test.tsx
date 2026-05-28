import { describe, it, expect } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '../test/mswServer'
import { AuthProvider, useAuth } from './AuthContext'

const mockUser = {
  id: 1,
  username: 'alice',
  email: 'alice@example.com',
  displayName: 'Alice',
  followerCount: 0,
  followingCount: 0,
}

function TestConsumer() {
  const { currentUser, loading, setCurrentUser, logout } = useAuth()
  return (
    <div>
      <div data-testid="loading">{String(loading)}</div>
      <div data-testid="user">{currentUser?.username ?? 'null'}</div>
      <button onClick={() => setCurrentUser({ ...mockUser, username: 'bob', id: 2, email: 'bob@example.com' })}>
        setUser
      </button>
      <button onClick={() => logout()}>logout</button>
    </div>
  )
}

describe('AuthContext', () => {
  it('初期状態はloading=trueでuserはnull', () => {
    server.use(
      http.get('/api/auth/me', async () => {
        await new Promise(() => {})
        return HttpResponse.json(mockUser)
      }),
    )
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    )
    expect(screen.getByTestId('loading').textContent).toBe('true')
    expect(screen.getByTestId('user').textContent).toBe('null')
  })

  it('meが成功した場合currentUserにセットされloading=falseになる', async () => {
    server.use(http.get('/api/auth/me', () => HttpResponse.json(mockUser)))
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    )
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'))
    expect(screen.getByTestId('user').textContent).toBe('alice')
  })

  it('meが失敗した場合currentUserはnullでloading=falseになる', async () => {
    server.use(http.get('/api/auth/me', () => new HttpResponse(null, { status: 401 })))
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    )
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'))
    expect(screen.getByTestId('user').textContent).toBe('null')
  })

  it('setCurrentUserでユーザーを更新できる', async () => {
    server.use(http.get('/api/auth/me', () => HttpResponse.json(mockUser)))
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    )
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'))

    await act(async () => {
      await userEvent.click(screen.getByText('setUser'))
    })

    expect(screen.getByTestId('user').textContent).toBe('bob')
  })

  it('logoutでcurrentUserがnullになる', async () => {
    server.use(
      http.get('/api/auth/me', () => HttpResponse.json(mockUser)),
      http.post('/api/auth/logout', () => new HttpResponse(null, { status: 204 })),
    )
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    )
    await waitFor(() => expect(screen.getByTestId('user').textContent).toBe('alice'))

    await act(async () => {
      await userEvent.click(screen.getByText('logout'))
    })

    expect(screen.getByTestId('user').textContent).toBe('null')
  })

  it('AuthProvider外でuseAuthを使うとエラーが投げられる', () => {
    const consoleError = console.error
    console.error = () => {}
    expect(() => render(<TestConsumer />)).toThrow('useAuth must be used within AuthProvider')
    console.error = consoleError
  })
})
