import { create } from "zustand";

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
  isAdmin: false,
  user: null,
  setAdmin: (isAdmin: boolean) => set({ isAdmin }),
  setUser: (user: AuthUser) => set({ user }),
  logout: () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
    }
    set({ isAdmin: false, user: null });
  },
}));
