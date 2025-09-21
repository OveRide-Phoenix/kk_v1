"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/store/store";

async function fetchMe(access?: string) {
  const res = await fetch("/api/backend/auth/me", {
    headers: access ? { Authorization: `Bearer ${access}` } : {},
  });
  if (!res.ok) throw new Error("unauthorized");
  return res.json(); // { admin_id, customer_id, phone, role }
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
  const setAdmin = useAuthStore((s) => s.setAdmin);
  const setUser = useAuthStore((s) => s.setUser);

  useEffect(() => {
    let cancelled = false;

    (async () => {
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
        setAdmin(me.role === "admin");
        setUser(me);

        // enforce admin-only
        if (me.role !== "admin") {
          router.replace("/");
          return;
        }
      } catch {
        const next = encodeURIComponent(pathname || "/admin");
        router.replace(`/login?next=${next}`);
        return;
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();

    return () => { cancelled = true; };
  }, [router, pathname, setAdmin, setUser]);

  if (checking) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
      </div>
    );
  }

  return <>{children}</>;
}
