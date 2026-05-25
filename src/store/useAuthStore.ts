import { create } from "zustand";

interface User {
  id: number;
  name: string;
  role: string;
  pinfl?: string;
}

interface AuthState {
  token: string | null;
  expiresAt: number | null;
  user: User | null;
  permissions: string[];
  isAuth: boolean;

  setToken: (token: string, ttlMinutes: number) => void;
  setUser: (user: User) => void;
  setPermissions: (permissions: string[]) => void;
  logout: () => void;
  isExpired: () => boolean;
}

const getStoredAuth = () => {
  const raw = localStorage.getItem("auth");
  if (!raw) return null;

  const parsed = JSON.parse(raw);
  if (Date.now() > parsed.expiresAt) {
    localStorage.removeItem("auth");
    return null;
  }

  return parsed;
};

const storedAuth = getStoredAuth();

const useAuthStore = create<AuthState>((set, get) => ({
  token: storedAuth?.token ?? null,
  expiresAt: storedAuth?.expiresAt ?? null,
  user: JSON.parse(localStorage.getItem("user") || "null"),
  permissions: JSON.parse(localStorage.getItem("permissions") || "[]"),
  isAuth: !!storedAuth?.token,

  setToken: (token, ttlMinutes) => {
    const expiresAt = Date.now() + ttlMinutes * 60 * 1000;

    localStorage.setItem("auth", JSON.stringify({ token, expiresAt }));

    set({
      token,
      expiresAt,
      isAuth: true,
    });
  },

  setUser: (user) => {
    localStorage.setItem("user", JSON.stringify(user));
    set({ user });
  },

  setPermissions: (permissions) => {
    localStorage.setItem("permissions", JSON.stringify(permissions));
    set({ permissions });
  },

  logout: () => {
    localStorage.removeItem("auth");
    localStorage.removeItem("user");
    localStorage.removeItem("permissions");

    set({
      token: null,
      expiresAt: null,
      user: null,
      permissions: [],
      isAuth: false,
    });
  },

  isExpired: () => {
    const { expiresAt } = get();
    if (!expiresAt) return true;
    return Date.now() > expiresAt;
  },
}));

export default useAuthStore;
