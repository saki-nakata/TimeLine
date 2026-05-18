import axios from 'axios';
import type { UserResponse } from '../types/user';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const url: string = error.config?.url ?? '';
    // 認証エンドポイント自体は無限ループを防ぐためリトライしない
    if (url.startsWith('/auth/')) {
      return Promise.reject(error);
    }
    if (error.response?.status === 401 && !error.config._retry) {
      error.config._retry = true;
      try {
        await api.post('/auth/refresh');
        return api(error.config);
      } catch {
        window.location.href = '/login';
        return Promise.reject(error);
      }
    }
    return Promise.reject(error);
  },
);

export const authService = {
  register: (data: { username: string; email: string; password: string }) =>
    api.post<UserResponse>('/auth/register', data),

  login: (data: { email: string; password: string }) =>
    api.post<UserResponse>('/auth/login', data),

  logout: () => api.post('/auth/logout'),

  me: () => api.get<UserResponse>('/auth/me'),
};

export default api;
