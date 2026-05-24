import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { userService } from '../services/user';
import type { UserProfileResponse } from '../types/user';

const DEBOUNCE_MS = 300;

export default function SearchBar() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserProfileResponse[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleChange = (value: string) => {
    setQuery(value);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!value.trim()) {
      setResults([]);
      setOpen(false);
      return;
    }
    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await userService.searchUsers(value.trim());
        setResults(res.data);
        setOpen(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_MS);
  };

  const handleSelect = (userId: number) => {
    setOpen(false);
    setQuery('');
    navigate(`/profile/${userId}`);
  };

  return (
    <div ref={containerRef} className="relative mt-3 mb-3">
      <div className="flex items-center gap-2 bg-[#e8f5fe] rounded-full px-3 py-3">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#536471" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
          <circle cx="11" cy="11" r="8"/>
          <line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => { if (results.length > 0) setOpen(true); }}
          placeholder="ユーザーを検索..."
          className="bg-transparent text-sm text-[#0f1419] placeholder-[#536471] outline-none w-full"
        />
        {query && (
          <button
            onClick={() => { setQuery(''); setResults([]); setOpen(false); }}
            className="text-[#536471] hover:text-[#0f1419] flex-shrink-0"
            aria-label="クリア"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        )}
      </div>

      {open && (
        <div className="absolute top-full mt-1 left-0 right-0 bg-white rounded-2xl shadow-lg border border-[#eff3f4] z-50 overflow-y-auto max-h-80">
          {loading ? (
            <p className="text-center text-sm text-[#536471] py-4">検索中...</p>
          ) : results.length === 0 ? (
            <p className="text-center text-sm text-[#536471] py-4">見つかりませんでした</p>
          ) : (
            results.map(user => {
              const displayName = user.displayName ?? user.username;
              return (
                <div
                  key={user.id}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-[#f7f9f9] transition-colors cursor-pointer border-b border-[#eff3f4] last:border-b-0"
                  onClick={() => handleSelect(user.id)}
                >
                  {/* アバター */}
                  <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0">
                    {user.avatarUrl ? (
                      <img src={user.avatarUrl} alt={displayName} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white font-bold text-sm bg-[#1d9bf0]">
                        {displayName.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>

                  {/* 名前 */}
                  <div className="min-w-0">
                    <p className="font-bold text-[14px] text-[#0f1419] truncate">{displayName}</p>
                    <p className="text-[13px] text-[#536471] truncate">@{user.username}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
