"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/store";

interface DeveloperGuardProps {
  children: React.ReactNode;
}

export default function DeveloperGuard({ children }: DeveloperGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const roleCodes = useAuthStore((state) => state.roleCodes);
  const user = useAuthStore((state) => state.user);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const hasDeveloperRole = roleCodes.includes("developer");

    if (hasDeveloperRole) {
      setChecking(false);
      return;
    }

    if (user) {
      // Authenticated but lacking the developer role → send back to admin home.
      router.replace("/admin");
    } else if (pathname !== "/admin") {
      // Fallback: if we somehow reached here without a user, return to admin dashboard.
      router.replace("/admin");
    }
  }, [roleCodes, user, router, pathname]);

  if (checking) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
      </div>
    );
  }

  return <>{children}</>;
}
