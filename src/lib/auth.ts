import { http } from './http';

export type Me = {
  admin_id: number;
  customer_id: number;
  phone: string;
  role: 'admin' | 'manager';
  name?: string | null;
};

export async function login(phone: string, adminPassword?: string) {
  const res = await http.post('/api/login', { phone, admin_password: adminPassword });
  if (!res.ok) throw new Error(await res.text());
  return res.json(); // { message, is_admin }
}

export async function logout() {
  const res = await http.post('/auth/logout');
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function me(): Promise<Me> {
  const res = await http.get('/auth/me');
  if (!res.ok) throw new Error('Not authenticated');
  return res.json();
}
