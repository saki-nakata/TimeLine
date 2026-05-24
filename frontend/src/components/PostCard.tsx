import { useNavigate } from 'react-router-dom';
import type { PostResponse } from '../types/post';

interface PostCardProps {
  post: PostResponse;
  currentUserId: number | undefined;
  onDelete: (id: number) => void;
  onEdit: (post: PostResponse) => void;
  onLikeToggle: (post: PostResponse) => void;
  onCommentClick: (post: PostResponse) => void;
}

function relativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec}秒`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}分`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}時間`;
  return new Date(isoString).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' });
}

const IconHeart = ({ filled }: { filled: boolean }) => (
  <svg width="18" height="18" viewBox="0 0 24 24"
    fill={filled ? 'currentColor' : 'none'}
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
  </svg>
);

const IconComment = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>
);

const IconEdit = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);

const IconTrash = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
    <path d="M10 11v6"/>
    <path d="M14 11v6"/>
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
  </svg>
);

export default function PostCard({ post, currentUserId, onDelete, onEdit, onLikeToggle, onCommentClick }: PostCardProps) {
  const navigate = useNavigate();
  const isOwner = post.userId === currentUserId;
  const displayName = post.displayName ?? post.username;

  return (
    <article
      className="flex gap-3 px-4 py-3.5 border-b border-[#eff3f4] hover:bg-[#f7f9f9] transition-colors cursor-pointer"
      onClick={() => navigate(`/posts/${post.id}`)}
    >
      {/* アバター */}
      <button
        className="flex-shrink-0 w-10 h-10 rounded-full overflow-hidden"
        onClick={(e) => { e.stopPropagation(); navigate(`/profile/${post.userId}`); }}
        aria-label={`${displayName}のプロフィール`}
      >
        {post.avatarUrl ? (
          <img src={post.avatarUrl} alt={displayName} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white text-base font-bold bg-[#1d9bf0]">
            {displayName.charAt(0).toUpperCase()}
          </div>
        )}
      </button>

      {/* ボディ */}
      <div className="flex-1 min-w-0">
        {/* ヘッダー */}
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <button
              className="font-bold text-[15px] text-[#0f1419] truncate hover:underline"
              onClick={(e) => { e.stopPropagation(); navigate(`/profile/${post.userId}`); }}
            >
              {displayName}
            </button>
            <span className="text-[14px] text-[#536471] truncate">@{post.username}</span>
          </div>
          <span className="text-[14px] text-[#536471] flex-shrink-0">{relativeTime(post.createdAt)}</span>
        </div>

        {/* 本文 */}
        <p className="text-[15px] text-[#0f1419] leading-relaxed whitespace-pre-wrap break-words mb-2.5">
          {post.content}
        </p>

        {/* アクション */}
        <div className="flex items-center">
          <div className="flex gap-4">
            <button
              onClick={(e) => { e.stopPropagation(); onLikeToggle(post); }}
              className={`flex items-center gap-1.5 text-[14px] px-2.5 py-1.5 rounded-full transition-colors ${
                post.likedByCurrentUser
                  ? 'text-[#f91880]'
                  : 'text-[#536471] hover:text-[#f91880] hover:bg-[#fde8f0]'
              }`}
            >
              <IconHeart filled={post.likedByCurrentUser} />
              <span>{post.likeCount}</span>
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onCommentClick(post); }}
              className="flex items-center gap-1.5 text-[14px] text-[#536471] hover:text-[#1d9bf0] hover:bg-[#e8f5fe] px-2.5 py-1.5 rounded-full transition-colors"
            >
              <IconComment />
              <span>{post.commentCount}</span>
            </button>
          </div>

          {isOwner && (
            <div className="flex items-center gap-1 ml-auto">
              <button
                onClick={(e) => { e.stopPropagation(); onEdit(post); }}
                className="text-[#536471] hover:text-[#1d9bf0] hover:bg-[#e8f5fe] p-1.5 rounded-full transition-colors"
                title="編集"
              >
                <IconEdit />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(post.id); }}
                className="text-[#536471] hover:text-[#f4212e] hover:bg-[#fde8ea] p-1.5 rounded-full transition-colors"
                title="削除"
              >
                <IconTrash />
              </button>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
