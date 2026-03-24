"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/store/store";

async function fetchMe(access?: string) {
  const res = await fetch("/api/backend/auth/me", {
    headers: access ? { Authorization: `Bearer ${access}` } : {},
  });
  if (!res.ok) throw new Error("unauthorized");
  return res.json(); // { customer_id, phone, roles, role_codes, ... }
}

async function refreshAccess(refresh?: string) {
  if (!refresh) throw new Error("no refresh");
  const r = await fetch("/api/backend/auth/refresh", {
    method: "POST",
    headers: { Authorization: `Bearer ${refresh}` },
  });
  if (!r.ok) throw new Error("refresh failed");
  const { access_token } = await r.json();
  localStorage.setItem("access_token", access_token);
  return access_token;
}

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);
  const setUser = useAuthStore((s) => s.setUser);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      let redirecting = false;
      try {
        let access = localStorage.getItem("access_token") || undefined;
        let me;

        try {
          me = await fetchMe(access);
        } catch {
          // try refresh once
          const refresh = localStorage.getItem("refresh_token") || undefined;
          access = await refreshAccess(refresh);
          me = await fetchMe(access);
        }

        if (cancelled) return;
        setUser(me);

        // enforce admin-only
        const hasAdminRole = Array.isArray(me.role_codes)
          ? me.role_codes.includes("admin")
          : me.role === "admin";
        if (!hasAdminRole) {
          redirecting = true;
          router.replace("/");
          return;
        }
      } catch {
        redirecting = true;
        const next = encodeURIComponent(pathname || "/admin");
        router.replace(`/login?next=${next}`);
        return;
      } finally {
        if (!cancelled && !redirecting) setChecking(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router, pathname, setUser]);

  if (checking) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
      </div>
    );
  }

  return <>{children}</>;
}
