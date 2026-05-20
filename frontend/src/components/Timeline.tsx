import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { postService } from '../services/post';
import { usePostBroadcast } from '../hooks/usePostBroadcast';
import type { PostResponse } from '../types/post';
import PostForm from './PostForm';
import PostCard from './PostCard';
import PostEditModal from './PostEditModal';
import NewPostsBanner from './NewPostsBanner';

type Tab = 'all' | 'following';

export default function Timeline() {
  const { currentUser } = useAuth();
  const [tab, setTab] = useState<Tab>('all');
  const [postFormOpen, setPostFormOpen] = useState(false);
  const [posts, setPosts] = useState<PostResponse[]>([]);
  const [pendingPosts, setPendingPosts] = useState<PostResponse[]>([]);
  // undefined=未初期化, null=末尾到達, number=次カーソル
  const [nextCursor, setNextCursor] = useState<number | null | undefined>(undefined);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [editingPost, setEditingPost] = useState<PostResponse | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);
  const seenPostIdsRef = useRef(new Set<number>());

  const loadMore = useCallback(async () => {
    if (loadingRef.current || !hasMore) return;
    loadingRef.current = true;
    setLoading(true);
    try {
      const res = await postService.getTimeline(nextCursor ?? undefined);
      const { posts: newPosts, nextCursor: nc, hasMore: hm } = res.data;
      newPosts.forEach((p) => seenPostIdsRef.current.add(p.id));
      setPosts((prev) => [...prev, ...newPosts]);
      setNextCursor(nc);
      setHasMore(hm);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [hasMore, nextCursor]);

  // 初回ロード（マウント時のみ実行）
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadMore(); }, []);

  // スクロール末尾で追加ロード
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

  // WebSocket 受信: 未知の投稿はバッファへ、既知はスキップ（重複・自分の投稿）
  const handleBroadcast = useCallback((newPost: PostResponse) => {
    if (seenPostIdsRef.current.has(newPost.id)) return;
    seenPostIdsRef.current.add(newPost.id);
    setPendingPosts((prev) => [...prev, newPost]);
  }, []);

  usePostBroadcast(handleBroadcast);

  const handlePostCreated = (newPost: PostResponse) => {
    seenPostIdsRef.current.add(newPost.id);
    setPendingPosts((prev) => prev.filter((p) => p.id !== newPost.id));
    setPosts((prev) => [newPost, ...prev]);
  };

  const handleShowPending = () => {
    const sorted = [...pendingPosts].sort((a, b) => b.id - a.id);
    setPosts((prev) => [...sorted, ...prev]);
    setPendingPosts([]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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

  const tabClass = (t: Tab) =>
    `flex-1 py-3 text-sm font-semibold transition border-b-2 ${
      tab === t
        ? 'text-[#0f1419] border-[#1d9bf0]'
        : 'text-gray-500 border-transparent hover:bg-gray-50'
    }`;

  return (
    <div>
      <NewPostsBanner count={pendingPosts.length} onClick={handleShowPending} />

      {/* タブ + 投稿ボタン */}
      <div className="flex items-center border-b border-gray-200">
        <button className={tabClass('all')} onClick={() => setTab('all')}>
          全て
        </button>
        <button className={tabClass('following')} onClick={() => setTab('following')}>
          フォロー中
        </button>
        <div className="px-3 py-2">
          <button
            onClick={() => setPostFormOpen(true)}
            className="rounded-full bg-[#1d9bf0] hover:bg-[#1a8cd8] px-4 py-1.5 text-sm font-bold text-white transition whitespace-nowrap"
          >
            投稿する
          </button>
        </div>
      </div>

      <PostForm
        open={postFormOpen}
        onClose={() => setPostFormOpen(false)}
        onPostCreated={handlePostCreated}
      />

      {tab === 'following' ? (
        <div className="text-center py-16 text-gray-400 text-sm">
          <p className="text-lg font-semibold text-[#0f1419] mb-2">フォロー中のユーザーの投稿</p>
          <p>フォロー機能は現在準備中です</p>
        </div>
      ) : (
        <>
          <div>
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                currentUserId={currentUser?.id}
                onDelete={setDeleteTargetId}
                onEdit={setEditingPost}
              />
            ))}
          </div>
          <div ref={sentinelRef} className="h-4" />
          {loading && (
            <div className="text-center py-6 text-gray-400 text-sm">読み込み中...</div>
          )}
          {!hasMore && posts.length > 0 && (
            <div className="text-center py-6 text-gray-300 text-sm">
              すべての投稿を読み込みました
            </div>
          )}
        </>
      )}

      <PostEditModal
        key={editingPost?.id ?? 'none'}
        post={editingPost}
        onClose={() => setEditingPost(null)}
        onUpdated={handleUpdated}
      />

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
