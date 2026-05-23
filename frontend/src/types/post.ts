export interface PostResponse {
  id: number;
  userId: number;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  content: string;
  createdAt: string;
  updatedAt: string;
  likeCount: number;
  likedByCurrentUser: boolean;
  commentCount: number;
}

export interface TimelineResponse {
  posts: PostResponse[];
  nextCursor: number | null;
  hasMore: boolean;
}

export interface LikeResponse {
  likeCount: number;
  likedByCurrentUser: boolean;
}

export interface CommentResponse {
  id: number;
  postId: number;
  userId: number;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  content: string;
  createdAt: string;
}
