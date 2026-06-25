import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { userService } from '../services/user';
import { postService } from '../services/post';
import type { UserProfileResponse } from '../types/user';
import type { PostResponse } from '../types/post';

const DEBOUNCE_MS = 300;

interface SearchOverlayProps {
  open: boolean;
  onClose: () => void;
}

export default function SearchOverlay({ open, onClose }: SearchOverlayProps) {
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<UserProfileResponse[]>([]);
  const [posts, setPosts] = useState<PostResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  const handleChange = (value: string) => {
    setQuery(value);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!value.trim()) {
      setUsers([]);
      setPosts([]);
      setDropdownOpen(false);
      return;
    }
    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const trimmed = value.trim();
        const isHashtag = trimmed.startsWith('#');
        const keyword = isHashtag ? trimmed.slice(1) : trimmed;
        if (!keyword) return;

        const [userRes, postRes] = await Promise.all([
          isHashtag ? Promise.resolve({ data: [] }) : userService.searchUsers(trimmed),
          isHashtag
            ? postService.searchByHashtag(keyword, undefined, 5)
            : postService.searchPosts(trimmed, undefined, 5),
        ]);
        setUsers(userRes.data as UserProfileResponse[]);
        setPosts(postRes.data.posts);
        setDropdownOpen(true);
      } catch {
        setUsers([]);
        setPosts([]);
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_MS);
  };

  const handleSelectUser = (userId: number) => {
    onClose();
    setQuery('');
    navigate(`/profile/${userId}`);
  };

  const handleSelectPost = (postId: number) => {
    onClose();
    setQuery('');
    navigate(`/posts/${postId}`);
  };

  const handleClear = () => {
    setQuery('');
    setUsers([]);
    setPosts([]);
    setDropdownOpen(false);
  };

  const hasResults = users.length > 0 || posts.length > 0;

  if (!open) return null;

  return (
    <div className="sticky top-0 z-30 bg-white border-b border-[#eff3f4]">
      <div className="px-4 py-3">
        <div className="flex items-center gap-2 bg-[#e8f5fe] rounded-full px-4 py-2.5">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#536471" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleChange(e.target.value)}
            onFocus={() => { if (hasResults) setDropdownOpen(true); }}
            placeholder="ユーザー・投稿・#ハッシュタグを検索..."
            data-testid="search-input"
            className="flex-1 bg-transparent text-sm text-[#0f1419] placeholder-[#536471] outline-none"
          />
          {query && (
            <button
              onClick={handleClear}
              className="text-[#536471] hover:text-[#0f1419] flex-shrink-0"
              aria-label="クリア"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          )}
          <button
            onClick={onClose}
            className="text-[#1d9bf0] font-semibold text-sm flex-shrink-0 ml-1 hover:opacity-80"
            aria-label="検索を閉じる"
          >
            キャンセル
          </button>
        </div>

        {dropdownOpen && (
          <div className="mt-2 bg-white rounded-2xl shadow-lg border border-[#eff3f4] overflow-y-auto max-h-[70vh]">
            {loading ? (
              <p className="text-center text-sm text-[#536471] py-4">検索中...</p>
            ) : !hasResults ? (
              <p data-testid="search-no-results" className="text-center text-sm text-[#536471] py-4">見つかりませんでした</p>
            ) : (
              <>
                {users.length > 0 && (
                  <>
                    <p className="px-4 pt-3 pb-1 text-[12px] font-bold text-[#536471] uppercase tracking-wide">ユーザー</p>
                    {users.map(user => {
                      const displayName = user.displayName ?? user.username;
                      return (
                        <div
                          key={user.id}
                          data-testid="search-result-item"
                          className="flex items-center gap-3 px-4 py-3 hover:bg-[#f7f9f9] transition-colors cursor-pointer"
                          onClick={() => handleSelectUser(user.id)}
                        >
                          <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0">
                            {user.avatarUrl ? (
                              <img src={user.avatarUrl} alt={displayName} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-white font-bold text-sm bg-[#1d9bf0]">
                                {displayName.charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-[14px] text-[#0f1419] truncate">{displayName}</p>
                            <p className="text-[13px] text-[#536471] truncate">@{user.username}</p>
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}

                {posts.length > 0 && (
                  <>
                    <p className={`px-4 pb-1 text-[12px] font-bold text-[#536471] uppercase tracking-wide ${users.length > 0 ? 'pt-2 border-t border-[#eff3f4]' : 'pt-3'}`}>投稿</p>
                    {posts.map(post => {
                      const displayName = post.displayName ?? post.username;
                      return (
                        <div
                          key={post.id}
                          className="flex items-start gap-3 px-4 py-3 hover:bg-[#f7f9f9] transition-colors cursor-pointer"
                          onClick={() => handleSelectPost(post.id)}
                        >
                          <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 mt-0.5">
                            {post.avatarUrl ? (
                              <img src={post.avatarUrl} alt={displayName} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-white font-bold text-xs bg-[#1d9bf0]">
                                {displayName.charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-[13px] text-[#0f1419] truncate">{displayName} <span className="font-normal text-[#536471]">@{post.username}</span></p>
                            {post.content && (
                              <p className="text-[13px] text-[#0f1419] line-clamp-2 break-words">{post.content}</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
