import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { authService } from '../services/auth';
import { useAuth } from '../context/AuthContext';
import type { AxiosError } from 'axios';

type LocationState = { registered?: boolean; email?: string; password?: string } | null;

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setCurrentUser } = useAuth();

  const state = location.state as LocationState;
  const [email, setEmail] = useState(state?.email ?? '');
  const [password, setPassword] = useState(state?.password ?? '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(() => state?.registered === true);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(false), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    if (!email && !password) {
      setError('メールアドレスとパスワードを入力してください');
      return;
    }
    if (!email) {
      setError('メールアドレスを入力してください');
      return;
    }
    if (!password) {
      setError('パスワードを入力してください');
      return;
    }

    setLoading(true);
    try {
      const res = await authService.login({ email, password });
      setCurrentUser(res.data);
      navigate('/home');
    } catch (err) {
      const status = (err as AxiosError).response?.status;
      if (status === 401) {
        setError('メールアドレスまたはパスワードが正しくありません');
      } else {
        setError('ログインに失敗しました。しばらく経ってから再試行してください');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {toast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-[#00ba7c] text-white text-sm font-medium px-4 py-3 rounded-lg shadow-lg">
          <span>✓</span>
          <span>アカウントを登録しました。ログインしてください</span>
        </div>
      )}

      {/* 左パネル：ブランドエリア */}
      <div className="hidden md:flex w-1/3 shrink-0 bg-[#1d9bf0] flex-col items-center justify-center gap-6 px-12">
        <div className="text-white text-[72px] font-black tracking-tight leading-none">
          TimeLine
        </div>
        <p className="text-white/80 text-xl font-medium">つながる、シェアする、今を刻む</p>
      </div>

      {/* 右パネル：フォームエリア */}
      <div className="flex flex-col items-center justify-center flex-1 px-4 sm:px-10 bg-white">
        <div className="w-full max-w-[400px]">
          <div className="text-[28px] font-bold text-[#0f1419] mb-10">ログイン</div>

          <form onSubmit={handleSubmit} noValidate>
            {error && (
              <div data-testid="login-error" className="mb-4 text-sm text-[#f4212e] bg-[#fde8ea] rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <div className="flex flex-col gap-2 mb-7">
              <label className="text-[13px] font-semibold text-[#536471]" htmlFor="email">
                メールアドレス
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                data-testid="email-input"
                className="w-full border border-[#cfd9de] rounded-lg text-sm text-[#0f1419] outline-none focus:border-[#1d9bf0] focus:shadow-[0_0_0_3px_rgba(29,155,240,0.15)] transition"
                style={{ padding: '13px 16px' }}
              />
            </div>

            <div className="flex flex-col gap-2 mb-10">
              <label className="text-[13px] font-semibold text-[#536471]" htmlFor="password">
                パスワード
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="パスワード"
                autoComplete="current-password"
                data-testid="password-input"
                className="w-full border border-[#cfd9de] rounded-lg text-sm text-[#0f1419] outline-none focus:border-[#1d9bf0] focus:shadow-[0_0_0_3px_rgba(29,155,240,0.15)] transition"
                style={{ padding: '13px 16px' }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              data-testid="login-submit"
              className="w-full bg-[#1d9bf0] hover:bg-[#1a8cd8] disabled:opacity-50 text-white font-bold rounded-full text-[15px] transition"
              style={{ padding: '10px 20px' }}
            >
              {loading ? 'ログイン中...' : 'ログイン'}
            </button>
          </form>

          <div className="mt-5 text-[14px] text-[#536471] text-center">
            アカウントをお持ちでない方は{' '}
            <Link to="/register" className="text-[#1d9bf0] font-semibold hover:underline">
              新規登録
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
