import { useCallback, useEffect, useRef, useState } from 'react';
import { postService } from '../services/post';
import type { PostResponse } from '../types/post';

interface PostFormProps {
  open: boolean;
  onClose: () => void;
  onPostCreated: (post: PostResponse) => void;
}

const MAX_CHARS = 280;
const WARN_THRESHOLD = 20;

const IconImage = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
    <circle cx="8.5" cy="8.5" r="1.5"/>
    <polyline points="21 15 16 10 5 21"/>
  </svg>
);

export default function PostForm({ open, onClose, onPostCreated }: PostFormProps) {
  const [content, setContent] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const remaining = MAX_CHARS - content.length;
  const isOverLimit = remaining < 0;
  const isNearLimit = remaining <= WARN_THRESHOLD && !isOverLimit;
  const canSubmit = (content.trim().length > 0 || imageFile !== null) && !isOverLimit && !submitting;

  const handleClose = useCallback(() => {
    setContent('');
    setImageFile(null);
    setImagePreview(null);
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

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('ファイルサイズは5MB以下にしてください');
      e.target.value = '';
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const res = await postService.createPost(content.trim() || null, imageFile);
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

          {imagePreview && (
            <div className="relative mt-2 rounded-xl overflow-hidden border border-gray-200">
              <img src={imagePreview} alt="プレビュー" className="w-full h-auto" />
              <button
                type="button"
                onClick={handleRemoveImage}
                className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm transition-colors"
                aria-label="画像を削除"
              >
                ✕
              </button>
            </div>
          )}

          <div className="flex items-center justify-between mt-3">
            {/* opacity-[0.01]: Chrome は opacity:0 のfile inputのダイアログを開かないためわずかに不透明にする */}
            <label
              className="relative text-[#1d9bf0] hover:bg-[#e8f5fe] p-2 rounded-full transition-colors cursor-pointer"
              title="画像を追加"
              aria-label="画像を追加"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                onChange={handleImageChange}
                className="absolute inset-0 w-full h-full cursor-pointer opacity-[0.01]"
              />
              <IconImage />
            </label>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleClose}
                className="rounded-full border border-gray-300 px-4 py-1.5 text-sm font-bold text-[#0f1419]"
              >
                キャンセル
              </button>
              <button
                type="submit"
                disabled={!canSubmit}
                className="rounded-full bg-[#1d9bf0] px-4 py-1.5 text-sm font-bold text-white disabled:opacity-50"
              >
                {submitting ? '投稿中...' : '投稿する'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
