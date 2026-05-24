import api from './auth';
import type { UserProfileResponse, UpdateProfileRequest, FollowResponse } from '../types/user';
import type { TimelineResponse } from '../types/post';

export const userService = {
  getProfile: (userId: number) =>
    api.get<UserProfileResponse>(`/users/${userId}`),

  updateProfile: (userId: number, req: UpdateProfileRequest) =>
    api.put<UserProfileResponse>(`/users/${userId}`, req),

  uploadAvatar: (userId: number, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post<UserProfileResponse>(`/users/${userId}/avatar`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  followUser: (userId: number) =>
    api.post<FollowResponse>(`/users/${userId}/follows`),

  unfollowUser: (userId: number) =>
    api.delete<FollowResponse>(`/users/${userId}/follows`),

  getUserPosts: (userId: number, cursor?: number, limit = 20) =>
    api.get<TimelineResponse>(`/users/${userId}/posts`, { params: { cursor, limit } }),

  getFollowing: (userId: number) =>
    api.get<UserProfileResponse[]>(`/users/${userId}/following`),

  searchUsers: (query: string) =>
    api.get<UserProfileResponse[]>('/users/search', { params: { q: query } }),
};
