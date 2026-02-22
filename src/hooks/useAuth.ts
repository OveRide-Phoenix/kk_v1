import useSWR from 'swr';
import { me, Me } from '@/lib/auth';

export function useAuth() {
  const { data, error, isLoading, mutate } = useSWR<Me>('/auth/me', () => me(), {
    revalidateOnFocus: false,
  });
  return {
    user: data,
    isLoading,
    isAuthenticated: !!data,
    error,
    refresh: () => mutate(),
    logout: async () => { await (await fetch('/api/backend/auth/logout', { method: 'POST', credentials: 'include' })).json(); await mutate(undefined, { revalidate: false }); },
  };
}
