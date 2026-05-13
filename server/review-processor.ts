import { getGoogleCredentialsByUserId, getReviewsWithoutResponse, upsertReview, createResponse, updateResponseStatus, markReviewAsResponded } from "./db";
import { getAccessToken, fetchReviews, postReply, generateReviewResponse } from "./google-api";
import { invokeLLM } from "./_core/llm";
import { notifyOwner } from "./_core/notification";
import type { Review, InsertReview } from "../drizzle/schema";

interface ProcessingResult {
  userId: number;
  processed: number;
  published: number;
  failed: number;
  errors: string[];
}

/**
 * Main function to process reviews for a specific user
 */
export async function processReviewsForUser(userId: number): Promise<ProcessingResult> {
  const result: ProcessingResult = {
    userId,
    processed: 0,
    published: 0,
    failed: 0,
    errors: [],
  };

  try {
    // Get user's Google credentials
    const credentials = await getGoogleCredentialsByUserId(userId);
    if (!credentials) {
      result.errors.push("No Google credentials configured for this user");
      return result;
    }

    // Get access token
    let accessToken: string;
    try {
      accessToken = await getAccessToken({
        clientId: credentials.clientId,
        clientSecret: credentials.clientSecret,
        refreshToken: credentials.refreshToken,
      });
    } catch (error) {
      result.errors.push(`Failed to authenticate: ${error instanceof Error ? error.message : "Unknown error"}`);
      return result;
    }

    // Fetch reviews from Google API
    let googleReviews: any[];
    try {
      googleReviews = await fetchReviews(accessToken, credentials.businessProfileId);
    } catch (error) {
      result.errors.push(`Failed to fetch reviews: ${error instanceof Error ? error.message : "Unknown error"}`);
      return result;
    }

    // Process each review
    for (const googleReview of googleReviews) {
      try {
        // Skip if already has a reply
        if (googleReview.reply) {
          console.log(`[Review Processor] Review ${googleReview.name} already has a reply, skipping`);
          continue;
        }

        result.processed++;

        // Extract review data
        const reviewData: InsertReview = {
          userId,
          googleReviewId: googleReview.name,
          authorName: googleReview.reviewer?.displayName || "Anonymous",
          rating: googleReview.reviewRating?.ratingValue || 5,
          reviewText: googleReview.reviewText || "",
          reviewDate: new Date(googleReview.reviewCreateTime),
          hasResponse: false,
        };

        // Upsert review in database
        const storedReview = await upsertReview(reviewData);
        if (!storedReview) {
          throw new Error("Failed to store review");
        }

        // Generate response using LLM
        let responseText: string;
        try {
          responseText = await generateReviewResponse(
            reviewData.rating,
            reviewData.reviewText,
            reviewData.authorName,
            invokeLLM
          );
        } catch (error) {
          throw new Error(`Failed to generate response: ${error instanceof Error ? error.message : "Unknown error"}`);
        }

        // Create response record in database (draft status)
        const responseRecord = await createResponse({
          userId,
          reviewId: storedReview.id,
          responseText,
          status: "draft",
        });

        if (!responseRecord) {
          throw new Error("Failed to create response record");
        }

        // Post reply to Google API
        try {
          await postReply(accessToken, credentials.businessProfileId, googleReview.name, responseText);

          // Update response status to published
          await updateResponseStatus(responseRecord.id, "published");
          await markReviewAsResponded(storedReview.id);

          result.published++;

          // Notify owner
          try {
            await notifyOwner({
              title: "Réponse publiée ✅",
              content: `Une réponse a été publiée à l'avis de ${reviewData.authorName} (${reviewData.rating}⭐)\n\nAvis: "${reviewData.reviewText.substring(0, 100)}..."\n\nRéponse: "${responseText.substring(0, 100)}..."`,
            });
          } catch (notifyError) {
            console.warn("[Review Processor] Failed to send notification:", notifyError);
          }
        } catch (error) {
          // Update response status to failed
          const errorMessage = error instanceof Error ? error.message : "Unknown error";
          await updateResponseStatus(responseRecord.id, "failed", errorMessage);
          result.failed++;
          result.errors.push(`Failed to post reply for review ${googleReview.name}: ${errorMessage}`);
        }
      } catch (error) {
        result.failed++;
        result.errors.push(`Error processing review: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    }
  } catch (error) {
    result.errors.push(`Unexpected error in processReviewsForUser: ${error instanceof Error ? error.message : "Unknown error"}`);
  }

  return result;
}

/**
 * Process reviews for all active users
 */
export async function processAllReviews(): Promise<ProcessingResult[]> {
  const results: ProcessingResult[] = [];

  // Get all users from database
  const { getDb } = await import("./db");
  const db = await getDb();

  if (!db) {
    console.error("[Review Processor] Database not available");
    return results;
  }

  try {
    // Get all users with active Google credentials
    const { googleCredentials } = await import("../drizzle/schema");
    const { eq } = await import("drizzle-orm");

    const activeCredentials = await db
      .select()
      .from(googleCredentials)
      .where(eq(googleCredentials.isActive, true));

    // Process reviews for each user
    for (const credential of activeCredentials) {
      const result = await processReviewsForUser(credential.userId);
      results.push(result);

      console.log(`[Review Processor] Processed ${result.processed} reviews for user ${credential.userId}: ${result.published} published, ${result.failed} failed`);
    }
  } catch (error) {
    console.error("[Review Processor] Error in processAllReviews:", error);
  }

  return results;
}
