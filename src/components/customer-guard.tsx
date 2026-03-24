"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useHydrateAuthUser } from "@/hooks/useHydrateAuthUser";
import { useAuthStore } from "@/store/store";

function LoadingScreen() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-brand-shell text-[#463028]">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      <p className="mt-4 text-sm text-[#8d6e63]">Checking your session…</p>
    </div>
  );
}

export default function CustomerGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const [mounted, setMounted] = useState(false);

  const redirectToLogin = useCallback(async () => {
    await logout();
    const next = encodeURIComponent(pathname || "/customer-v2/home");
    router.replace(`/login?next=${next}`);
  }, [logout, pathname, router]);

  const { isHydrating } = useHydrateAuthUser({
    onError: async (error) => {
      console.error("Customer auth guard error", error);
      await redirectToLogin();
    },
    onUnauthenticated: redirectToLogin,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        sessionStorage.removeItem("kk-switching-to-customer");
      } catch {
        /* ignore storage errors */
      }
    }
  }, []);

  if (!mounted || isHydrating || !user) {
    return <LoadingScreen />;
  }

  return <>{children}</>;
}
