import type { Request, Response } from "express";

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
  user: SimpleUser;
  req: Request;
  res: Response;
}

// Si on arrive ici, Basic Auth a déjà validé l'accès
export async function createSimpleContext(req: Request, res: Response): Promise<TrpcContext> {
  return {
    user: {
      id: 1,
      openId: "simple-user",
      name: "Admin",
      email: null,
      loginMethod: "basic",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req,
    res,
  };
}

export function registerSimpleAuthRoutes(_app: any) {
  // Plus besoin — Basic Auth gère tout
}
