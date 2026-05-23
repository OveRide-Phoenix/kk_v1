import { create } from "zustand";
import { DEFAULT_CITY, normalizeCityCode } from "@/config/cities";

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
const persistedAdminCity = (() => {
  if (!isBrowser) return null;
  try {
    return localStorage.getItem("admin_city_code");
  } catch {
    return null;
  }
})();
export type RoleSummary = {
  role_id: number;
  code: string;
  name: string;
  description?: string | null;
  is_system?: boolean;
};

export type AuthUser = {
  admin_id?: number;
  customer_id?: number;
  phone?: string;
  name?: string | null;
  city_code?: string;
  eligible_city_codes?: string[];
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
  adminCity: string;
  setAdminCity: (cityCode: string) => void;
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

const normalizeCityPreference = (value?: string | null) => normalizeCityCode(value ?? DEFAULT_CITY);

const resolveEligibleCities = (user: AuthUser): string[] => {
  const raw =
    Array.isArray(user?.eligible_city_codes) && user?.eligible_city_codes.length
      ? user?.eligible_city_codes
      : user?.city_code
        ? [user.city_code]
        : [];
  const normalized = raw.map((code) => normalizeCityCode(code || DEFAULT_CITY)).filter(Boolean);
  if (normalized.length === 0 && user?.city_code) {
    normalized.push(normalizeCityCode(user.city_code));
  }
  if (normalized.length === 0) {
    normalized.push(DEFAULT_CITY);
  }
  return Array.from(new Set(normalized));
};

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: persistedUser,
  roles: normaliseRoleIds(persistedRoles),
  roleCodes: initialRoleCodes,
  isAdmin: initialRoleCodes.includes("admin"),
  adminCity: normalizeCityPreference(persistedAdminCity || persistedUser?.city_code),
  setAdminCity: (cityCode: string) => {
    const normalized = normalizeCityPreference(cityCode);
    if (isBrowser) {
      try {
        localStorage.setItem("admin_city_code", normalized);
      } catch {
        /* ignore persistence errors */
      }
    }
    set({ adminCity: normalized });
  },
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
    const codes = (user?.role_codes ??
      (user as Record<string, unknown> | null)?.roleCodes ??
      []) as string[];
    get().setRoleState(roles, codes);

    if (user) {
      const eligibleCities = resolveEligibleCities(user);
      const current = normalizeCityPreference(get().adminCity);
      const nextCity = eligibleCities.includes(current)
        ? current
        : (eligibleCities[0] ?? normalizeCityPreference(user.city_code));
      get().setAdminCity(nextCity);
    }
  },
  hasRole: (roleCode: string) => {
    return get().roleCodes.includes(roleCode);
  },
  logout: async () => {
    // Clear HTTP-only cookies that JS cannot touch directly.
    if (isBrowser) {
      try {
        await fetch("/api/backend/auth/logout", {
          method: "POST",
          credentials: "include",
        });
      } catch {
        // Best-effort — proceed with local cleanup even if the request fails.
      }
    }

    if (isBrowser) {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("is_admin");
      localStorage.removeItem("auth_user");
      localStorage.removeItem("auth_roles");
      localStorage.removeItem("auth_role_codes");
      localStorage.removeItem("admin_city_code");
    }

    set({ user: null });
    get().setRoleState([], []);
    get().setAdminCity(DEFAULT_CITY);
  },
}));
