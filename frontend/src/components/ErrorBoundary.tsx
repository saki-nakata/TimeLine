import { Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';

type Props = {
  children: ReactNode;
  fallback?: ReactNode;
};

type State = {
  hasError: boolean;
};

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="min-h-screen flex items-center justify-center bg-white">
            <div className="text-center">
              <p className="text-[#f4212e] text-lg font-semibold mb-2">予期しないエラーが発生しました</p>
              <button
                className="text-[#1d9bf0] text-sm hover:underline"
                onClick={() => this.setState({ hasError: false })}
              >
                再試行する
              </button>
            </div>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
