import axios, { AxiosError } from "axios";

const ETRUSTED_API_BASE = "https://api.etrusted.com";

interface ETrustedReview {
  id: string;
  rating: number;
  title: string;
  comment: string;
  createdAt: string;
  customer: {
    fullName: string;
  };
}

interface ETrustedAccessTokenResponse {
  access_token: string;
  expires_in: number;
}

export class TrustedShopAPI {
  private clientId: string;
  private clientSecret: string;
  private channelId: string;
  private accessToken: string | null = null;
  private tokenExpiresAt: number = 0;

  constructor(clientId: string, clientSecret: string, channelId: string) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.channelId = channelId;
  }

  /**
   * Get a valid access token, refreshing if necessary
   */
  private async getAccessToken(): Promise<string> {
    const now = Date.now();

    // If we have a valid token, return it
    if (this.accessToken && now < this.tokenExpiresAt) {
      return this.accessToken;
    }

    // Otherwise, get a new token
    return this.refreshAccessToken();
  }

  /**
   * Refresh the access token using client credentials
   */
  private async refreshAccessToken(): Promise<string> {
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await axios.post<ETrustedAccessTokenResponse>(
          `${ETRUSTED_API_BASE}/oauth/token`,
          {
            grant_type: "client_credentials",
            client_id: this.clientId,
            client_secret: this.clientSecret,
          }
        );

        this.accessToken = response.data.access_token;
        // Set expiration to 5 minutes before actual expiration for safety
        this.tokenExpiresAt = Date.now() + (response.data.expires_in - 300) * 1000;

        return this.accessToken;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        if (attempt < maxRetries) {
          // Exponential backoff: 1s, 2s, 4s
          await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt - 1) * 1000));
        }
      }
    }

    throw new Error(`Failed to get eTrusted access token after ${maxRetries} attempts: ${lastError?.message}`);
  }

  /**
   * Fetch reviews for the channel
   */
  async fetchReviews(limit: number = 50): Promise<ETrustedReview[]> {
    const token = await this.getAccessToken();

    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await axios.get(`${ETRUSTED_API_BASE}/reviews`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          params: {
            count: limit,
            sort: "-createdAt", // Most recent first
          },
        });

        return response.data.items || [];
      } catch (error) {
        lastError = error instanceof AxiosError ? new Error(error.message) : (error instanceof Error ? error : new Error(String(error)));

        if (attempt < maxRetries) {
          // Exponential backoff
          await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt - 1) * 1000));
        }
      }
    }

    throw new Error(`Failed to fetch eTrusted reviews after ${maxRetries} attempts: ${lastError?.message}`);
  }

  /**
   * Post a reply to a review
   * Note: eTrusted API may not support direct reply posting via public API
   * This is a placeholder for future implementation if the API is extended
   */
  async postReply(reviewId: string, replyText: string): Promise<{ success: boolean; responseId?: string }> {
    const token = await this.getAccessToken();

    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // This endpoint may not exist yet - check eTrusted documentation
        const response = await axios.post(
          `${ETRUSTED_API_BASE}/reviews/${reviewId}/reply`,
          {
            text: replyText,
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        return {
          success: true,
          responseId: response.data.id,
        };
      } catch (error) {
        lastError = error instanceof AxiosError ? new Error(error.message) : (error instanceof Error ? error : new Error(String(error)));

        if (attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt - 1) * 1000));
        }
      }
    }

    throw new Error(`Failed to post reply to eTrusted review after ${maxRetries} attempts: ${lastError?.message}`);
  }
}
