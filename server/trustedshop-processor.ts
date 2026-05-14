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

async function generateResponse(rating: number, comment: string, authorName: string): Promise<string> {
  const tone = getToneByRating(rating);
  const result = await invokeLLM({
    messages: [
      {
        role: "user",
        content: `Tu es un professionnel qui répond aux avis clients TrustedShop de manière authentique.
Ton ton doit être ${tone}.
Garde les réponses concises (2-3 phrases maximum).
Remercie le client par son prénom si disponible.
Réponds dans la même langue que l'avis.
Ne génère que le texte de la réponse, rien d'autre.

Génère une réponse à cet avis :
Note : ${rating}/5 étoiles
Auteur : ${authorName}
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
    result.error
