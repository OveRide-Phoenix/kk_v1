"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/store/store";

/** Decode JWT payload without verifying signature (client-side only). */
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const part = token.split(".")[1];
    return JSON.parse(atob(part.replace(/-/g, "+").replace(/_/g, "/")));
  } catch {
    return null;
  }
}

function isTokenExpired(token: string): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload) return true;
  const exp = payload.exp as number | undefined;
  return !exp || Date.now() / 1000 > exp;
}

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);
  const setUser = useAuthStore((s) => s.setUser);
  const roleCodes = useAuthStore((s) => s.roleCodes);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const access = localStorage.getItem("access_token") ?? "";

      // Fast path: valid token + store already confirms admin — no network call.
      if (access && !isTokenExpired(access) && roleCodes.includes("admin")) {
        if (!cancelled) setChecking(false);
        return;
      }

      try {
        let validToken = access;

        // Access token missing or expired — attempt a silent refresh.
        if (!access || isTokenExpired(access)) {
          const refresh = localStorage.getItem("refresh_token") ?? "";
          if (!refresh) throw new Error("no refresh token");

          const r = await fetch("/api/backend/auth/refresh", {
            method: "POST",
            headers: { Authorization: `Bearer ${refresh}` },
          });
          if (!r.ok) throw new Error("refresh failed");
          const data = await r.json();
          localStorage.setItem("access_token", data.access_token);
          if (data.refresh_token) localStorage.setItem("refresh_token", data.refresh_token);
          validToken = data.access_token;
        }

        // Decode refreshed token to verify role without a backend call.
        const decoded = decodeJwtPayload(validToken);
        if (!decoded) throw new Error("invalid token");
        const sub = decoded.sub as Record<string, unknown>;
        const codes = Array.isArray(sub.role_codes) ? (sub.role_codes as string[]) : [];
        const hasAdmin = codes.includes("admin") || sub.role === "admin";

        if (!hasAdmin) {
          if (!cancelled) router.replace("/");
          return;
        }

        // Sync store after a refresh so the rest of the app has up-to-date user info.
        if (!roleCodes.includes("admin")) {
          setUser(sub as Parameters<typeof setUser>[0]);
        }

        if (!cancelled) setChecking(false);
      } catch {
        if (!cancelled) {
          router.replace(`/login-v2?next=${encodeURIComponent(pathname ?? "/admin")}`);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // pathname re-runs the cheap fast-path check on each client-side navigation
    // so an expired token is caught even without a hard refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  if (checking) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
      </div>
    );
  }

  return <>{children}</>;
}
