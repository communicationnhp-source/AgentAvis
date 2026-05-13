import type { Request, Response } from "express";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./cookies";

export interface SimpleUser {
  id: number;
  openId: string;
  name: string | null;
  email: string | null;
  loginMethod: string | null;
  role: "user" | "admin";
  createdAt: Date;
  updatedAt: Date;
  lastSignedIn: Date;
}

export interface TrpcContext {
  user: SimpleUser | null;
  req: Request;
  res: Response;
}

export async function createSimpleContext(req: Request, res: Response): Promise<TrpcContext> {
  const sessionCookie = req.cookies[COOKIE_NAME];
  const isAuthenticated = sessionCookie === "authenticated";

  return {
    user: isAuthenticated
      ? {
          id: 1,
          openId: "simple-user",
          name: "Admin",
          email: null,
          loginMethod: "simple",
          role: "admin",
          createdAt: new Date(),
          updatedAt: new Date(),
          lastSignedIn: new Date(),
        }
      : null,
    req,
    res,
  };
}

export function registerSimpleAuthRoutes(app: any) {
  app.post("/api/auth/login", (req: Request, res: Response) => {
    const { password } = req.body;
    const adminPassword = process.env.ADMIN_PASSWORD || "admin123";

    if (password === adminPassword) {
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, "authenticated", {
        ...cookieOptions,
        maxAge: 30 * 24 * 60 * 60 * 1000,
      });
      res.json({ success: true });
    } else {
      res.status(401).json({ error: "Invalid password" });
    }
  });

  app.post("/api/auth/logout", (req: Request, res: Response) => {
    const cookieOptions = getSessionCookieOptions(req);
    res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
    res.json({ success: true });
  });
}
