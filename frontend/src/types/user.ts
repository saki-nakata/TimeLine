export interface UserResponse {
  id: number;
  username: string;
  displayName: string | null;
  email: string;
  avatarUrl: string | null;
  bio: string | null;
  followerCount: number | null;
  followingCount: number | null;
  createdAt: string;
}

export interface UserProfileResponse extends UserResponse {
  followedByCurrentUser: boolean;
}

export interface UpdateProfileRequest {
  username?: string;
  displayName?: string;
  bio?: string;
}

export interface FollowResponse {
  followerCount: number;
  followingCount: number;
  following: boolean;
}
