import type { Request, Response } from "express";
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
  // Accepte le token soit en header Authorization, soit en cookie
  const authHeader = req.headers["authorization"] || "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  const adminPassword = process.env.ADMIN_PASSWORD || "admin123";
  const isAuthenticated = token === adminPassword;

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
      // Retourne le token (= le mot de passe) que le client stocke en localStorage
      res.json({ success: true, token: adminPassword });
    } else {
      res.status(401).json({ error: "Invalid password" });
    }
  });

  app.post("/api/auth/logout", (_req: Request, res: Response) => {
    res.json({ success: true });
  });
}
