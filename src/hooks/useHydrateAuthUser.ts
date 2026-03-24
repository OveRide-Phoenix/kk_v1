"use client";

import { useEffect, useState } from "react";

import { me } from "@/lib/auth";
import { useAuthStore, type AuthUser } from "@/store/store";

type UseHydrateAuthUserOptions = {
  enabled?: boolean;
  onUnauthenticated?: () => void | Promise<void>;
  onError?: (error: unknown) => void | Promise<void>;
};

let inflightAuthUserRequest: Promise<AuthUser> | null = null;

const hasAccessToken = (): boolean => {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    return Boolean(localStorage.getItem("access_token"));
  } catch {
    return false;
  }
};

export async function hydrateAuthUser(): Promise<AuthUser> {
  if (!hasAccessToken()) {
    return null;
  }

  if (!inflightAuthUserRequest) {
    inflightAuthUserRequest = me().finally(() => {
      inflightAuthUserRequest = null;
    });
  }

  return inflightAuthUserRequest;
}

export function useHydrateAuthUser(
  options: UseHydrateAuthUserOptions = {},
): { isHydrating: boolean } {
  const { enabled = true, onUnauthenticated, onError } = options;
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const [isHydrating, setIsHydrating] = useState(false);

  useEffect(() => {
    if (!enabled || user) {
      setIsHydrating(false);
      return;
    }

    if (!hasAccessToken()) {
      setIsHydrating(false);
      void onUnauthenticated?.();
      return;
    }

    let cancelled = false;
    setIsHydrating(true);

    void hydrateAuthUser()
      .then((nextUser) => {
        if (cancelled || !nextUser) {
          return;
        }
        setUser(nextUser);
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }
        void onError?.(error);
      })
      .finally(() => {
        if (!cancelled) {
          setIsHydrating(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, onError, onUnauthenticated, setUser, user]);

  return { isHydrating };
}
