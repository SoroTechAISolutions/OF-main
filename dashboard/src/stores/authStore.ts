import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthState, LoginRequest, RegisterRequest } from '../types';
import api from '../services/api';

interface AuthStore extends AuthState {
  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false, // Start with false, not true

      login: async (data: LoginRequest) => {
        const response = await api.login(data);
        if (response.success && response.data) {
          const { user, token } = response.data;
          localStorage.setItem('token', token);
          set({ user, token, isAuthenticated: true, isLoading: false });
        } else {
          throw new Error(response.error || 'Login failed');
        }
      },

      register: async (data: RegisterRequest) => {
        const response = await api.register(data);
        if (response.success && response.data) {
          const { user, token } = response.data;
          localStorage.setItem('token', token);
          set({ user, token, isAuthenticated: true, isLoading: false });
        } else {
          throw new Error(response.error || 'Registration failed');
        }
      },

      logout: () => {
        localStorage.removeItem('token');
        set({ user: null, token: null, isAuthenticated: false, isLoading: false });
      },

      checkAuth: async () => {
        const token = localStorage.getItem('token');
        if (!token) {
          set({ isLoading: false, isAuthenticated: false });
          return;
        }

        set({ isLoading: true });
        try {
          const response = await api.getProfile();
          if (response.success && response.data) {
            set({ user: response.data, token, isAuthenticated: true, isLoading: false });
          } else {
            localStorage.removeItem('token');
            set({ user: null, token: null, isAuthenticated: false, isLoading: false });
          }
        } catch {
          localStorage.removeItem('token');
          set({ user: null, token: null, isAuthenticated: false, isLoading: false });
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated
      }),
    }
  )
);
