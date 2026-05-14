import "dotenv/config";
import express from "express";
import cookieParser from "cookie-parser";
import { createServer } from "http";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createSimpleContext } from "./context-simple";
import { serveStatic, setupVite } from "./vite";
import { handleProcessReviews } from "../scheduled-handlers";

async function runMigrations() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.warn("[DB] DATABASE_URL not set — skipping migrations");
    return;
  }
  try {
    console.log("[DB] Running migrations...");
    const { drizzle } = await import("drizzle-orm/mysql2");
    const { migrate } = await import("drizzle-orm/mysql2/migrator");
    const db = drizzle(databaseUrl);
    await migrate(db, { migrationsFolder: "./drizzle" });
    console.log("[DB] Migrations complete ✅");
  } catch (error) {
    console.warn("[DB] Migration warning:", error);
  }
}

function basicAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  // Pas d'auth sur le health check et le cron
  if (req.path === "/api/health" || req.path.startsWith("/api/scheduled")) {
    return next();
  }

  const adminPassword = process.env.ADMIN_PASSWORD || "admin123";
  const authHeader = req.headers["authorization"] || "";

  if (authHeader.startsWith("Basic ")) {
    const base64 = authHeader.slice(6);
    const decoded = Buffer.from(base64, "base64").toString("utf-8");
    const [, password] = decoded.split(":");
    if (password === adminPassword) {
      return next();
    }
  }

  res.setHeader("WWW-Authenticate", 'Basic realm="Agent Avis"');
  res.status(401).send("Accès refusé");
}

async function startServer() {
  await runMigrations();

  const app = express();
  app.set("trust proxy", 1);

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  app.use(cookieParser());

  // Basic Auth sur tout
  app.use(basicAuth);

  // Health check
  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, timestamp: new Date().toISOString() });
  });

  // Cron
  app.post("/api/scheduled/process-reviews", handleProcessReviews);

  // tRPC — user toujours authentifié si on arrive ici
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext: (opts) => createSimpleContext(opts.req, opts.res),
    })
  );

  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const port = parseInt(process.env.PORT || "3000");
  const server = createServer(app);

  server.listen(port, "0.0.0.0", () => {
    console.log(`🚀 Server running on http://0.0.0.0:${port}/`);
  });
}

startServer().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
