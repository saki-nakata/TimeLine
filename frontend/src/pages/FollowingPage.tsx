import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { userService } from '../services/user';
import type { UserProfileResponse } from '../types/user';
import Layout from '../components/Layout';
import FollowButton from '../components/FollowButton';

export default function FollowingPage() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [following, setFollowing] = useState<UserProfileResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;
    userService
      .getFollowing(currentUser.id)
      .then((res) => setFollowing(res.data))
      .finally(() => setLoading(false));
  }, [currentUser]);

  const handleFollowChange = (userId: number, isFollowing: boolean, followerCount: number) => {
    setFollowing((prev) =>
      prev.map((u) =>
        u.id === userId ? { ...u, followedByCurrentUser: isFollowing, followerCount } : u
      )
    );
  };

  return (
    <Layout>
      <div className="border-x border-gray-200">
        {/* ヘッダー */}
        <div className="sticky top-0 z-10 bg-white/80 backdrop-blur px-4 py-3 flex items-center gap-4 border-b border-gray-200">
          <button
            onClick={() => navigate(-1)}
            className="text-[#0f1419] hover:bg-gray-100 rounded-full p-2 -ml-2"
            aria-label="戻る"
          >
            ←
          </button>
          <h1 className="font-bold text-lg text-[#0f1419]">フォロー中</h1>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#1d9bf0] border-t-transparent" />
          </div>
        ) : following.length === 0 ? (
          <div className="text-center py-16">
            <p className="font-bold text-xl text-[#0f1419] mb-2">フォロー中のユーザーはいません</p>
            <p className="text-[#536471] text-sm">気になるユーザーをフォローしましょう</p>
          </div>
        ) : (
          <div>
            {following.map((user) => (
              <div
                key={user.id}
                className="flex items-start gap-3 px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => navigate(`/profile/${user.id}`)}
              >
                <div className="w-10 h-10 rounded-full overflow-hidden bg-[#1d9bf0] flex-shrink-0">
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt={user.username} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white font-bold text-base">
                      {(user.displayName ?? user.username).charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-bold text-[15px] text-[#0f1419] truncate">
                        {user.displayName ?? user.username}
                      </p>
                      <p className="text-[13px] text-[#536471]">@{user.username}</p>
                    </div>
                    {user.id !== currentUser?.id && (
                      <div onClick={(e) => e.stopPropagation()}>
                        <FollowButton
                          userId={user.id}
                          isFollowing={user.followedByCurrentUser}
                          followerCount={user.followerCount ?? 0}
                          onFollowChange={(isFollowing, followerCount) =>
                            handleFollowChange(user.id, isFollowing, followerCount)
                          }
                        />
                      </div>
                    )}
                  </div>
                  {user.bio && (
                    <p className="text-[14px] text-[#0f1419] mt-1 line-clamp-2">{user.bio}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
