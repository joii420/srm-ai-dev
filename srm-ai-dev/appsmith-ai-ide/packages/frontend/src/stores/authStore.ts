import { create } from 'zustand';

export interface UserInfo {
  id: string;
  username: string;
  displayName: string;
  role: 'admin' | 'developer';
}

export interface ActiveCheckout {
  pageId: string;
  pageName: string;
  branch: string;
}

interface AuthState {
  token: string | null;
  userInfo: UserInfo | null;
  activeCheckout: ActiveCheckout | null;
  isAuthenticated: boolean;
  login: (token: string, user: UserInfo) => void;
  logout: () => void;
  setUser: (user: UserInfo) => void;
  setActiveCheckout: (checkout: ActiveCheckout | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem('token'),
  userInfo: (() => {
    try {
      const stored = localStorage.getItem('userInfo');
      return stored ? (JSON.parse(stored) as UserInfo) : null;
    } catch {
      localStorage.removeItem('userInfo');
      return null;
    }
  })(),
  activeCheckout: null,
  isAuthenticated: (() => {
    const token = localStorage.getItem('token');
    if (!token) return false;
    // Ensure userInfo is also valid when token exists
    try {
      const stored = localStorage.getItem('userInfo');
      if (!stored) return false;
      JSON.parse(stored);
      return true;
    } catch {
      localStorage.removeItem('token');
      localStorage.removeItem('userInfo');
      return false;
    }
  })(),

  login: (token, user) => {
    localStorage.setItem('token', token);
    localStorage.setItem('userInfo', JSON.stringify(user));
    set({ token, userInfo: user, isAuthenticated: true });
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userInfo');
    set({ token: null, userInfo: null, isAuthenticated: false, activeCheckout: null });
  },

  setUser: (user) => {
    localStorage.setItem('userInfo', JSON.stringify(user));
    set({ userInfo: user });
  },

  setActiveCheckout: (checkout) => {
    set({ activeCheckout: checkout });
  },
}));
