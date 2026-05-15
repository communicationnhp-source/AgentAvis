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
  if (
    req.path === "/api/health" ||
    req.path.startsWith("/api/scheduled") ||
    req.path.startsWith("/api/debug")
  ) {
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

function startCron(port: number) {
  const interval = 15 * 60 * 1000; // 15 minutes

  const run = async () => {
    console.log(`[Cron] Auto-processing reviews at ${new Date().toISOString()}`);
    try {
      const res = await fetch(`http://localhost:${port}/api/scheduled/process-reviews`, {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.CRON_SECRET || ""}` },
      });
      const data = await res.json();
      console.log("[Cron] Done:", JSON.stringify(data.summary));
    } catch (e) {
      console.error("[Cron] Failed:", e);
    }
  };

  // Premier run 1 minute après le démarrage, puis toutes les 15 min
  setTimeout(() => {
    run();
    setInterval(run, interval);
  }, 60 * 1000);

  console.log("[Cron] Scheduled — runs every 15 minutes");
}

async function startServer() {
  await runMigrations();

  const app = express();
  app.set("trust proxy", 1);

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  app.use(cookieParser());
  app.use(basicAuth);

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, timestamp: new Date().toISOString() });
  });

  app.get("/api/debug/google", async (_req, res) => {
    try {
      const { getGoogleCredentialsByUserId } = await import("../db");
      const { getAccessToken } = await import("../google-api");

      const creds = await getGoogleCredentialsByUserId(1);
      if (!creds) return res.json({ error: "No credentials found in DB" });

      const token = await getAccessToken({
        clientId: creds.clientId,
        clientSecret: creds.clientSecret,
        refreshToken: creds.refreshToken,
      });

      const url = `https://mybusinessreviews.googleapis.com/v1/${creds.businessProfileId}/reviews`;
      console.log("[Debug] Fetching:", url);

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const text = await response.text();
      res.json({ url, status: response.status, body: text });
    } catch (error) {
      res.json({ error: error instanceof Error ? error.message : String(error) });
    }
  });

  app.get("/api/debug/trustedshop", async (_req, res) => {
    try {
      const { getTrustedshopCredentialsByUserId } = await import("../db");
      const { TrustedShopAPI } = await import("../trustedshop-api");

      const creds = await getTrustedshopCredentialsByUserId(1);
      if (!creds) return res.json({ error: "No TrustedShop credentials found in DB" });

      const api = new TrustedShopAPI(creds.clientId, creds.clientSecret, creds.channelId);
      const reviews = await api.fetchReviews(10);

      res.json({
        credentialsFound: true,
        channelId: creds.channelId,
        reviewCount: reviews.length,
        firstReview: reviews[0] || null,
      });
    } catch (error) {
      res.json({ error: error instanceof Error ? error.message : String(error) });
    }
  });

  app.post("/api/scheduled/process-reviews", handleProcessReviews);

  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext: (opts) => createSimpleContext(opts.req, opts.res),
    })
  );

  const port = parseInt(process.env.PORT || "3000");
  const server = createServer(app);

  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  server.listen(port, "0.0.0.0", () => {
    console.log(`🚀 Server running on http://0.0.0.0:${port}/`);
    console.log(`   Health:  GET  /api/health`);
    console.log(`   Debug:   GET  /api/debug/google`);
    console.log(`   Cron:    POST /api/scheduled/process-reviews`);
    startCron(port);
  });
}

startServer().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
