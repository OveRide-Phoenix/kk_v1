import { useCallback, useState } from "react";

import { hydrateAuthUser, useHydrateAuthUser } from "@/hooks/useHydrateAuthUser";
import { useAuthStore } from "@/store/store";

export function useAuth() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const setUser = useAuthStore((state) => state.setUser);
  const { isHydrating } = useHydrateAuthUser();
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    try {
      const nextUser = await hydrateAuthUser();
      setUser(nextUser);
      setError(null);
      return nextUser;
    } catch (refreshError) {
      const nextError =
        refreshError instanceof Error ? refreshError : new Error("Unable to refresh auth state");
      setError(nextError);
      throw nextError;
    }
  }, [setUser]);

  const handleLogout = useCallback(async () => {
    await logout();
    setError(null);
  }, [logout]);

  return {
    user,
    isLoading: isHydrating,
    isAuthenticated: !!user,
    error,
    refresh,
    logout: handleLogout,
  };
}
