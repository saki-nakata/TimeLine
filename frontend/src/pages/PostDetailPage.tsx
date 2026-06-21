import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { postService } from '../services/post';
import type { PostResponse, CommentResponse } from '../types/post';
import Layout from '../components/Layout';
import PostEditModal from '../components/PostEditModal';
import Avatar from '../components/Avatar';

const MAX_CHARS = 280;

function relativeTime(isoString: string) {
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
  <svg width="20" height="20" viewBox="0 0 24 24"
    fill={filled ? 'currentColor' : 'none'}
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
  </svg>
);

export default function PostDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [post, setPost] = useState<PostResponse | null>(null);
  const [fetchError, setFetchError] = useState('');
  const [comments, setComments] = useState<CommentResponse[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [editingPost, setEditingPost] = useState<PostResponse | null>(null);
  const [deletePostConfirm, setDeletePostConfirm] = useState(false);
  const [confirmDeleteCommentId, setConfirmDeleteCommentId] = useState<number | null>(null);
  const commentInputRef = useRef<HTMLInputElement>(null);

  const postId = Number(id);
  const loadError = isNaN(postId) ? '不正なURLです' : fetchError;

  useEffect(() => {
    if (isNaN(postId)) return;
    postService.getPost(postId)
      .then(res => setPost(res.data))
      .catch(() => setFetchError('投稿が見つかりません'));
    postService.getComments(postId)
      .then(res => setComments(res.data))
      .catch(() => {})
      .finally(() => setCommentsLoading(false));
  }, [postId]);

  const handleLikeToggle = async () => {
    if (!post) return;
    const wasLiked = post.likedByCurrentUser;
    setPost(p => p ? { ...p, likedByCurrentUser: !wasLiked, likeCount: wasLiked ? p.likeCount - 1 : p.likeCount + 1 } : null);
    try {
      const res = wasLiked ? await postService.removeLike(post.id) : await postService.addLike(post.id);
      setPost(p => p ? { ...p, likeCount: res.data.likeCount, likedByCurrentUser: res.data.likedByCurrentUser } : null);
    } catch {
      setPost(p => p ? { ...p, likedByCurrentUser: wasLiked, likeCount: post.likeCount } : null);
    }
  };

  const handleSubmitComment = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!post) return;
    const trimmed = content.trim();
    if (!trimmed || trimmed.length > MAX_CHARS || submitting) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      const res = await postService.createComment(post.id, trimmed);
      setComments(prev => [...prev, res.data]);
      setContent('');
      setPost(p => p ? { ...p, commentCount: p.commentCount + 1 } : null);
    } catch {
      setSubmitError('コメントの投稿に失敗しました');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    if (!post) return;
    try {
      await postService.deleteComment(post.id, commentId);
      setComments(prev => prev.filter(c => c.id !== commentId));
      setPost(p => p ? { ...p, commentCount: p.commentCount - 1 } : null);
    } catch {
      // 削除失敗は無視
    } finally {
      setConfirmDeleteCommentId(null);
    }
  };

  const handleDeletePost = async () => {
    if (!post) return;
    try {
      await postService.deletePost(post.id);
      navigate('/home');
    } catch {
      setDeletePostConfirm(false);
    }
  };

  const handleUpdated = (updated: PostResponse) => {
    setPost(prev => prev ? {
      ...updated,
      likeCount: prev.likeCount,
      commentCount: prev.commentCount,
      likedByCurrentUser: prev.likedByCurrentUser,
    } : null);
    setEditingPost(null);
  };

  const isOwner = post?.userId === currentUser?.id;
  const remaining = MAX_CHARS - content.length;
  const isOverLimit = remaining < 0;
  const canSubmit = content.trim().length > 0 && !isOverLimit && !submitting;

  return (
    <>
    <Layout fullHeight>
      <div className="border-l border-[#eff3f4] h-full flex flex-col">
          {/* 戻るボタン */}
          <div className="bg-white border-b border-[#eff3f4] shrink-0">
            <button
              onClick={() => navigate('/home')}
              className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors w-full"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
              <span className="font-bold text-[#0f1419] text-[19px]">投稿</span>
            </button>
          </div>

          {/* スクロール可能エリア */}
          <div className="flex-1 overflow-y-auto">
            {loadError ? (
              <div className="p-8 text-center text-[#536471]">{loadError}</div>
            ) : !post ? (
              <div className="p-8 text-center text-[#536471] text-sm">読み込み中...</div>
            ) : (
              <>
                {/* 投稿詳細 */}
                <div className="px-4 pt-4 pb-3 border-b border-[#eff3f4]">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={post.displayName ?? post.username} avatarUrl={post.avatarUrl} size={10} />
                      <button
                        onClick={() => navigate(`/profile/${post.userId}`)}
                        className="text-left hover:underline"
                      >
                        <p className="font-bold text-[15px] text-[#0f1419]">{post.displayName ?? post.username}</p>
                        <p className="text-[14px] text-[#536471]">@{post.username}</p>
                      </button>
                    </div>
                    {isOwner && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setEditingPost(post)}
                          className="text-[#536471] hover:text-[#1d9bf0] hover:bg-[#e8f5fe] p-2 rounded-full transition-colors"
                          title="編集"
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                        </button>
                        <button
                          onClick={() => setDeletePostConfirm(true)}
                          className="text-[#536471] hover:text-[#f4212e] hover:bg-[#fde8ea] p-2 rounded-full transition-colors"
                          title="削除"
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                            <path d="M10 11v6M14 11v6"/>
                            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>

                  {post.content && (
                    <p className="text-[20px] text-[#0f1419] leading-relaxed whitespace-pre-wrap break-words mb-4">
                      {post.content}
                    </p>
                  )}

                  {post.imageUrl && (
                    <div className="mb-4 rounded-xl overflow-hidden border border-gray-100">
                      <img src={post.imageUrl} alt="投稿画像" className="w-full h-auto" />
                    </div>
                  )}

                  <p className="text-[15px] text-[#536471] mb-3 border-b border-[#eff3f4] pb-3">
                    {new Date(post.createdAt).toLocaleString('ja-JP', {
                      year: 'numeric', month: 'long', day: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </p>

                  <div className="flex items-center gap-5">
                    <button
                      data-testid="detail-like-button"
                      onClick={handleLikeToggle}
                      className={`flex items-center gap-1.5 text-[15px] px-2.5 py-1.5 rounded-full transition-colors ${
                        post.likedByCurrentUser
                          ? 'text-[#f91880]'
                          : 'text-[#536471] hover:text-[#f91880] hover:bg-[#fde8f0]'
                      }`}
                    >
                      <IconHeart filled={post.likedByCurrentUser} />
                      <span data-testid="detail-like-count">{post.likeCount}</span>
                      <span className="text-[14px]">いいね</span>
                    </button>
                    <button
                      onClick={() => { commentInputRef.current?.focus(); commentInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }}
                      className="flex items-center gap-1.5 text-[15px] text-[#536471] hover:text-[#1d9bf0] hover:bg-[#e8f5fe] px-2.5 py-1.5 rounded-full transition-colors"
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                      </svg>
                      <span>{post.commentCount}</span>
                      <span className="text-[14px]">コメント</span>
                    </button>
                  </div>
                </div>

                {/* コメント一覧 */}
                <div>
                  {commentsLoading ? (
                    <p className="text-center py-6 text-[#536471] text-sm">読み込み中...</p>
                  ) : comments.length === 0 ? (
                    <div className="text-center py-10">
                      <p className="text-[#0f1419] font-bold text-[18px] mb-1">まだコメントはありません</p>
                      <p className="text-[#536471] text-[14px]">最初のコメントを投稿しましょう</p>
                    </div>
                  ) : (
                    <div>
                      {comments.map(c => {
                        const name = c.displayName ?? c.username;
                        const isOwn = currentUser?.id === c.userId;
                        const isConfirming = confirmDeleteCommentId === c.id;
                        return (
                          <div
                            key={c.id}
                            data-testid="comment-item"
                            className={`flex gap-3 px-4 py-3 border-b border-[#eff3f4] transition-colors ${isConfirming ? 'bg-red-50' : ''}`}
                          >
                            <div className="flex-shrink-0">
                              <Avatar name={name} avatarUrl={c.avatarUrl} size={9} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0 min-w-0">
                                  <button
                                    onClick={() => navigate(`/profile/${c.userId}`)}
                                    className="font-bold text-[14px] text-[#0f1419] truncate hover:underline"
                                  >{name}</button>
                                  <button onClick={() => navigate(`/profile/${c.userId}`)} className="text-[13px] text-[#536471] hover:underline">@{c.username}</button>
                                  <span className="text-[13px] text-[#536471]">·</span>
                                  <span className="text-[13px] text-[#536471]">{relativeTime(c.createdAt)}</span>
                                </div>
                                {isOwn && (
                                  <button
                                    data-testid="comment-delete"
                                    onClick={() => setConfirmDeleteCommentId(isConfirming ? null : c.id)}
                                    className={`flex-shrink-0 p-1.5 rounded-full transition-colors ${
                                      isConfirming
                                        ? 'text-[#f4212e] bg-[#fde8ea]'
                                        : 'text-[#536471] hover:text-[#f4212e] hover:bg-[#fde8ea]'
                                    }`}
                                    aria-label="削除"
                                  >
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      <polyline points="3 6 5 6 21 6"/>
                                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                                      <path d="M10 11v6M14 11v6"/>
                                      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                                    </svg>
                                  </button>
                                )}
                              </div>
                              <p className="text-[14px] text-[#0f1419] leading-relaxed whitespace-pre-wrap break-words mt-0.5">
                                {c.content}
                              </p>
                              {isConfirming && (
                                <div className="mt-2 flex items-center gap-2 px-3 py-2 bg-white border border-red-200 rounded-xl">
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f4212e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                                    <circle cx="12" cy="12" r="10"/>
                                    <line x1="12" y1="8" x2="12" y2="12"/>
                                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                                  </svg>
                                  <span className="text-[12px] text-[#536471] flex-1">このコメントを削除しますか？</span>
                                  <button
                                    onClick={() => handleDeleteComment(c.id)}
                                    className="text-[12px] font-bold text-white bg-[#f4212e] hover:bg-[#cc1a27] px-3 py-1 rounded-full transition-colors"
                                  >
                                    削除
                                  </button>
                                  <button
                                    onClick={() => setConfirmDeleteCommentId(null)}
                                    className="text-[12px] font-bold text-[#536471] hover:text-[#0f1419] px-3 py-1 rounded-full border border-[#cfd9de] hover:border-[#0f1419] transition-colors"
                                  >
                                    キャンセル
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* コメント入力（画面最下部に固定） */}
          {currentUser && (
            <div className="shrink-0 bg-white border-t border-[#eff3f4] px-4 pt-2 pb-[72px] md:pb-4">
              <form onSubmit={handleSubmitComment}>
                <div className="flex justify-end mb-1.5">
                  <span className={`text-xs tabular-nums ${
                    isOverLimit ? 'text-[#f4212e] font-medium' : remaining <= 20 ? 'text-[#ffd400] font-medium' : 'text-[#aab8c2]'
                  }`}>
                    {isOverLimit ? `${remaining}文字` : `残り${remaining}文字`}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <Avatar
                    name={currentUser.displayName ?? currentUser.username}
                    avatarUrl={currentUser.avatarUrl}
                    size={8}
                  />
                  <div className={`flex-1 rounded-full border px-4 py-2 transition-colors ${
                    isOverLimit ? 'border-[#f4212e]' : 'border-[#cfd9de] focus-within:border-[#1d9bf0]'
                  }`}>
                    <input
                      ref={commentInputRef}
                      type="text"
                      value={content}
                      onChange={e => setContent(e.target.value)}
                      placeholder="コメントを追加..."
                      data-testid="detail-comment-input"
                      className="w-full text-[15px] text-[#0f1419] outline-none placeholder-[#536471] bg-transparent"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!canSubmit}
                    data-testid="detail-comment-submit"
                    className="flex-shrink-0 rounded-full bg-[#1d9bf0] px-4 py-1.5 text-[14px] font-bold text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#1a8cd8] active:bg-[#1877b5] transition-colors"
                  >
                    {submitting ? '送信中...' : '投稿'}
                  </button>
                </div>
                {submitError && (
                  <p className="text-[#f4212e] text-xs mt-1 pl-11">{submitError}</p>
                )}
              </form>
            </div>
          )}
      </div>
    </Layout>

      {editingPost && (
        <PostEditModal
          key={editingPost.id}
          post={editingPost}
          onClose={() => setEditingPost(null)}
          onUpdated={handleUpdated}
        />
      )}

      {deletePostConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setDeletePostConfirm(false)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-sm mx-4 p-6"
            onClick={e => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold text-[#0f1419] mb-2">投稿を削除しますか？</h2>
            <p className="text-sm text-[#536471] mb-6">この操作は取り消せません。</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeletePostConfirm(false)}
                className="flex-1 rounded-full border border-gray-300 py-2 text-sm font-bold text-[#0f1419] hover:bg-gray-50 transition"
              >
                キャンセル
              </button>
              <button
                onClick={handleDeletePost}
                className="flex-1 rounded-full bg-[#f4212e] hover:bg-[#d41e29] py-2 text-sm font-bold text-white transition"
              >
                削除する
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
