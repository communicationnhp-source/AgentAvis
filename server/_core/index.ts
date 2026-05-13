import "dotenv/config";
import express from "express";
import cookieParser from "cookie-parser";
import { createServer } from "http";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createSimpleContext, registerSimpleAuthRoutes } from "./context-simple";
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
    // Non-fatal: log and continue (tables may already exist)
    console.warn("[DB] Migration warning (may already be up to date):", error);
  }
}

async function startServer() {
  // Appliquer les migrations avant de démarrer
  await runMigrations();

  const app = express();
  app.set("trust proxy", 1);
  app.use((req, res, next) => {
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});
  const server = createServer(app);

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  app.use(cookieParser());

  registerSimpleAuthRoutes(app);
  registerStorageProxy(app);

  // Endpoint cron (appelé par Railway Cron Service)
  app.post("/api/scheduled/process-reviews", handleProcessReviews);

  // Health check pour Railway
  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, timestamp: new Date().toISOString() });
  });

  // tRPC API
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

  server.listen(port, "0.0.0.0", () => {
    console.log(`🚀 Server running on http://0.0.0.0:${port}/`);
    console.log(`   Cron endpoint: POST /api/scheduled/process-reviews`);
    console.log(`   Health check:  GET  /api/health`);
  });
}

startServer().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
