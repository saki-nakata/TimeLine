import api from './auth';
import type { PostResponse, TimelineResponse, LikeResponse, CommentResponse } from '../types/post';

export const postService = {
  getPost: (id: number) =>
    api.get<PostResponse>(`/posts/${id}`),

  getTimeline: (cursor?: number, limit = 20, type: 'all' | 'following' = 'all') =>
    api.get<TimelineResponse>('/posts', { params: { cursor, limit, type } }),

  createPost: (content: string) =>
    api.post<PostResponse>('/posts', { content }),

  updatePost: (id: number, content: string) =>
    api.put<PostResponse>(`/posts/${id}`, { content }),

  deletePost: (id: number) =>
    api.delete(`/posts/${id}`),

  addLike: (postId: number) =>
    api.post<LikeResponse>(`/posts/${postId}/likes`),

  removeLike: (postId: number) =>
    api.delete<LikeResponse>(`/posts/${postId}/likes`),

  getComments: (postId: number) =>
    api.get<CommentResponse[]>(`/posts/${postId}/comments`),

  createComment: (postId: number, content: string) =>
    api.post<CommentResponse>(`/posts/${postId}/comments`, { content }),

  deleteComment: (postId: number, commentId: number) =>
    api.delete(`/posts/${postId}/comments/${commentId}`),
};
