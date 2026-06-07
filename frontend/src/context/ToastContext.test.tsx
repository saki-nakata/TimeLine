import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ToastProvider, useToast } from './ToastContext'

function TestConsumer() {
  const { showToast } = useToast()
  return (
    <div>
      <button onClick={() => showToast('エラーが発生しました', 'error')}>showError</button>
      <button onClick={() => showToast('成功しました', 'success')}>showSuccess</button>
    </div>
  )
}

describe('ToastContext', () => {
  it('ToastProvider外でuseToastを使うとエラーが投げられる', () => {
    const consoleError = console.error
    console.error = () => {}
    expect(() => render(<TestConsumer />)).toThrow('useToast must be used within ToastProvider')
    console.error = consoleError
  })

  it('showToast(error)でエラートーストが表示される', async () => {
    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>,
    )

    await act(async () => {
      await userEvent.click(screen.getByText('showError'))
    })

    expect(screen.getByText('エラーが発生しました')).toBeInTheDocument()
  })

  it('showToast(success)で成功トーストが表示される', async () => {
    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>,
    )

    await act(async () => {
      await userEvent.click(screen.getByText('showSuccess'))
    })

    expect(screen.getByText('成功しました')).toBeInTheDocument()
  })

  it('3秒後にトーストが自動消去される', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })

    const { getByText, queryByText } = render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>,
    )

    act(() => {
      getByText('showError').click()
    })

    expect(getByText('エラーが発生しました')).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(3000)
    })

    expect(queryByText('エラーが発生しました')).not.toBeInTheDocument()

    vi.useRealTimers()
  })

  it('api-errorイベントでトーストが表示される', async () => {
    render(
      <ToastProvider>
        <div />
      </ToastProvider>,
    )

    act(() => {
      window.dispatchEvent(
        new CustomEvent('api-error', { detail: { message: 'サーバーエラー' } }),
      )
    })

    await waitFor(() => {
      expect(screen.getByText('サーバーエラー')).toBeInTheDocument()
    })
  })
})
