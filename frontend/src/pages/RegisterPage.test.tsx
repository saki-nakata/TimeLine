import { describe, it, expect } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { http, HttpResponse } from 'msw'
import { server } from '../test/mswServer'
import RegisterPage from './RegisterPage'
import { AuthProvider } from '../context/AuthContext'

function renderRegisterPage() {
  render(
    <MemoryRouter initialEntries={['/register']}>
      <AuthProvider>
        <Routes>
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/login" element={<div>ログインページ</div>} />
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

describe('RegisterPage', () => {
  it('登録フォームが表示される', () => {
    renderRegisterPage()
    expect(screen.getByLabelText('ユーザー名（@username）')).toBeTruthy()
    expect(screen.getByLabelText('メールアドレス')).toBeTruthy()
    expect(screen.getByLabelText('パスワード（8文字以上）')).toBeTruthy()
  })

  it('空フォーム送信でバリデーションエラーが表示される', async () => {
    renderRegisterPage()
    await userEvent.click(screen.getByText('登録'))
    expect(screen.getByText('すべての項目を入力してください')).toBeTruthy()
  })

  it('パスワードが8文字未満でエラーが表示される', async () => {
    renderRegisterPage()
    await userEvent.type(screen.getByLabelText('ユーザー名（@username）'), 'alice')
    await userEvent.type(screen.getByLabelText('メールアドレス'), 'alice@example.com')
    await userEvent.type(screen.getByLabelText('パスワード（8文字以上）'), 'short')
    await userEvent.type(screen.getByLabelText('パスワード（確認）'), 'short')
    await userEvent.click(screen.getByText('登録'))
    expect(screen.getByText('パスワードは8文字以上で入力してください')).toBeTruthy()
  })

  it('パスワードが一致しないときエラーが表示される', async () => {
    renderRegisterPage()
    await userEvent.type(screen.getByLabelText('ユーザー名（@username）'), 'alice')
    await userEvent.type(screen.getByLabelText('メールアドレス'), 'alice@example.com')
    await userEvent.type(screen.getByLabelText('パスワード（8文字以上）'), 'password123')
    await userEvent.type(screen.getByLabelText('パスワード（確認）'), 'different1')
    await userEvent.click(screen.getByText('登録'))
    expect(screen.getByText('パスワードが一致しません')).toBeTruthy()
  })

  it('登録成功時に/loginへリダイレクトされる', async () => {
    server.use(
      http.get('/api/auth/me', () => new HttpResponse(null, { status: 401 })),
      http.post('/api/auth/register', () => HttpResponse.json(mockUser, { status: 201 })),
      http.post('/api/auth/logout', () => new HttpResponse(null, { status: 204 })),
    )
    renderRegisterPage()
    await userEvent.type(screen.getByLabelText('ユーザー名（@username）'), 'alice')
    await userEvent.type(screen.getByLabelText('メールアドレス'), 'alice@example.com')
    await userEvent.type(screen.getByLabelText('パスワード（8文字以上）'), 'password123')
    await userEvent.type(screen.getByLabelText('パスワード（確認）'), 'password123')
    await userEvent.click(screen.getByText('登録'))
    await waitFor(() => expect(screen.getByText('ログインページ')).toBeTruthy())
  })

  it('ユーザー名重複で409エラーメッセージが表示される', async () => {
    server.use(
      http.get('/api/auth/me', () => new HttpResponse(null, { status: 401 })),
      http.post('/api/auth/register', () => new HttpResponse(null, { status: 409 })),
    )
    renderRegisterPage()
    await userEvent.type(screen.getByLabelText('ユーザー名（@username）'), 'alice')
    await userEvent.type(screen.getByLabelText('メールアドレス'), 'alice@example.com')
    await userEvent.type(screen.getByLabelText('パスワード（8文字以上）'), 'password123')
    await userEvent.type(screen.getByLabelText('パスワード（確認）'), 'password123')
    await userEvent.click(screen.getByText('登録'))
    await waitFor(() =>
      expect(screen.getByText('このユーザー名はすでに使用されています')).toBeTruthy(),
    )
  })
})
