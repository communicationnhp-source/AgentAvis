import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "../../../server/routers";
export const trpc = createTRPCReact<AppRouter>();

export function getAuthHeaders(): Record<string, string> {
  const password = sessionStorage.getItem("auth_password");
  if (!password) return {};
  return { Authorization: `Basic ${btoa("admin:" + password)}` };
}

export function savePassword(password: string) {
  sessionStorage.setItem("auth_password", password);
}

export function clearPassword() {
  sessionStorage.removeItem("auth_password");
}
