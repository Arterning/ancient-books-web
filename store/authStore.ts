import { create } from 'zustand';
import { User } from '@/lib/api';
import { login as loginApi, logout as logoutApi, getCurrentUser } from '@/lib/auth';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  // Actions
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  fetchUser: () => Promise<void>;
  setUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isLoading: false,
  isAuthenticated: false,

  login: async (username: string, password: string) => {
    set({ isLoading: true });
    try {
      const tokenResponse = await loginApi({ username, password });
      const token = tokenResponse.access_token;

      // 保存 token
      localStorage.setItem('token', token);

      // 获取用户信息
      const user = await getCurrentUser();
      localStorage.setItem('user', JSON.stringify(user));

      set({
        token,
        user,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  logout: () => {
    logoutApi();
    set({
      user: null,
      token: null,
      isAuthenticated: false,
    });
  },

  fetchUser: async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      set({ isLoading: false });
      return;
    }

    set({ isLoading: true });
    try {
      const user = await getCurrentUser();
      set({
        user,
        token,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      // Token 无效，清除状态
      logoutApi();
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },

  setUser: (user: User) => {
    set({ user });
  },
}));
