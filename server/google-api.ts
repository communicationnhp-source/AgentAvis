import axios from "axios";

const GOOGLE_OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_API_BASE_URL = "https://mybusiness.googleapis.com/v4";
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
  reviewText: string;
  reviewRating: {
    ratingValue: number;
  };
  reviewCreateTime: string;
  reply?: {
    text: string;
    updateTime: string;
  };
}

interface GoogleReviewsResponse {
  reviews: GoogleReview[];
  nextPageToken?: string;
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
 * Fetch reviews from Google Business Profile API
 */
export async function fetchReviews(
  accessToken: string,
  businessProfileId: string,
  pageSize: number = 10
): Promise<GoogleReview[]> {
  return withRetry(async () => {
    const url = `${GOOGLE_API_BASE_URL}/${businessProfileId}/reviews`;

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

    return response.data.reviews || [];
  });
}

/**
 * Post a reply to a review
 */
export async function postReply(
  accessToken: string,
  businessProfileId: string,
  reviewName: string,
  replyText: string
): Promise<{ success: boolean; googleResponseId?: string }> {
  return withRetry(async () => {
    // reviewName is already a full resource name like "accounts/123/locations/456/reviews/review_id"
    const url = `${GOOGLE_API_BASE_URL}/${reviewName}:reply`;

    const response = await axios.post(
      url,
      {
        reply: {
          text: replyText,
        },
      },
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

  const systemPrompt = `You are a professional business owner responding to Google reviews. 
Your tone should be ${tone}.
Keep responses concise (2-3 sentences max).
Be authentic and personal.
Always thank the reviewer by name if provided.
Respond in the same language as the review.`;

  const userPrompt = `Generate a response to this review:
Rating: ${reviewRating}/5 stars
Author: ${authorName}
Review: "${reviewText}"

Generate only the response text, nothing else.`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    const responseText = response.choices?.[0]?.message?.content || "";
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
    return "grateful, enthusiastic, and warm";
  } else if (rating >= 4) {
    return "appreciative and professional";
  } else if (rating >= 3) {
    return "constructive, empathetic, and solution-focused";
  } else {
    return "apologetic, empathetic, and action-oriented";
  }
}
