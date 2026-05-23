"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useHydrateAuthUser } from "@/hooks/useHydrateAuthUser";
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
  const logout = useAuthStore((state) => state.logout);
  const [mounted, setMounted] = useState(false);

  const redirectToLogin = useCallback(async () => {
    await logout();
    router.replace("/mobile/customer/login");
  }, [logout, router]);

  const { isHydrating } = useHydrateAuthUser({
    enabled: !isPublicMobileCustomerRoute(pathname),
    onError: async (error) => {
      console.error("Mobile customer auth guard error", error);
      await redirectToLogin();
    },
    onUnauthenticated: redirectToLogin,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isPublicMobileCustomerRoute(pathname) && (!mounted || isHydrating || !user)) {
    return <LoadingScreen />;
  }

  return <>{children}</>;
}
