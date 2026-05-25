import { useEffect, useState } from 'react';
import { postService } from '../services/post';
import type { PostResponse } from '../types/post';
import type { UserResponse } from '../types/user';
import Avatar from './Avatar';

interface CommentModalProps {
  open: boolean;
  post: PostResponse;
  currentUser: UserResponse | null;
  onClose: () => void;
  onCommentCreated: (postId: number, newCount: number) => void;
}

const MAX_CHARS = 280;

function CircleProgress({ remaining, max }: { remaining: number; max: number }) {
  const r = 10;
  const circ = 2 * Math.PI * r;
  const used = max - remaining;
  const ratio = Math.min(used / max, 1);
  const dash = circ * ratio;
  const isOver = remaining < 0;
  const isWarn = remaining <= 20 && !isOver;
  const stroke = isOver ? '#f4212e' : isWarn ? '#ffd400' : '#1d9bf0';

  if (remaining > 20) return null;

  return (
    <svg width="26" height="26" viewBox="0 0 26 26" className="flex-shrink-0">
      <circle cx="13" cy="13" r={r} fill="none" stroke="#e7e7e7" strokeWidth="2.5" />
      <circle
        cx="13" cy="13" r={r} fill="none"
        stroke={stroke} strokeWidth="2.5"
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        transform="rotate(-90 13 13)"
      />
      {isOver && (
        <text x="13" y="17" textAnchor="middle" fontSize="9" fill="#f4212e" fontWeight="bold">
          {remaining}
        </text>
      )}
    </svg>
  );
}

export default function CommentModal({
  open,
  post,
  currentUser,
  onClose,
  onCommentCreated,
}: CommentModalProps) {
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const remaining = MAX_CHARS - content.length;
  const isOverLimit = remaining < 0;
  const canSubmit = content.trim().length > 0 && !isOverLimit && !submitting;

  const postAuthorName = post.displayName ?? post.username;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      await postService.createComment(post.id, content.trim());
      setContent('');
      onCommentCreated(post.id, post.commentCount + 1);
      onClose();
    } catch {
      setSubmitError('コメントの投稿に失敗しました');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-[600px] mx-4 flex flex-col shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="返信"
      >
        {/* ヘッダー */}
        <div className="flex items-center justify-end px-4 pt-3 pb-2">
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 text-[#0f1419] transition-colors"
            aria-label="閉じる"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M10.59 12L4.54 5.96l1.42-1.42L12 10.59l6.04-6.05 1.42 1.42L13.41 12l6.05 6.04-1.42 1.42L12 13.41l-6.04 6.05-1.42-1.42z"/>
            </svg>
          </button>
        </div>

        {/* 元投稿プレビュー */}
        <div className="px-4 pb-2">
          <div className="flex gap-3">
            <div className="flex flex-col items-center">
              <Avatar name={postAuthorName} avatarUrl={post.avatarUrl} size={10} />
              <div className="w-0.5 flex-1 mt-1 bg-[#cfd9de] min-h-[24px]" />
            </div>
            <div className="flex-1 min-w-0 pb-3">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="font-bold text-[15px] text-[#0f1419] truncate">{postAuthorName}</span>
                <span className="text-[14px] text-[#536471] truncate">@{post.username}</span>
              </div>
              <p className="text-[15px] text-[#0f1419] leading-relaxed whitespace-pre-wrap break-words">
                {post.content}
              </p>
              <p className="text-[14px] text-[#536471] mt-1">
                <span className="text-[#1d9bf0]">@{post.username}</span> への返信
              </p>
            </div>
          </div>
        </div>

        {/* 入力エリア */}
        {currentUser && (
          <div className="border-t border-[#eff3f4] px-4 pt-3 pb-4">
            <form onSubmit={handleSubmit}>
              <div className="flex gap-3">
                <Avatar
                  name={currentUser.displayName ?? currentUser.username}
                  avatarUrl={currentUser.avatarUrl}
                  size={9}
                />
                <div className="flex-1 min-w-0">
                  <div className={`rounded-xl border px-3 py-2 transition-colors ${
                    isOverLimit ? 'border-[#f4212e]' : 'border-[#cfd9de] focus-within:border-[#1d9bf0]'
                  }`}>
                    <textarea
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      rows={4}
                      placeholder="返信をポスト"
                      className="w-full resize-none text-[16px] text-[#0f1419] outline-none placeholder-[#536471] bg-transparent leading-relaxed"
                      autoFocus
                    />
                  </div>
                  {submitError && (
                    <p className="text-[#f4212e] text-xs mt-1">{submitError}</p>
                  )}
                </div>
              </div>

              {/* アクションバー */}
              <div className="flex items-center justify-between mt-2 pl-12">
                <button
                  type="button"
                  className="w-9 h-9 flex items-center justify-center rounded-full text-[#1d9bf0] hover:bg-[#e8f5fd] transition-colors"
                  aria-label="絵文字"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
                    <line x1="9" y1="9" x2="9.01" y2="9"/>
                    <line x1="15" y1="9" x2="15.01" y2="9"/>
                  </svg>
                </button>

                <div className="flex items-center gap-3">
                  <span
                    className={`text-sm tabular-nums ${
                      isOverLimit ? 'text-[#f4212e] font-medium' : 'text-[#536471]'
                    }`}
                  >
                    {isOverLimit ? `${remaining}文字` : `残り${remaining}文字`}
                  </span>
                  <CircleProgress remaining={remaining} max={MAX_CHARS} />
                  <button
                    type="submit"
                    disabled={!canSubmit}
                    className="rounded-full bg-[#1d9bf0] px-5 py-2 text-[15px] font-bold text-white
                      disabled:opacity-40 disabled:cursor-not-allowed
                      hover:bg-[#1a8cd8] active:bg-[#1877b5] transition-colors"
                  >
                    {submitting ? '送信中...' : '返信する'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
