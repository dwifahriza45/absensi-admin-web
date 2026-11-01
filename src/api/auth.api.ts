import { request } from "./client";
export interface Admin {
  user_id: string;
  fullname: string;
  email: string;
  role: string;
}
export const authApi = {
  login: (email: string, password: string) =>
    request<{ expiresAt: string }>("/api/v1/admin/auth/login", {
      method: "POST",
      body: { email, password },
    }),
  me: () => request<Admin>("/api/v1/admin/auth/me"),
  logout: () => request<void>("/api/v1/admin/auth/logout", { method: "POST" }),
};
