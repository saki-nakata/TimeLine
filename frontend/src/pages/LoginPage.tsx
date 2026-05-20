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

  const handleSubmit = async (e: SubmitEvent) => {
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
    <div className="min-h-screen flex items-center justify-center bg-[#f7f9f9] px-4">
      {toast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-[#00ba7c] text-white text-sm font-medium px-4 py-3 rounded-lg shadow-lg">
          <span>✓</span>
          <span>アカウントを登録しました。ログインしてください</span>
        </div>
      )}

      <div className="w-full max-w-[440px] bg-white rounded-xl shadow-md" style={{ padding: '40px 36px' }}>

        <div className="text-[32px] font-black text-[#1d9bf0] text-center mb-2 tracking-tight leading-none">
          TimeLine
        </div>
        <div className="text-[22px] font-bold text-[#0f1419] text-center mb-7">ログイン</div>

        <form onSubmit={handleSubmit} noValidate>
          {error && (
            <div className="mb-4 text-sm text-[#f4212e] bg-[#fde8ea] rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-1.5 mb-5">
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
              className="w-full border border-[#cfd9de] rounded-lg text-sm text-[#0f1419] outline-none focus:border-[#1d9bf0] focus:shadow-[0_0_0_3px_rgba(29,155,240,0.15)] transition"
              style={{ padding: '10px 14px' }}
            />
          </div>

          <div className="flex flex-col gap-1.5 mb-8">
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
              className="w-full border border-[#cfd9de] rounded-lg text-sm text-[#0f1419] outline-none focus:border-[#1d9bf0] focus:shadow-[0_0_0_3px_rgba(29,155,240,0.15)] transition"
              style={{ padding: '10px 14px' }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
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
  );
}
