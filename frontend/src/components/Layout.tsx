import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import PostForm from './PostForm';
import SearchBar from './SearchBar';
import type { PostResponse } from '../types/post';

interface LayoutProps {
  children: React.ReactNode;
  onPostClick?: () => void;
  onPostCreated?: (post: PostResponse) => void;
  fullHeight?: boolean;
}

const IconHome = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
  </svg>
);

const IconFollowing = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
  </svg>
);

export default function Layout({ children, onPostClick, onPostCreated, fullHeight }: LayoutProps) {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [ownPostFormOpen, setOwnPostFormOpen] = useState(false);

  const isHome = location.pathname === '/home';
  const isFollowing = location.pathname === '/following';
  const isOwnProfile = currentUser != null && location.pathname === `/profile/${currentUser.id}`;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handlePostClick = () => {
    if (onPostClick) {
      onPostClick();
    } else {
      setOwnPostFormOpen(true);
    }
  };

  const handleOwnPostCreated = (post: PostResponse) => {
    setOwnPostFormOpen(false);
    onPostCreated?.(post);
  };

  return (
    <div className={fullHeight ? 'h-screen bg-white overflow-hidden' : 'min-h-screen bg-white'}>
      <div className={`max-w-[960px] ml-[12%] mr-auto flex${fullHeight ? ' h-full' : ''}`}>
        {/* 左サイドバー */}
        <aside className={`w-64 shrink-0 flex flex-col px-4 py-4 mr-4${fullHeight ? ' h-full' : ' sticky top-0 h-screen'}`}>
          <button
            onClick={() => navigate('/home')}
            className="text-[22px] font-black text-[#1d9bf0] tracking-tight px-3 mb-4 text-left hover:opacity-80 transition-opacity"
          >
            TimeLine
          </button>

          <nav className="flex flex-col gap-1">
            <button
              onClick={() => navigate('/home')}
              className={`flex items-center gap-4 px-3 py-3 rounded-full font-bold text-[17px] text-[#0f1419] transition-colors${
                isHome ? ' bg-gray-200' : ' hover:bg-gray-100'
              }`}
            >
              <IconHome />
              <span>ホーム</span>
            </button>
            <button
              onClick={() => navigate('/following')}
              className={`flex items-center gap-4 px-3 py-3 rounded-full font-bold text-[17px] text-[#0f1419] transition-colors${
                isFollowing ? ' bg-gray-200' : ' hover:bg-gray-100'
              }`}
            >
              <IconFollowing />
              <span>フォロー中</span>
            </button>
          </nav>

          <SearchBar />

          <button
            onClick={handlePostClick}
            className="mt-2 rounded-full bg-[#1d9bf0] hover:bg-[#1a8cd8] text-white font-bold py-3 text-[15px] transition"
          >
            投稿する
          </button>

          <div className="mt-auto flex flex-col gap-1">
            {currentUser && (
              <button
                onClick={() => navigate(`/profile/${currentUser.id}`)}
                className={`flex items-center gap-3 px-3 py-3 rounded-full transition w-full text-left${
                  isOwnProfile ? ' bg-gray-200' : ' hover:bg-[#f7f9f9]'
                }`}
              >
                <div className="w-10 h-10 rounded-full overflow-hidden bg-[#1d9bf0] flex-shrink-0">
                  {currentUser.avatarUrl ? (
                    <img src={currentUser.avatarUrl} alt={currentUser.username} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white font-bold text-base">
                      {(currentUser.displayName ?? currentUser.username).charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-[15px] text-[#0f1419] truncate">
                    {currentUser.displayName ?? currentUser.username}
                  </p>
                  <p className="text-[13px] text-[#536471] truncate">@{currentUser.username}</p>
                </div>
              </button>
            )}
            <button
              onClick={handleLogout}
              className="w-full text-left px-3 py-3 rounded-full text-[15px] font-semibold text-[#536471] hover:bg-[#f7f9f9] transition"
            >
              ログアウト
            </button>
          </div>
        </aside>

        {/* メインコンテンツ */}
        <main className={`flex-1 min-w-0${fullHeight ? ' h-full overflow-hidden' : ''}`}>
          {children}
        </main>
      </div>

      {/* Layout 管轄の PostForm（HomePage 以外のページ用） */}
      {!onPostClick && (
        <PostForm
          open={ownPostFormOpen}
          onClose={() => setOwnPostFormOpen(false)}
          onPostCreated={handleOwnPostCreated}
        />
      )}
    </div>
  );
}
