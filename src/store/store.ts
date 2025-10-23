import { create } from "zustand";

const isBrowser = typeof window !== "undefined";
const persistedIsAdmin = (() => {
  if (!isBrowser) return false;
  try {
    return localStorage.getItem("is_admin") === "1";
  } catch {
    return false;
  }
})();

const persistedUser = (() => {
  if (!isBrowser) return null;
  try {
    const raw = localStorage.getItem("auth_user");
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
})();

type AuthUser = {
  admin_id?: number;
  customer_id?: number;
  phone?: string;
  role?: string;
  name?: string | null;
} | null;

interface AuthStore {
  isAdmin: boolean;
  user: AuthUser;
  setAdmin: (isAdmin: boolean) => void;
  setUser: (user: AuthUser) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  isAdmin: persistedIsAdmin,
  user: persistedUser,
  setAdmin: (isAdmin: boolean) => {
    if (isBrowser) {
      try {
        localStorage.setItem("is_admin", isAdmin ? "1" : "0");
      } catch {
        // ignore storage errors
      }
    }
    set({ isAdmin });
  },
  setUser: (user: AuthUser) => {
    if (isBrowser) {
      try {
        if (user) {
          localStorage.setItem("auth_user", JSON.stringify(user));
        } else {
          localStorage.removeItem("auth_user");
        }
      } catch {
        // ignore
      }
    }
    set({ user });
  },
  logout: () => {
    if (isBrowser) {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("is_admin");
      localStorage.removeItem("auth_user");
    }
    set({ isAdmin: false, user: null });
  },
}));
