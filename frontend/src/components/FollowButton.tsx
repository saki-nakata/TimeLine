import { useState } from 'react';
import { userService } from '../services/user';

interface FollowButtonProps {
  userId: number;
  isFollowing: boolean;
  onFollowChange: (isFollowing: boolean, followerCount: number) => void;
}

export default function FollowButton({ userId, isFollowing, onFollowChange }: FollowButtonProps) {
  const [loading, setLoading] = useState(false);
  const [hovered, setHovered] = useState(false);

  const handleClick = async () => {
    if (loading) return;
    setLoading(true);
    try {
      if (isFollowing) {
        const res = await userService.unfollowUser(userId);
        onFollowChange(false, res.data.followerCount);
      } else {
        const res = await userService.followUser(userId);
        onFollowChange(true, res.data.followerCount);
      }
    } finally {
      setLoading(false);
    }
  };

  if (isFollowing) {
    return (
      <button
        onClick={handleClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        disabled={loading}
        className="rounded-full border border-gray-300 px-4 py-1.5 text-sm font-bold text-[#0f1419] hover:border-red-300 hover:bg-red-50 hover:text-red-500 transition-colors disabled:opacity-50 min-w-[100px]"
      >
        {hovered ? 'フォロー解除' : 'フォロー中'}
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="rounded-full bg-[#0f1419] px-4 py-1.5 text-sm font-bold text-white hover:bg-[#272c30] transition-colors disabled:opacity-50 min-w-[100px]"
    >
      フォロー
    </button>
  );
}
