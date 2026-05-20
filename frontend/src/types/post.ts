export interface PostResponse {
  id: number;
  userId: number;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface TimelineResponse {
  posts: PostResponse[];
  nextCursor: number | null;
  hasMore: boolean;
}
