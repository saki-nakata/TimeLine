import { describe, it, expect } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { http, HttpResponse } from 'msw'
import { server } from '../test/mswServer'
import LoginPage from './LoginPage'
import { AuthProvider } from '../context/AuthContext'

function renderLoginPage(initialState?: object) {
  render(
    <MemoryRouter initialEntries={[{ pathname: '/login', state: initialState }]}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/home" element={<div>ホームページ</div>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  )
}

const mockUser = {
  id: 1,
  username: 'alice',
  email: 'alice@example.com',
  displayName: 'Alice',
  followerCount: 0,
  followingCount: 0,
}

describe('LoginPage', () => {
  it('ログインフォームが表示される', async () => {
    renderLoginPage()
    await waitFor(() => expect(screen.getByLabelText('メールアドレス')).toBeTruthy())
    expect(screen.getByLabelText('パスワード')).toBeTruthy()
  })

  it('メールとパスワードが空のときバリデーションエラーが表示される', async () => {
    renderLoginPage()
    await waitFor(() => expect(screen.getByLabelText('メールアドレス')).toBeTruthy())
    await userEvent.click(screen.getByRole('button', { name: 'ログイン' }))
    expect(screen.getByText('メールアドレスとパスワードを入力してください')).toBeTruthy()
  })

  it('パスワードのみ空のときバリデーションエラーが表示される', async () => {
    renderLoginPage()
    await waitFor(() => expect(screen.getByLabelText('メールアドレス')).toBeTruthy())
    await userEvent.type(screen.getByLabelText('メールアドレス'), 'alice@example.com')
    await userEvent.click(screen.getByRole('button', { name: 'ログイン' }))
    expect(screen.getByText('パスワードを入力してください')).toBeTruthy()
  })

  it('ログイン成功時に/homeへリダイレクトされる', async () => {
    server.use(
      http.get('/api/auth/me', () => new HttpResponse(null, { status: 401 })),
      http.post('/api/auth/login', () => HttpResponse.json(mockUser)),
    )
    renderLoginPage()
    await waitFor(() => expect(screen.getByLabelText('メールアドレス')).toBeTruthy())
    await userEvent.type(screen.getByLabelText('メールアドレス'), 'alice@example.com')
    await userEvent.type(screen.getByLabelText('パスワード'), 'password123')
    await userEvent.click(screen.getByRole('button', { name: 'ログイン' }))
    await waitFor(() => expect(screen.getByText('ホームページ')).toBeTruthy())
  })

  it('401エラー時に認証エラーメッセージが表示される', async () => {
    server.use(
      http.get('/api/auth/me', () => new HttpResponse(null, { status: 401 })),
      http.post('/api/auth/login', () => new HttpResponse(null, { status: 401 })),
    )
    renderLoginPage()
    await waitFor(() => expect(screen.getByLabelText('メールアドレス')).toBeTruthy())
    await userEvent.type(screen.getByLabelText('メールアドレス'), 'alice@example.com')
    await userEvent.type(screen.getByLabelText('パスワード'), 'wrongpass')
    await userEvent.click(screen.getByRole('button', { name: 'ログイン' }))
    await waitFor(() =>
      expect(screen.getByText('メールアドレスまたはパスワードが正しくありません')).toBeTruthy(),
    )
  })

  it('registered=trueのstateがあるとき登録成功トーストが表示される', async () => {
    renderLoginPage({ registered: true, email: 'alice@example.com', password: 'password123' })
    await waitFor(() =>
      expect(screen.getByText('アカウントを登録しました。ログインしてください')).toBeTruthy(),
    )
  })
})
