import { Request, Response } from "express";
import { processAllReviews } from "./review-processor";
import { sdk } from "./_core/sdk";

/**
 * Handler for the scheduled review processing task
 * Runs every 10 minutes to fetch and respond to new reviews
 */
export async function handleProcessReviews(req: Request, res: Response) {
  try {
    // Authenticate as cron task
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron || !user.taskUid) {
      return res.status(403).json({ error: "cron-only" });
    }

    console.log(`[Scheduled Handler] Processing reviews triggered by cron task ${user.taskUid}`);

    // Process all reviews
    const results = await processAllReviews();

    // Calculate totals
    const totalProcessed = results.reduce((sum, r) => sum + r.processed, 0);
    const totalPublished = results.reduce((sum, r) => sum + r.published, 0);
    const totalFailed = results.reduce((sum, r) => sum + r.failed, 0);
    const allErrors = results.flatMap((r) => r.errors);

    console.log(`[Scheduled Handler] Summary: ${totalProcessed} processed, ${totalPublished} published, ${totalFailed} failed`);

    res.json({
      ok: true,
      timestamp: new Date().toISOString(),
      summary: {
        totalProcessed,
        totalPublished,
        totalFailed,
        usersProcessed: results.length,
      },
      errors: allErrors.length > 0 ? allErrors : undefined,
    });
  } catch (error) {
    console.error("[Scheduled Handler] Error:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      context: {
        url: req.url,
        timestamp: new Date().toISOString(),
      },
    });
  }
}
