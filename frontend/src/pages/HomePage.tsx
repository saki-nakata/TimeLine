import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Timeline from '../components/Timeline';

export default function HomePage() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200">
        <div className="max-w-xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-black text-[#1d9bf0] tracking-tight">TimeLine</h1>
          <button
            onClick={handleLogout}
            className="border border-[#cfd9de] hover:bg-[#f7f9f9] text-[#0f1419] font-semibold rounded-full px-4 py-1.5 text-sm transition"
          >
            ログアウト
          </button>
        </div>
      </header>
      <main className="max-w-xl mx-auto">
        <Timeline />
      </main>
    </div>
  );
}
