import axios from "axios";

// Google Business Profile API v1 (la v4 mybusiness est dépréciée depuis 2022)
const GOOGLE_OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_ACCOUNT_API = "https://mybusinessaccountmanagement.googleapis.com/v1";
const GOOGLE_REVIEWS_API = "https://mybusinessreviews.googleapis.com/v1";
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

interface GoogleCredentials {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}

interface AccessTokenResponse {
  access_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
}

interface GoogleReview {
  name: string;
  reviewer: {
    displayName: string;
    profilePhotoUrl?: string;
  };
  comment: string;       // v1 uses "comment" not "reviewText"
  starRating: string;    // v1 uses string enum: ONE/TWO/THREE/FOUR/FIVE
  createTime: string;    // v1 uses "createTime" not "reviewCreateTime"
  reply?: {
    comment: string;
    updateTime: string;
  };
}

interface GoogleReviewsResponse {
  reviews: GoogleReview[];
  nextPageToken?: string;
  totalReviewCount?: number;
}

// Convert star rating enum to number
function starRatingToNumber(starRating: string): number {
  const map: Record<string, number> = {
    ONE: 1,
    TWO: 2,
    THREE: 3,
    FOUR: 4,
    FIVE: 5,
  };
  return map[starRating] ?? 3;
}

/**
 * Retry helper with exponential backoff
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = MAX_RETRIES,
  delayMs: number = RETRY_DELAY_MS
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry on 4xx errors (except 429)
      if (axios.isAxiosError(error) && error.response?.status && error.response.status >= 400 && error.response.status !== 429) {
        throw error;
      }

      if (attempt < maxRetries - 1) {
        const delay = delayMs * Math.pow(2, attempt);
        console.log(`[Google API] Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error("Max retries exceeded");
}

/**
 * Get a fresh access token using the refresh token
 */
export async function getAccessToken(credentials: GoogleCredentials): Promise<string> {
  return withRetry(async () => {
    const response = await axios.post<AccessTokenResponse>(GOOGLE_OAUTH_TOKEN_URL, {
      client_id: credentials.clientId,
      client_secret: credentials.clientSecret,
      refresh_token: credentials.refreshToken,
      grant_type: "refresh_token",
    });

    return response.data.access_token;
  });
}

/**
 * Fetch reviews from Google Business Profile API v1
 * businessProfileId format: "accounts/ACCOUNT_ID/locations/LOCATION_ID"
 */
export async function fetchReviews(
  accessToken: string,
  businessProfileId: string,
  pageSize: number = 50
): Promise<ReturnType<typeof normalizeReview>[]> {
  return withRetry(async () => {
    const url = `${GOOGLE_REVIEWS_API}/${businessProfileId}/reviews`;

    const response = await axios.get<GoogleReviewsResponse>(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      params: {
        pageSize,
        orderBy: "updateTime desc",
      },
    });

    const reviews = response.data.reviews || [];
    return reviews.map(normalizeReview);
  });
}

/**
 * Normalize Google v1 review to a consistent internal format
 */
function normalizeReview(review: GoogleReview) {
  return {
    name: review.name,
    reviewer: review.reviewer,
    reviewText: review.comment || "",
    reviewRating: {
      ratingValue: starRatingToNumber(review.starRating),
    },
    reviewCreateTime: review.createTime,
    reply: review.reply ? { text: review.reply.comment } : undefined,
  };
}

/**
 * Post a reply to a review via Google Business Profile API v1
 */
export async function postReply(
  accessToken: string,
  businessProfileId: string,
  reviewName: string,
  replyText: string
): Promise<{ success: boolean; googleResponseId?: string }> {
  return withRetry(async () => {
    // reviewName is already the full resource name e.g. "accounts/123/locations/456/reviews/abc"
    const url = `${GOOGLE_REVIEWS_API}/${reviewName}/reply`;

    await axios.put(
      url,
      { comment: replyText },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    return {
      success: true,
      googleResponseId: reviewName,
    };
  });
}

/**
 * Generate a personalized response based on review rating and text
 */
export async function generateReviewResponse(
  reviewRating: number,
  reviewText: string,
  authorName: string,
  invokeLLM: (params: any) => Promise<any>
): Promise<string> {
  const tone = getToneByRating(reviewRating);

  const systemPrompt = `Tu es un professionnel qui répond aux avis clients Google de manière authentique et personnelle.
Ton ton doit être ${tone}.
Garde les réponses concises (2-3 phrases maximum).
Remercie toujours le client par son prénom si disponible.
Réponds dans la même langue que l'avis.
Ne génère que le texte de la réponse, rien d'autre.`;

  const userPrompt = `Génère une réponse à cet avis :
Note : ${reviewRating}/5 étoiles
Auteur : ${authorName}
Avis : "${reviewText}"`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "user", content: systemPrompt + "\n\n" + userPrompt },
      ],
    });

    const responseText = response.content?.[0]?.text || "";
    return responseText.trim();
  } catch (error) {
    console.error("[LLM] Failed to generate response:", error);
    throw new Error("Failed to generate response with LLM");
  }
}

/**
 * Determine tone based on review rating
 */
function getToneByRating(rating: number): string {
  if (rating >= 5) {
    return "reconnaissant, enthousiaste et chaleureux";
  } else if (rating >= 4) {
    return "appréciatif et professionnel";
  } else if (rating >= 3) {
    return "constructif, empathique et orienté solutions";
  } else {
    return "désolé, empathique et orienté actions";
  }
}
