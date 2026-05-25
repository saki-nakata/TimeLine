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
    // /auth/refresh と /auth/me はリトライしない
    // /auth/me は AuthContext が自前で 401 を catch するため interceptor 不要
    if (url === '/auth/refresh' || url === '/auth/me') {
      return Promise.reject(error);
    }
    if (error.response?.status === 401 && !error.config._retry) {
      error.config._retry = true;
      try {
        await api.post('/auth/refresh');
        return api(error.config);
      } catch {
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
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
