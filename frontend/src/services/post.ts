import api from './auth';
import type { PostResponse, TimelineResponse, LikeResponse, CommentResponse } from '../types/post';

export const postService = {
  getPost: (id: number) =>
    api.get<PostResponse>(`/posts/${id}`),

  getTimeline: (cursor?: number, limit = 20, type: 'all' | 'following' = 'all') =>
    api.get<TimelineResponse>('/posts', { params: { cursor, limit, type } }),

  createPost: (content: string | null, image: File | null) => {
    const formData = new FormData();
    if (content) formData.append('content', content);
    if (image) formData.append('image', image);
    return api.post<PostResponse>('/posts', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  updatePost: (id: number, content: string | null, image: File | null, removeImage: boolean) => {
    const formData = new FormData();
    if (content) formData.append('content', content);
    if (image) formData.append('image', image);
    formData.append('removeImage', String(removeImage));
    return api.put<PostResponse>(`/posts/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

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
