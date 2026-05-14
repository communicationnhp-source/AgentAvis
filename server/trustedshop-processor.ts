import { getTrustedshopCredentialsByUserId, getDb } from "./db";
import { TrustedShopAPI } from "./trustedshop-api";
import { invokeLLM } from "./_core/llm";
import { trustedshopReviews, trustedshopResponses } from "../drizzle/schema";
import { eq } from "drizzle-orm";

interface ProcessingResult {
  userId: number;
  processed: number;
  failed: number;
  errors: string[];
}

function getToneByRating(rating: number): string {
  if (rating >= 5) return "reconnaissant, enthousiaste et chaleureux";
  if (rating >= 4) return "appréciatif et professionnel";
  if (rating >= 3) return "constructif, empathique et orienté solutions";
  return "désolé, empathique et orienté actions correctives";
}

async function generateResponse(rating: number, comment: string): Promise<string> {
  const tone = getToneByRating(rating);
  const result = await invokeLLM({
    messages: [
      {
        role: "user",
        content: `Tu es un professionnel qui répond aux avis clients TrustedShop de manière authentique.
Ton ton doit être ${tone}.
Garde les réponses concises (2-3 phrases maximum).
Ne mentionne jamais le prénom ou le nom du client dans ta réponse.
Réponds dans la même langue que l'avis.
Ne génère que le texte de la réponse, rien d'autre.

Génère une réponse à cet avis :
Note : ${rating}/5 étoiles
Avis : "${comment}"`,
      },
    ],
  });
  return result.choices[0].message.content.trim();
}

export async function processTrustedShopReviews(userId: number): Promise<ProcessingResult> {
  const result: ProcessingResult = { userId, processed: 0, failed: 0, errors: [] };

  const creds = await getTrustedshopCredentialsByUserId(userId);
  if (!creds) {
    result.errors.push("No TrustedShop credentials configured");
    return result;
  }

  const db = await getDb();
  if (!db) {
    result.errors.push("Database not available");
    return result;
  }

  const api = new TrustedShopAPI(creds.clientId, creds.clientSecret, creds.channelId);

  let reviews: any[];
  try {
    reviews = await api.fetchReviews(50);
  } catch (error) {
    result.errors.push(`Failed to fetch reviews: ${error instanceof Error ? error.message : String(error)}`);
    return result;
  }

  for (const review of reviews) {
    try {
      const comment = review.comment || "";
      const authorName = review.customer?.fullName || "Client";
      const rating = review.rating || 3;

      // Vérifier si on a déjà une réponse pour cet avis
      const existing = await db
        .select()
        .from(trustedshopReviews)
        .where(eq(trustedshopReviews.trustedshopReviewId, review.id))
        .limit(1);

      if (existing.length > 0 && existing[0].hasResponse) {
        console.log(`[TS Processor] Review ${review.id} already has a response, skipping`);
        continue;
      }

      // Sauvegarder l'avis
      await db
        .insert(trustedshopReviews)
        .values({
          userId,
          trustedshopReviewId: review.id,
          authorName,
          rating,
          reviewText: comment,
          reviewDate: new Date(review.createdAt),
          hasResponse: false,
        })
        .onDuplicateKeyUpdate({ set: { updatedAt: new Date() } });

      const [storedReview] = await db
        .select()
        .from(trustedshopReviews)
        .where(eq(trustedshopReviews.trustedshopReviewId, review.id))
        .limit(1);

      if (!storedReview) throw new Error("Failed to store review");

      // Générer la réponse
      const responseText = await generateResponse(rating, comment);

      // Sauvegarder la réponse
      await db.insert(trustedshopResponses).values({
        userId,
        reviewId: storedReview.id,
        responseText,
        status: "draft",
      });

      result.processed++;
      console.log(`[TS Processor] Generated response for review ${review.id}`);
    } catch (error) {
      result.failed++;
      result.errors.push(`Error processing review ${review.id}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return result;
}
