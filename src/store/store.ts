import { create } from "zustand";

const isBrowser = typeof window !== "undefined";

const readPersistedArray = <T>(key: string): T[] => {
  if (!isBrowser) return [];
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
};

const persistedUser = (() => {
  if (!isBrowser) return null;
  try {
    const raw = localStorage.getItem("auth_user");
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
})();

const persistedRoles = readPersistedArray<number>("auth_roles");
const persistedRoleCodes = readPersistedArray<string>("auth_role_codes");

export type RoleSummary = {
  role_id: number;
  code: string;
  name: string;
  description?: string | null;
  is_system?: boolean;
};

type AuthUser = {
  admin_id?: number;
  customer_id?: number;
  phone?: string;
  name?: string | null;
  roles?: number[];
  role_codes?: string[];
  roleDetails?: RoleSummary[];
  role_details?: RoleSummary[];
  admin_is_active?: boolean;
} | null;

interface AuthStore {
  user: AuthUser;
  roles: number[];
  roleCodes: string[];
  isAdmin: boolean;
  setRoleState: (roles: number[], roleCodes?: string[]) => void;
  setUser: (user: AuthUser) => void;
  hasRole: (roleCode: string) => boolean;
  logout: () => Promise<void>;
}

const normaliseRoleIds = (roles: number[]): number[] => {
  const result = new Set<number>();
  for (const value of roles ?? []) {
    const asNumber = Number(value);
    if (Number.isInteger(asNumber)) {
      result.add(asNumber);
    }
  }
  return Array.from(result);
};

const normaliseRoleCodes = (codes: string[]): string[] => {
  const result = new Set<string>();
  for (const value of codes ?? []) {
    if (typeof value === "string" && value.trim()) {
      result.add(value.trim());
    }
  }
  return Array.from(result);
};

const initialRoleCodes = normaliseRoleCodes(persistedRoleCodes);

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: persistedUser,
  roles: normaliseRoleIds(persistedRoles),
  roleCodes: initialRoleCodes,
  isAdmin: initialRoleCodes.includes("admin"),
  setRoleState: (roles, roleCodes = []) => {
    const resolvedRoles = normaliseRoleIds(roles);
    const resolvedCodes = normaliseRoleCodes(roleCodes);

    if (isBrowser) {
      try {
        localStorage.removeItem("is_admin");
        localStorage.setItem("auth_roles", JSON.stringify(resolvedRoles));
        localStorage.setItem("auth_role_codes", JSON.stringify(resolvedCodes));
      } catch {
        // ignore persistence errors
      }
    }

    set({
      roles: resolvedRoles,
      roleCodes: resolvedCodes,
      isAdmin: resolvedCodes.includes("admin"),
    });
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
        // ignore persistence errors
      }
    }

    set({ user });

    const roles = user?.roles ?? [];
    const codes = (user?.role_codes ?? (user as Record<string, unknown> | null)?.roleCodes ?? []) as string[];
    get().setRoleState(roles, codes);
  },
  hasRole: (roleCode: string) => {
    return get().roleCodes.includes(roleCode);
  },
  logout: async () => {
    if (isBrowser) {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("is_admin");
      localStorage.removeItem("auth_user");
      localStorage.removeItem("auth_roles");
      localStorage.removeItem("auth_role_codes");
    }

    set({ user: null });
    get().setRoleState([], []);
  },
}));
