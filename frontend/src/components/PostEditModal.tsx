import { useEffect, useState } from 'react';
import { postService } from '../services/post';
import type { PostResponse } from '../types/post';

interface PostEditModalProps {
  post: PostResponse | null;
  onClose: () => void;
  onUpdated: (updated: PostResponse) => void;
}

const MAX_CHARS = 280;
const WARN_THRESHOLD = 20;

export default function PostEditModal({ post, onClose, onUpdated }: PostEditModalProps) {
  const [content, setContent] = useState(post?.content ?? '');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!post) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [post, onClose]);

  if (!post) return null;

  const remaining = MAX_CHARS - content.length;
  const isOverLimit = remaining < 0;
  const isNearLimit = remaining <= WARN_THRESHOLD && !isOverLimit;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!content.trim() || isOverLimit || submitting) return;
    setSubmitting(true);
    try {
      const res = await postService.updatePost(post.id, content.trim());
      onUpdated(res.data);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-lg mx-4 p-6"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="投稿を編集"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-[#0f1419]">投稿を編集</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
            aria-label="閉じる"
          >
            ×
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={4}
            className="w-full resize-none text-base text-[#0f1419] border border-gray-200 rounded-lg p-3 outline-none focus:border-[#1d9bf0]"
          />
          <div className="flex items-center justify-end gap-3 mt-3">
            <span
              className={`text-sm ${
                isOverLimit
                  ? 'text-[#f4212e] font-medium'
                  : isNearLimit
                  ? 'text-[#f4212e]'
                  : 'text-gray-400'
              }`}
            >
              {remaining}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-gray-300 px-4 py-1.5 text-sm font-bold text-[#0f1419]"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={!content.trim() || isOverLimit || submitting}
              className="rounded-full bg-[#1d9bf0] px-4 py-1.5 text-sm font-bold text-white disabled:opacity-50"
            >
              {submitting ? '保存中...' : '保存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
