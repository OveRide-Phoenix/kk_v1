const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "/api/backend"; // Option A default

const isBrowser = typeof window !== "undefined";

function readAccessToken(): string | null {
  if (!isBrowser) return null;
  try {
    return localStorage.getItem("access_token");
  } catch {
    return null;
  }
}

async function request(path: string, init?: RequestInit) {
  const headers = new Headers({
    "Content-Type": "application/json",
  });

  if (init?.headers) {
    const provided = new Headers(init.headers);
    provided.forEach((value, key) => {
      headers.set(key, value);
    });
  }

  if (!headers.has("Authorization")) {
    const token = readAccessToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include", // ⬅️ important for cookies
    headers,
    ...init,
  });
  // On 401: attempt a silent token refresh, then retry the original request once.
  if (res.status === 401) {
    const r = await fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      credentials: "include", // sends the refresh_token HTTP-only cookie
    });
    if (r.ok) {
      // Persist the new tokens in localStorage so components that read
      // localStorage directly (and the Authorization header injected above)
      // stay in sync with the freshly-rotated cookies.
      try {
        const tokens = await r.clone().json();
        if (tokens?.access_token) {
          localStorage.setItem("access_token", tokens.access_token);
        }
        if (tokens?.refresh_token) {
          localStorage.setItem("refresh_token", tokens.refresh_token);
        }
      } catch {
        // ignore parse errors — cookie-based auth still works
      }
      // Retry original request; updated Authorization header picks up new token.
      const retryHeaders = new Headers(headers);
      const newToken = localStorage.getItem("access_token");
      if (newToken) retryHeaders.set("Authorization", `Bearer ${newToken}`);
      return fetch(`${API_BASE}${path}`, {
        credentials: "include",
        ...init,
        headers: retryHeaders,
      });
    }
  }
  return res;
}

export const http = {
  get: (p: string) => request(p, { method: "GET" }),
  post: <T extends Record<string, unknown>>(p: string, body?: T) =>
    request(p, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    }),
  put: <T extends Record<string, unknown>>(p: string, body?: T) =>
    request(p, {
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    }),
  patch: <T extends Record<string, unknown>>(p: string, body?: T) =>
    request(p, {
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
    }),
  delete: (p: string) => request(p, { method: "DELETE" }),
};
