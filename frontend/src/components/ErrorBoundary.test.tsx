import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ErrorBoundary from './ErrorBoundary'

function ThrowError() {
  throw new Error('テストエラー')
}

describe('ErrorBoundary', () => {
  it('子コンポーネントが正常なときはそのまま表示される', () => {
    render(
      <ErrorBoundary>
        <div>正常なコンテンツ</div>
      </ErrorBoundary>,
    )
    expect(screen.getByText('正常なコンテンツ')).toBeInTheDocument()
  })

  it('子コンポーネントがエラーを投げるとデフォルトフォールバックUIが表示される', () => {
    const consoleError = console.error
    console.error = () => {}

    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>,
    )

    expect(screen.getByText('予期しないエラーが発生しました')).toBeInTheDocument()
    expect(screen.getByText('再試行する')).toBeInTheDocument()

    console.error = consoleError
  })

  it('fallback propsを指定するとカスタムフォールバックが表示される', () => {
    const consoleError = console.error
    console.error = () => {}

    render(
      <ErrorBoundary fallback={<div>カスタムエラー画面</div>}>
        <ThrowError />
      </ErrorBoundary>,
    )

    expect(screen.getByText('カスタムエラー画面')).toBeInTheDocument()

    console.error = consoleError
  })

  it('再試行するボタンを押すとエラー状態がリセットされる', async () => {
    const consoleError = console.error
    console.error = () => {}

    let shouldThrow = true

    function MaybeThrow() {
      if (shouldThrow) throw new Error('エラー')
      return <div>回復しました</div>
    }

    const { rerender } = render(
      <ErrorBoundary>
        <MaybeThrow />
      </ErrorBoundary>,
    )

    expect(screen.getByText('再試行する')).toBeInTheDocument()

    shouldThrow = false
    await userEvent.click(screen.getByText('再試行する'))

    rerender(
      <ErrorBoundary>
        <MaybeThrow />
      </ErrorBoundary>,
    )

    expect(screen.getByText('回復しました')).toBeInTheDocument()

    console.error = consoleError
  })
})
