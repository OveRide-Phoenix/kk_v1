import { http } from "./http";

export type RoleSummary = {
  role_id: number;
  code: string;
  name: string;
  description?: string | null;
  is_system?: boolean;
};

export type Me = {
  customer_id: number;
  phone: string;
  name?: string | null;
  city_code?: string;
  eligible_city_codes?: string[];
  roles: number[];
  role_codes: string[];
  role_details?: RoleSummary[];
  admin_id?: number;
  admin_is_active?: boolean;
  is_admin?: boolean;
};

export interface LoginResponse {
  message: string;
  is_admin: boolean;
  is_admin_account: boolean;
  user: Me;
  access_token: string;
  refresh_token: string;
  role_codes: string[];
  role_details: RoleSummary[];
}

export async function login(phone: string, adminPassword?: string): Promise<LoginResponse> {
  const res = await http.post("/api/login", { phone, admin_password: adminPassword });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function logout() {
  const res = await http.post("/auth/logout");
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function me(): Promise<Me> {
  const res = await http.get("/auth/me");
  if (!res.ok) throw new Error("Not authenticated");
  return res.json();
}
