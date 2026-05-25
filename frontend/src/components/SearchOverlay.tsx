import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { userService } from '../services/user';
import type { UserProfileResponse } from '../types/user';

const DEBOUNCE_MS = 300;

interface SearchOverlayProps {
  open: boolean;
  onClose: () => void;
}

export default function SearchOverlay({ open, onClose }: SearchOverlayProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserProfileResponse[]>([]);
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
      setResults([]);
      setDropdownOpen(false);
      return;
    }
    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await userService.searchUsers(value.trim());
        setResults(res.data);
        setDropdownOpen(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_MS);
  };

  const handleSelect = (userId: number) => {
    onClose();
    navigate(`/profile/${userId}`);
  };

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
            onFocus={() => { if (results.length > 0) setDropdownOpen(true); }}
            placeholder="ユーザーを検索..."
            className="flex-1 bg-transparent text-sm text-[#0f1419] placeholder-[#536471] outline-none"
          />
          {query && (
            <button
              onClick={() => { setQuery(''); setResults([]); setDropdownOpen(false); }}
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
            className="text-[#536471] hover:text-[#0f1419] flex-shrink-0 ml-1"
            aria-label="検索を閉じる"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M10.59 12L4.54 5.96l1.42-1.42L12 10.59l6.04-6.05 1.42 1.42L13.41 12l6.05 6.04-1.42 1.42L12 13.41l-6.04 6.05-1.42-1.42z"/>
            </svg>
          </button>
        </div>

        {dropdownOpen && (
          <div className="mt-2 bg-white rounded-2xl shadow-lg border border-[#eff3f4] overflow-y-auto max-h-[60vh]">
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
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
