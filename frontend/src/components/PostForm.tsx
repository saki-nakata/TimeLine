import { useCallback, useEffect, useState } from 'react';
import { postService } from '../services/post';
import type { PostResponse } from '../types/post';

interface PostFormProps {
  open: boolean;
  onClose: () => void;
  onPostCreated: (post: PostResponse) => void;
}

const MAX_CHARS = 280;
const WARN_THRESHOLD = 20;

export default function PostForm({ open, onClose, onPostCreated }: PostFormProps) {
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const remaining = MAX_CHARS - content.length;
  const isOverLimit = remaining < 0;
  const isNearLimit = remaining <= WARN_THRESHOLD && !isOverLimit;

  const handleClose = useCallback(() => {
    setContent('');
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, handleClose]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!content.trim() || isOverLimit || submitting) return;
    setSubmitting(true);
    try {
      const res = await postService.createPost(content.trim());
      onPostCreated(res.data);
      handleClose();
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={handleClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-lg mx-4 p-6"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="新しい投稿"
      >
        <div className="mb-2">
          <h2 className="text-lg font-bold text-[#0f1419]">新しい投稿</h2>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="flex justify-end mb-1">
            <span
              className={`text-sm ${
                isOverLimit
                  ? 'text-[#f4212e] font-medium'
                  : isNearLimit
                  ? 'text-[#f4212e]'
                  : 'text-gray-400'
              }`}
            >
              残り{remaining}文字
            </span>
          </div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="いまどうしてる？"
            rows={4}
            autoFocus
            className="w-full resize-none text-base text-[#0f1419] placeholder-gray-400 border border-gray-200 rounded-lg p-3 outline-none focus:border-[#1d9bf0]"
          />
          <div className="flex items-center justify-end gap-3 mt-3">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-full border border-gray-300 px-4 py-1.5 text-sm font-bold text-[#0f1419]"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={!content.trim() || isOverLimit || submitting}
              className="rounded-full bg-[#1d9bf0] px-4 py-1.5 text-sm font-bold text-white disabled:opacity-50"
            >
              {submitting ? '投稿中...' : '投稿する'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
