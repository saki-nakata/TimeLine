import api from './auth';
import type { PostResponse, TimelineResponse } from '../types/post';

export const postService = {
  getTimeline: (cursor?: number, limit = 20) =>
    api.get<TimelineResponse>('/posts', { params: { cursor, limit } }),

  createPost: (content: string) =>
    api.post<PostResponse>('/posts', { content }),

  updatePost: (id: number, content: string) =>
    api.put<PostResponse>(`/posts/${id}`, { content }),

  deletePost: (id: number) =>
    api.delete(`/posts/${id}`),
};
