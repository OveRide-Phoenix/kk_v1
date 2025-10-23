const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? '/api/backend'; // Option A default

const isBrowser = typeof window !== 'undefined';

function readAccessToken(): string | null {
  if (!isBrowser) return null;
  try {
    return localStorage.getItem('access_token');
  } catch {
    return null;
  }
}

async function request(path: string, init?: RequestInit) {
  const headers = new Headers({
    'Content-Type': 'application/json',
  });

  if (init?.headers) {
    const provided = new Headers(init.headers);
    provided.forEach((value, key) => {
      headers.set(key, value);
    });
  }

  if (!headers.has('Authorization')) {
    const token = readAccessToken();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',       // ⬅️ important for cookies
    headers,
    ...init,
  });
  // Optional: handle 401 with auto-refresh
  if (res.status === 401) {
    // try refresh once
    const r = await fetch(`${API_BASE}/auth/refresh`, { method: 'POST', credentials: 'include' });
    if (r.ok) {
      return fetch(`${API_BASE}${path}`, { credentials: 'include', ...init });
    }
  }
  return res;
}

export const http = {
  get: (p: string) => request(p, { method: 'GET' }),
  post: <T extends Record<string, unknown>>(p: string, body?: T) => request(p, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
};
