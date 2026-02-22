"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/store";

function LoadingScreen() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#FDFAF1] text-[#463028]">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#8D4A25] border-t-transparent" />
      <p className="mt-4 text-sm text-[#8d6e63]">Checking your session...</p>
    </div>
  );
}

const isPublicMobileCustomerRoute = (pathname: string) =>
  pathname === "/mobile/customer" ||
  pathname.startsWith("/mobile/customer/login") ||
  pathname.startsWith("/mobile/customer/register");

export default function MobileCustomerGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const logout = useAuthStore((state) => state.logout);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const ensureAuthenticated = async () => {
      if (isPublicMobileCustomerRoute(pathname)) {
        if (!cancelled) setChecking(false);
        return;
      }

      try {
        const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;

        if (!token) {
          await logout();
          if (!cancelled) router.replace("/mobile/customer/login");
          return;
        }

        if (!user) {
          const response = await fetch("/api/backend/auth/me", {
            headers: { Authorization: `Bearer ${token}` },
          });

          if (!response.ok) {
            await logout();
            if (!cancelled) router.replace("/mobile/customer/login");
            return;
          }

          const me = await response.json();
          if (cancelled) return;
          setUser(me);
        }
      } catch (error) {
        console.error("Mobile customer auth guard error", error);
        await logout();
        if (!cancelled) router.replace("/mobile/customer/login");
        return;
      } finally {
        if (!cancelled) setChecking(false);
      }
    };

    ensureAuthenticated();

    return () => {
      cancelled = true;
    };
  }, [pathname, router, user, setUser, logout]);

  if (!isPublicMobileCustomerRoute(pathname) && checking) {
    return <LoadingScreen />;
  }

  return <>{children}</>;
}
