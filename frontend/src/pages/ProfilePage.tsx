import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { userService } from '../services/user';
import { postService } from '../services/post';
import { useAuth } from '../context/AuthContext';
import type { UserProfileResponse } from '../types/user';
import type { PostResponse } from '../types/post';
import Layout from '../components/Layout';
import FollowButton from '../components/FollowButton';
import ProfileEditModal from '../components/ProfileEditModal';
import PostCard from '../components/PostCard';
import PostEditModal from '../components/PostEditModal';
import CommentModal from '../components/CommentModal';

interface UserPostsListProps {
  userId: number;
  currentUserId: number | undefined;
}

function UserPostsList({ userId, currentUserId }: UserPostsListProps) {
  const [posts, setPosts] = useState<PostResponse[]>([]);
  const [nextCursor, setNextCursor] = useState<number | null | undefined>(undefined);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [editingPost, setEditingPost] = useState<PostResponse | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const [commentModalPost, setCommentModalPost] = useState<PostResponse | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);

  const loadMore = useCallback(async () => {
    if (loadingRef.current || !hasMore) return;
    loadingRef.current = true;
    setLoading(true);
    try {
      const res = await userService.getUserPosts(userId, nextCursor ?? undefined);
      const { posts: newPosts, nextCursor: nc, hasMore: hm } = res.data;
      setPosts((prev) => [...prev, ...newPosts]);
      setNextCursor(nc);
      setHasMore(hm);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [hasMore, nextCursor, userId]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadMore(); }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && nextCursor !== undefined) {
          loadMore();
        }
      },
      { threshold: 0.1 },
    );
    const el = sentinelRef.current;
    if (el) observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore, nextCursor]);

  const handleDeleteConfirm = async () => {
    if (deleteTargetId === null) return;
    await postService.deletePost(deleteTargetId);
    setPosts((prev) => prev.filter((p) => p.id !== deleteTargetId));
    setDeleteTargetId(null);
  };

  const handleUpdated = (updated: PostResponse) => {
    setPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    setEditingPost(null);
  };

  const handleLikeToggle = async (post: PostResponse) => {
    const wasLiked = post.likedByCurrentUser;
    setPosts((prev) =>
      prev.map((p) =>
        p.id === post.id
          ? { ...p, likedByCurrentUser: !wasLiked, likeCount: wasLiked ? p.likeCount - 1 : p.likeCount + 1 }
          : p
      )
    );
    try {
      const res = wasLiked
        ? await postService.removeLike(post.id)
        : await postService.addLike(post.id);
      setPosts((prev) =>
        prev.map((p) =>
          p.id === post.id
            ? { ...p, likeCount: res.data.likeCount, likedByCurrentUser: res.data.likedByCurrentUser }
            : p
        )
      );
    } catch {
      setPosts((prev) =>
        prev.map((p) =>
          p.id === post.id
            ? { ...p, likedByCurrentUser: wasLiked, likeCount: post.likeCount }
            : p
        )
      );
    }
  };

  const handleCommentCreated = (postId: number, newCount: number) => {
    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, commentCount: newCount } : p))
    );
  };

  return (
    <div className="border-t border-gray-200">
      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          currentUserId={currentUserId}
          onDelete={setDeleteTargetId}
          onEdit={setEditingPost}
          onLikeToggle={handleLikeToggle}
          onCommentClick={setCommentModalPost}
        />
      ))}
      <div ref={sentinelRef} className="h-4" />
      {loading && (
        <div className="text-center py-6 text-gray-400 text-sm">読み込み中...</div>
      )}
      {!loading && !hasMore && posts.length === 0 && (
        <div className="text-center py-16 text-gray-400 text-sm">
          <p className="text-lg font-semibold text-[#0f1419] mb-2">まだ投稿はありません</p>
        </div>
      )}
      {!hasMore && posts.length > 0 && (
        <div className="text-center py-6 text-gray-300 text-sm">
          すべての投稿を読み込みました
        </div>
      )}

      <PostEditModal
        key={editingPost?.id ?? 'none'}
        post={editingPost}
        onClose={() => setEditingPost(null)}
        onUpdated={handleUpdated}
      />

      {commentModalPost && (
        <CommentModal
          open={true}
          post={commentModalPost}
          currentUser={null}
          onClose={() => setCommentModalPost(null)}
          onCommentCreated={handleCommentCreated}
        />
      )}

      {deleteTargetId !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setDeleteTargetId(null)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-sm mx-4 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold text-[#0f1419] mb-2">投稿を削除しますか？</h2>
            <p className="text-sm text-[#536471] mb-6">この操作は取り消せません。</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTargetId(null)}
                className="flex-1 rounded-full border border-gray-300 py-2 text-sm font-bold text-[#0f1419] hover:bg-gray-50 transition"
              >
                キャンセル
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="flex-1 rounded-full bg-[#f4212e] hover:bg-[#d41e29] py-2 text-sm font-bold text-white transition"
              >
                削除する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const { currentUser, setCurrentUser } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<UserProfileResponse | null>(null);
  const [loadedUserId, setLoadedUserId] = useState<number | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const targetId = Number(userId);
  const isOwner = currentUser?.id === targetId;
  const loading = loadedUserId !== targetId;

  useEffect(() => {
    if (!userId) return;
    userService
      .getProfile(targetId)
      .then((res) => {
        setProfile(res.data);
        setLoadedUserId(targetId);
      })
      .catch(() => navigate('/home'));
  }, [userId, targetId, navigate]);

  const handleFollowChange = (isFollowing: boolean, followerCount: number) => {
    if (!profile) return;
    setProfile({ ...profile, followedByCurrentUser: isFollowing, followerCount });
  };

  const handleProfileUpdated = (updated: UserProfileResponse) => {
    setProfile(updated);
    if (isOwner && currentUser) {
      setCurrentUser({ ...currentUser, ...updated });
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#1d9bf0] border-t-transparent" />
        </div>
      </Layout>
    );
  }

  if (!profile) return null;

  return (
    <Layout>
    <div className="border-x border-gray-200">
      {/* ヘッダー */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur px-4 py-3 flex items-center gap-6 border-b border-gray-200">
        <button
          onClick={() => navigate(-1)}
          className="text-[#0f1419] hover:bg-gray-100 rounded-full p-2 -ml-2"
          aria-label="戻る"
        >
          ←
        </button>
        <div>
          <h1 className="font-bold text-lg text-[#0f1419] leading-tight">
            {profile.displayName ?? profile.username}
          </h1>
        </div>
      </div>

      {/* プロフィールヘッダー */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-start justify-between mb-3">
          {/* アイコン */}
          <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
            {profile.avatarUrl ? (
              <img
                src={profile.avatarUrl}
                alt={profile.username}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400 text-3xl font-bold">
                {profile.username.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          {/* ボタン */}
          <div className="mt-2">
            {isOwner ? (
              <button
                onClick={() => setEditOpen(true)}
                className="rounded-full border border-gray-300 px-4 py-1.5 text-sm font-bold text-[#0f1419] hover:bg-gray-50 transition-colors"
              >
                プロフィールを編集
              </button>
            ) : (
              <FollowButton
                userId={profile.id}
                isFollowing={profile.followedByCurrentUser}
                onFollowChange={handleFollowChange}
              />
            )}
          </div>
        </div>

        {/* ユーザー名 */}
        <div className="mb-2">
          <p className="font-bold text-xl text-[#0f1419]">
            {profile.displayName ?? profile.username}
          </p>
          <p className="text-gray-500 text-sm">@{profile.username}</p>
        </div>

        {/* 自己紹介 */}
        {profile.bio && (
          <p className="text-[#0f1419] text-sm mb-3 whitespace-pre-wrap">{profile.bio}</p>
        )}

        {/* フォロー数 */}
        <div className="flex gap-5 text-sm">
          <span className="text-[#0f1419]">
            <span className="font-bold">{profile.followingCount ?? 0}</span>
            <span className="text-gray-500 ml-1">フォロー中</span>
          </span>
          <span className="text-[#0f1419]">
            <span className="font-bold">{profile.followerCount ?? 0}</span>
            <span className="text-gray-500 ml-1">フォロワー</span>
          </span>
        </div>
      </div>

      {/* 投稿一覧（key={targetId} でユーザー切り替え時に自動リセット） */}
      <UserPostsList key={targetId} userId={targetId} currentUserId={currentUser?.id} />

      {editOpen && (
        <ProfileEditModal
          profile={profile}
          onClose={() => setEditOpen(false)}
          onUpdated={handleProfileUpdated}
        />
      )}
    </div>
    </Layout>
  );
}
