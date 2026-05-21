import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Timeline from '../components/Timeline';

const IconHome = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
  </svg>
);

export default function HomePage() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [postFormOpen, setPostFormOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-[960px] ml-[12%] mr-auto flex">
        {/* 左サイドバー */}
        <aside className="w-64 shrink-0 sticky top-0 h-screen flex flex-col px-4 py-4 mr-4">
          <div className="text-[22px] font-black text-[#1d9bf0] tracking-tight px-3 mb-4">
            TimeLine
          </div>

          <nav className="flex flex-col gap-1">
            <div className="flex items-center gap-4 px-3 py-3 rounded-full font-bold text-[#0f1419] bg-gray-100 text-[17px]">
              <IconHome />
              <span>ホーム</span>
            </div>
          </nav>

          <button
            onClick={() => setPostFormOpen(true)}
            className="mt-5 rounded-full bg-[#1d9bf0] hover:bg-[#1a8cd8] text-white font-bold py-3 text-[15px] transition"
          >
            投稿する
          </button>

          <div className="mt-auto">
            <button
              onClick={handleLogout}
              className="w-full text-left px-3 py-3 rounded-full text-[15px] font-semibold text-[#536471] hover:bg-[#f7f9f9] transition"
            >
              ログアウト
            </button>
          </div>
        </aside>

        {/* メインフィード */}
        <main className="flex-1 pt-3 pl-4">
          <Timeline postFormOpen={postFormOpen} setPostFormOpen={setPostFormOpen} />
        </main>
      </div>
    </div>
  );
}
