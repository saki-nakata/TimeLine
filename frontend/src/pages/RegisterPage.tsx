import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authService } from '../services/auth';
import { useAuth } from '../context/AuthContext';
import type { AxiosError } from 'axios';

const USERNAME_PATTERN = /^[a-zA-Z0-9_]{1,50}$/;

const inputClass =
  'w-full border border-[#cfd9de] rounded-lg text-sm text-[#0f1419] outline-none focus:border-[#1d9bf0] focus:shadow-[0_0_0_3px_rgba(29,155,240,0.15)] transition';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const validate = (): string => {
    if (!username || !email || !password || !confirm) return 'すべての項目を入力してください';
    if (!USERNAME_PATTERN.test(username)) return 'ユーザー名は半角英数字・アンダースコアのみ、50文字以内で入力してください';
    if (password.length < 8) return 'パスワードは8文字以上で入力してください';
    if (password !== confirm) return 'パスワードが一致しません';
    return '';
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError('');
    setLoading(true);
    try {
      await authService.register({ username, email, password });
      await logout();
      navigate('/login', { state: { registered: true, email, password } });
    } catch (err) {
      const status = (err as AxiosError).response?.status;
      const message = (err as AxiosError<{ message?: string }>).response?.data?.message ?? '';
      if (status === 409) {
        if (message.includes('メールアドレス')) {
          setError('このメールアドレスはすでに使用されています');
        } else {
          setError('このユーザー名はすでに使用されています');
        }
      } else {
        setError('登録に失敗しました。しばらく経ってから再試行してください');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f7f9f9] px-4">
      <div className="w-full max-w-[430px] bg-white rounded-xl shadow-md" style={{ padding: '40px 36px' }}>

        <div className="text-[32px] font-black text-[#1d9bf0] text-center mb-2 tracking-tight leading-none">
          TimeLine
        </div>
        <div className="text-[22px] font-bold text-[#0f1419] text-center mb-7">新規登録</div>

        <form onSubmit={handleSubmit} noValidate>
          {error && (
            <div data-testid="register-error" className="mb-4 text-sm text-[#f4212e] bg-[#fde8ea] rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-1.5 mb-5">
            <label className="text-[13px] font-semibold text-[#536471]" htmlFor="username">
              ユーザー名（@username）
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="半角英数字・アンダースコア"
              autoComplete="username"
              maxLength={50}
              data-testid="username-input"
              className={inputClass}
              style={{ padding: '10px 14px' }}
            />
          </div>

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
              data-testid="register-email-input"
              className={inputClass}
              style={{ padding: '10px 14px' }}
            />
          </div>

          <div className="flex flex-col gap-1.5 mb-5">
            <label className="text-[13px] font-semibold text-[#536471]" htmlFor="password">
              パスワード（8文字以上）
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="パスワード"
              autoComplete="new-password"
              data-testid="register-password-input"
              className={inputClass}
              style={{ padding: '10px 14px' }}
            />
          </div>

          <div className="flex flex-col gap-1.5 mb-8">
            <label className="text-[13px] font-semibold text-[#536471]" htmlFor="confirm">
              パスワード（確認）
            </label>
            <input
              id="confirm"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="もう一度入力"
              autoComplete="new-password"
              data-testid="register-confirm-input"
              className={inputClass}
              style={{ padding: '10px 14px' }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            data-testid="register-submit"
            className="w-full bg-[#1d9bf0] hover:bg-[#1a8cd8] disabled:opacity-50 text-white font-bold rounded-full text-[15px] transition"
            style={{ padding: '10px 20px' }}
          >
            {loading ? '登録中...' : '登録'}
          </button>
        </form>

        <div className="mt-5 text-[14px] text-[#536471] text-center">
          すでにアカウントをお持ちの方は{' '}
          <Link to="/login" className="text-[#1d9bf0] font-semibold hover:underline">
            ログイン
          </Link>
        </div>
      </div>
    </div>
  );
}
