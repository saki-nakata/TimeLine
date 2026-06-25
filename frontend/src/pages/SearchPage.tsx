import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Layout from '../components/Layout';
import PostCard from '../components/PostCard';
import PostEditModal from '../components/PostEditModal';
import CommentModal from '../components/CommentModal';
import { postService } from '../services/post';
import { useAuth } from '../context/AuthContext';
import type { PostResponse } from '../types/post';

type SearchTab = 'posts' | 'hashtag';

export default function SearchPage() {
  const { currentUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const queryParam = searchParams.get('q') ?? '';
  const hashtagParam = searchParams.get('hashtag') ?? '';
  const initialTab: SearchTab = hashtagParam ? 'hashtag' : 'posts';

  const [tab, setTab] = useState<SearchTab>(initialTab);
  const [inputValue, setInputValue] = useState(hashtagParam ? `#${hashtagParam}` : queryParam);
  const [posts, setPosts] = useState<PostResponse[]>([]);
  const [nextCursor, setNextCursor] = useState<number | null | undefined>(undefined);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [editingPost, setEditingPost] = useState<PostResponse | null>(null);
  const [commentModalPost, setCommentModalPost] = useState<PostResponse | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);

  const activeQuery = tab === 'hashtag' ? hashtagParam : queryParam;

  const fetchPosts = useCallback(async (cursor: number | null | undefined, replace: boolean) => {
    if (loadingRef.current || !activeQuery) return;
    loadingRef.current = true;
    setLoading(true);
    try {
      const res = tab === 'hashtag'
        ? await postService.searchByHashtag(activeQuery, cursor ?? undefined)
        : await postService.searchPosts(activeQuery, cursor ?? undefined);
      const { posts: newPosts, nextCursor: nc, hasMore: hm } = res.data;
      setPosts(prev => replace ? newPosts : [...prev, ...newPosts]);
      setNextCursor(nc);
      setHasMore(hm);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [tab, activeQuery]);

  useEffect(() => {
    setPosts([]);
    setNextCursor(undefined);
    setHasMore(true);
    if (activeQuery) fetchPosts(undefined, true);
  }, [activeQuery, tab]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting && hasMore && nextCursor != null) fetchPosts(nextCursor, false); },
      { threshold: 0.1 }
    );
    if (sentinelRef.current) observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore, nextCursor, fetchPosts]);

  const handleSearch = () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    if (trimmed.startsWith('#')) {
      const tag = trimmed.slice(1);
      setTab('hashtag');
      setSearchParams({ hashtag: tag });
    } else {
      setTab('posts');
      setSearchParams({ q: trimmed });
    }
  };

  const handleTabChange = (newTab: SearchTab) => {
    setTab(newTab);
    if (newTab === 'hashtag' && queryParam) {
      setInputValue(`#${queryParam}`);
      setSearchParams({ hashtag: queryParam });
    } else if (newTab === 'posts' && hashtagParam) {
      setInputValue(hashtagParam);
      setSearchParams({ q: hashtagParam });
    }
  };

  const handleLikeToggle = (post: PostResponse) => {
    const liked = post.likedByCurrentUser;
    const action = liked ? postService.removeLike : postService.addLike;
    action(post.id).then((res) => {
      setPosts(prev => prev.map(p =>
        p.id === post.id
          ? { ...p, likedByCurrentUser: !liked, likeCount: res.data.likeCount }
          : p
      ));
    });
  };

  const handleDelete = (id: number) => {
    if (!window.confirm('この投稿を削除しますか？')) return;
    postService.deletePost(id).then(() => {
      setPosts(prev => prev.filter(p => p.id !== id));
    });
  };

  const handleEditSave = (updated: PostResponse) => {
    setPosts(prev => prev.map(p => p.id === updated.id ? updated : p));
    setEditingPost(null);
  };

  return (
    <Layout onPostClick={() => {}}>
      <div className="pt-3">
        {/* 検索バー */}
        <div className="px-4 pb-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="#ハッシュタグ または キーワード"
              className="flex-1 border border-gray-300 rounded-full px-4 py-2 text-[15px] outline-none focus:border-[#1d9bf0] focus:ring-1 focus:ring-[#1d9bf0]"
            />
            <button
              onClick={handleSearch}
              className="bg-[#1d9bf0] text-white px-5 py-2 rounded-full text-[15px] font-bold hover:bg-[#1a8cd8] transition-colors"
            >
              検索
            </button>
          </div>
        </div>

        {/* タブ */}
        <div className="flex border-b border-[#eff3f4]">
          {(['posts', 'hashtag'] as SearchTab[]).map(t => (
            <button
              key={t}
              onClick={() => handleTabChange(t)}
              className={`flex-1 py-3 text-[15px] font-semibold transition-colors ${
                tab === t
                  ? 'text-[#0f1419] border-b-2 border-[#1d9bf0]'
                  : 'text-[#536471] hover:bg-[#f7f9f9]'
              }`}
            >
              {t === 'posts' ? '投稿' : 'ハッシュタグ'}
            </button>
          ))}
        </div>

        {/* 結果 */}
        {!activeQuery && (
          <p className="text-center text-[#536471] py-12">キーワードまたは #ハッシュタグ で検索してください</p>
        )}

        {activeQuery && posts.length === 0 && !loading && (
          <p className="text-center text-[#536471] py-12">
            「{tab === 'hashtag' ? `#${activeQuery}` : activeQuery}」の検索結果はありません
          </p>
        )}

        {posts.map(post => (
          <PostCard
            key={post.id}
            post={post}
            currentUserId={currentUser?.id}
            onDelete={handleDelete}
            onEdit={setEditingPost}
            onLikeToggle={handleLikeToggle}
            onCommentClick={setCommentModalPost}
          />
        ))}

        <div ref={sentinelRef} className="h-4" />
        {loading && <p className="text-center text-[#536471] py-4">読み込み中...</p>}
      </div>

      {editingPost && (
        <PostEditModal
          post={editingPost}
          onClose={() => setEditingPost(null)}
          onUpdated={handleEditSave}
        />
      )}
      {commentModalPost && (
        <CommentModal
          open={true}
          post={commentModalPost}
          currentUser={currentUser}
          onClose={() => setCommentModalPost(null)}
          onCommentCreated={(postId, newCount) =>
            setPosts(prev => prev.map(p => p.id === postId ? { ...p, commentCount: newCount } : p))
          }
        />
      )}
    </Layout>
  );
}
