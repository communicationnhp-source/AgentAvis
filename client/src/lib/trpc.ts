import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "../../../server/routers";
export const trpc = createTRPCReact<AppRouter>();

export function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem("auth_token");
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}
