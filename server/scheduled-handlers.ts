import { Request, Response } from "express";
import { processAllReviews } from "./review-processor";
import { processTrustedShopReviews } from "./trustedshop-processor";
import { getDb } from "./db";
import { users } from "../drizzle/schema";
import { eq } from "drizzle-orm";

export async function handleProcessReviews(req: Request, res: Response) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = req.headers["authorization"] || "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (token !== cronSecret) {
      return res.status(403).json({ error: "Forbidden: invalid cron secret" });
    }
  } else {
    console.warn("[Scheduled Handler] ⚠️  CRON_SECRET not set — endpoint is unprotected!");
  }

  console.log(`[Scheduled Handler] Processing reviews triggered at ${new Date().toISOString()}`);

  try {
    // Google reviews
    const googleResults = await processAllReviews();

    // TrustedShop — pour chaque admin
    const db = await getDb();
    const tsResults: any[] = [];
    if (db) {
      const adminUsers = await db.select().from(users).where(eq(users.role, "admin"));
      for (const user of adminUsers) {
        try {
          const result = await processTrustedShopReviews(user.id);
          tsResults.push(result);
        } catch (error) {
          tsResults.push({ userId: user.id, processed: 0, failed: 1, errors: [String(error)] });
        }
      }
    }

    const totalProcessed = googleResults.reduce((sum, r) => sum + r.processed, 0)
      + tsResults.reduce((sum, r) => sum + r.processed, 0);
    const totalFailed = googleResults.reduce((sum, r) => sum + r.failed, 0)
      + tsResults.reduce((sum, r) => sum + r.failed, 0);
    const allErrors = [
      ...googleResults.flatMap((r) => r.errors),
      ...tsResults.flatMap((r) => r.errors),
    ];

    console.log(`[Scheduled Handler] Done: ${totalProcessed} processed, ${totalFailed} failed`);

    res.json({
      ok: true,
      timestamp: new Date().toISOString(),
      summary: {
        totalProcessed,
        totalFailed,
        usersProcessed: googleResults.length + tsResults.length,
      },
      errors: allErrors.length > 0 ? allErrors : undefined,
    });
  } catch (error) {
    console.error("[Scheduled Handler] Error:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
