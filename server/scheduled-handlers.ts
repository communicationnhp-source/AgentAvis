import { Request, Response } from "express";
import { processAllReviews } from "./review-processor";

/**
 * Handler pour le traitement planifié des avis.
 * Appelé par le Railway Cron Service (ou n'importe quel scheduler HTTP).
 *
 * Sécurisé par un secret partagé (CRON_SECRET) passé dans le header
 * Authorization: Bearer <CRON_SECRET>
 */
export async function handleProcessReviews(req: Request, res: Response) {
  // Vérification du secret cron
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = req.headers["authorization"] || "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (token !== cronSecret) {
      return res.status(403).json({ error: "Forbidden: invalid cron secret" });
    }
  } else {
    // Pas de secret configuré : avertissement mais on continue
    // (utile en dev, mais à configurer en prod !)
    console.warn("[Scheduled Handler] ⚠️  CRON_SECRET not set — endpoint is unprotected!");
  }

  console.log(`[Scheduled Handler] Processing reviews triggered at ${new Date().toISOString()}`);

  try {
    const results = await processAllReviews();

    const totalProcessed = results.reduce((sum, r) => sum + r.processed, 0);
    const totalPublished = results.reduce((sum, r) => sum + r.published, 0);
    const totalFailed = results.reduce((sum, r) => sum + r.failed, 0);
    const allErrors = results.flatMap((r) => r.errors);

    console.log(
      `[Scheduled Handler] Done: ${totalProcessed} processed, ${totalPublished} published, ${totalFailed} failed`
    );

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
    });
  }
}
