import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function HomePage() {
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4">
      <div className="w-full max-w-[400px] bg-white rounded-xl shadow-md p-8 text-center">
        <div className="text-3xl font-black text-[#1d9bf0] mb-6 tracking-tight">TimeLine</div>

        <div className="text-4xl mb-4">✅</div>
        <div className="text-lg font-semibold text-[#0f1419] mb-2">ログイン成功</div>
        <div className="text-sm text-[#536471] mb-8">
          <span className="font-medium text-[#0f1419]">@{currentUser?.username}</span>{' '}
          としてログイン中です
        </div>

        <button
          onClick={handleLogout}
          className="w-full border border-[#cfd9de] hover:bg-[#f7f9f9] text-[#0f1419] font-semibold rounded-full py-2 text-sm transition"
        >
          ログアウト
        </button>
      </div>
    </div>
  );
}
