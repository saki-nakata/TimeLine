import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import PostForm from './PostForm';
import SearchOverlay from './SearchOverlay';
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

const IconPencil = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
  </svg>
);

const IconSearch = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/>
    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);

export default function Layout({ children, onPostClick, onPostCreated, fullHeight }: LayoutProps) {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [ownPostFormOpen, setOwnPostFormOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  // ページ遷移で検索バーを閉じる
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSearchOpen(false);
  }, [location.pathname]);

  // ドロップダウン外クリックで閉じる
  useEffect(() => {
    if (!dropdownOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [dropdownOpen]);

  return (
    <div className={fullHeight ? 'h-screen bg-white overflow-hidden' : 'min-h-screen bg-white'}>
      <div className={`max-w-[1280px] mx-auto flex${fullHeight ? ' h-full' : ''}`}>

        {/* 左サイドバー（md 以上で表示） */}
        <aside className={`hidden md:flex md:w-16 lg:w-64 shrink-0 flex-col md:px-2 lg:px-4 py-4 md:mr-2 lg:mr-4${fullHeight ? ' h-full' : ' sticky top-0 h-screen'}`}>

          {/* ロゴ：デスクトップはテキスト、タブレットは "T" */}
          <button
            onClick={() => navigate('/home')}
            className="hidden lg:block text-[22px] font-black text-[#1d9bf0] tracking-tight px-3 mb-4 text-left hover:opacity-80 transition-opacity"
          >
            TimeLine
          </button>
          <button
            onClick={() => navigate('/home')}
            className="md:flex lg:hidden items-center justify-center w-10 h-10 mb-4 mx-auto rounded-full hover:bg-[#e8f5fe] transition-colors"
            aria-label="TimeLine ホーム"
          >
            <span className="text-[20px] font-black text-[#1d9bf0]">T</span>
          </button>

          {/* ナビゲーション */}
          <nav className="flex flex-col gap-1">
            <button
              onClick={() => navigate('/home')}
              className={`flex items-center md:justify-center lg:justify-start gap-4 md:px-0 lg:px-3 py-3 rounded-full font-bold text-[17px] text-[#0f1419] transition-colors${
                isHome ? ' bg-gray-200' : ' hover:bg-gray-100'
              }`}
              aria-label="ホーム"
            >
              <IconHome />
              <span className="hidden lg:inline">ホーム</span>
            </button>
            <button
              onClick={() => navigate('/following')}
              className={`flex items-center md:justify-center lg:justify-start gap-4 md:px-0 lg:px-3 py-3 rounded-full font-bold text-[17px] text-[#0f1419] transition-colors${
                isFollowing ? ' bg-gray-200' : ' hover:bg-gray-100'
              }`}
              aria-label="フォロー中"
            >
              <IconFollowing />
              <span className="hidden lg:inline">フォロー中</span>
            </button>
            <button
              onClick={() => setSearchOpen(prev => !prev)}
              className="flex items-center md:justify-center lg:justify-start gap-4 md:px-0 lg:px-3 py-3 rounded-full font-bold text-[17px] text-[#0f1419] transition-colors hover:bg-gray-100"
              aria-label="検索"
            >
              <IconSearch />
              <span className="hidden lg:inline">検索</span>
            </button>
          </nav>

          {/* 投稿ボタン：デスクトップはテキスト、タブレットはアイコン */}
          <button
            onClick={handlePostClick}
            className="mt-2 hidden lg:block rounded-full bg-[#1d9bf0] hover:bg-[#1a8cd8] text-white font-bold py-3 text-[15px] transition"
          >
            投稿する
          </button>
          <button
            onClick={handlePostClick}
            className="mt-2 md:flex lg:hidden items-center justify-center w-12 h-12 mx-auto rounded-full bg-[#1d9bf0] hover:bg-[#1a8cd8] text-white transition shadow-sm"
            aria-label="投稿する"
          >
            <IconPencil />
          </button>

          {/* フッター：アバター + ユーザー情報 */}
          <div className="mt-auto flex flex-col gap-1 relative" ref={dropdownRef}>
            {currentUser && (
              <>
                <button
                  onClick={() => {
                    // デスクトップ（lg 以上）はプロフィールへ遷移、タブレットはドロップダウン
                    const isDesktop = window.innerWidth >= 1024;
                    if (isDesktop) {
                      navigate(`/profile/${currentUser.id}`);
                    } else {
                      setDropdownOpen(prev => !prev);
                    }
                  }}
                  className={`flex items-center md:justify-center lg:justify-start gap-3 md:px-0 lg:px-3 py-3 rounded-full transition w-full text-left${
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
                  <div className="hidden lg:block flex-1 min-w-0">
                    <p className="font-bold text-[15px] text-[#0f1419] truncate">
                      {currentUser.displayName ?? currentUser.username}
                    </p>
                    <p className="text-[13px] text-[#536471] truncate">@{currentUser.username}</p>
                  </div>
                </button>

                {/* タブレット用ドロップダウン */}
                {dropdownOpen && (
                  <div className="absolute bottom-14 left-0 bg-white rounded-2xl shadow-xl border border-[#eff3f4] w-48 py-2 z-50 lg:hidden">
                    <button
                      onClick={() => { navigate(`/profile/${currentUser.id}`); setDropdownOpen(false); }}
                      className="w-full px-4 py-3 text-left text-[14px] text-[#0f1419] hover:bg-gray-50 transition-colors"
                    >
                      プロフィール
                    </button>
                    <button
                      onClick={() => { handleLogout(); setDropdownOpen(false); }}
                      className="w-full px-4 py-3 text-left text-[14px] text-[#f4212e] hover:bg-gray-50 transition-colors"
                    >
                      ログアウト
                    </button>
                  </div>
                )}
              </>
            )}

            {/* ログアウト：デスクトップのみ */}
            <button
              onClick={handleLogout}
              className="hidden lg:block w-full text-left px-3 py-3 rounded-full text-[15px] font-semibold text-[#536471] hover:bg-[#f7f9f9] transition"
            >
              ログアウト
            </button>
          </div>
        </aside>

        {/* メインコンテンツ */}
        <main className={`flex-1 min-w-0${fullHeight ? ' h-full overflow-hidden' : ' pb-14 md:pb-0'}`}>
          {/* モバイル用ロゴヘッダー（検索未表示時のみ） */}
          {!searchOpen && (
            <div className="sticky top-0 z-30 bg-white border-b border-[#eff3f4] flex items-center justify-center h-12 md:hidden">
              <span className="text-[20px] font-black text-[#1d9bf0] tracking-tight">TimeLine</span>
            </div>
          )}
          <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
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

      {/* ボトムナビゲーション（モバイルのみ） */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-[#eff3f4] flex items-center h-14 md:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <button
          onClick={() => navigate('/home')}
          className={`flex-1 h-full flex items-center justify-center transition-colors ${isHome ? 'text-[#1d9bf0]' : 'text-[#536471]'}`}
          aria-label="ホーム"
        >
          <IconHome />
        </button>

        <button
          onClick={() => navigate('/following')}
          className={`flex-1 h-full flex items-center justify-center transition-colors ${isFollowing ? 'text-[#1d9bf0]' : 'text-[#536471]'}`}
          aria-label="フォロー中"
        >
          <IconFollowing />
        </button>

        <button
          onClick={() => setSearchOpen(prev => !prev)}
          className="flex-1 h-full flex items-center justify-center transition-colors text-[#536471]"
          aria-label="検索"
        >
          <IconSearch />
        </button>

        <div className="flex-1 h-full flex items-center justify-center">
          <button
            onClick={handlePostClick}
            className="w-11 h-11 rounded-full bg-[#1d9bf0] hover:bg-[#1a8cd8] text-white flex items-center justify-center transition shadow-md"
            aria-label="投稿する"
          >
            <IconPencil />
          </button>
        </div>

        {currentUser && (
          <button
            onClick={() => setMobileMenuOpen(true)}
            className={`flex-1 h-full flex items-center justify-center pl-3 transition-colors ${isOwnProfile ? 'text-[#1d9bf0]' : 'text-[#536471]'}`}
            aria-label="プロフィールメニュー"
          >
            <div className={`w-9 h-9 rounded-full overflow-hidden ring-2 transition-colors ${isOwnProfile ? 'ring-[#1d9bf0]' : 'ring-transparent'}`}>
              {currentUser.avatarUrl ? (
                <img src={currentUser.avatarUrl} alt={currentUser.username} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white text-xs font-bold bg-[#1d9bf0]">
                  {(currentUser.displayName ?? currentUser.username).charAt(0).toUpperCase()}
                </div>
              )}
            </div>
          </button>
        )}
      </nav>

      {/* モバイル用プロフィールメニュー ポップアップ */}
      {mobileMenuOpen && currentUser && (
        <div
          className="fixed inset-0 z-50 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            className="absolute right-2 bg-white rounded-2xl shadow-xl border border-[#eff3f4] overflow-hidden w-40"
            style={{ bottom: 'calc(3.5rem + env(safe-area-inset-bottom) + 8px)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => { setMobileMenuOpen(false); navigate(`/profile/${currentUser.id}`); }}
              className="w-full flex items-center px-4 py-3 text-[15px] font-semibold text-[#0f1419] hover:bg-[#f7f9f9] transition-colors border-b border-[#eff3f4]"
            >
              プロフィール
            </button>
            <button
              onClick={async () => { setMobileMenuOpen(false); await handleLogout(); }}
              className="w-full flex items-center px-4 py-3 text-[15px] font-semibold text-[#f4212e] hover:bg-red-50 transition-colors"
            >
              ログアウト
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
