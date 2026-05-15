import axios, { AxiosError } from "axios";

const ETRUSTED_API_BASE = "https://api.etrusted.com";
const ETRUSTED_LOGIN_URL = "https://login.etrusted.com/oauth/token";

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

  private async getAccessToken(): Promise<string> {
    const now = Date.now();
    if (this.accessToken && now < this.tokenExpiresAt) {
      return this.accessToken;
    }
    return this.refreshAccessToken();
  }

  private async refreshAccessToken(): Promise<string> {
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const params = new URLSearchParams();
        params.append("grant_type", "client_credentials");
        params.append("client_id", this.clientId);
        params.append("client_secret", this.clientSecret);
        params.append("audience", "https://api.etrusted.com");

        const response = await axios.post<ETrustedAccessTokenResponse>(
          ETRUSTED_LOGIN_URL,
          params.toString(),
          {
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
          }
        );

        this.accessToken = response.data.access_token;
        this.tokenExpiresAt = Date.now() + (response.data.expires_in - 300) * 1000;

        return this.accessToken;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        if (attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt - 1) * 1000));
        }
      }
    }

    throw new Error(`Failed to get eTrusted access token after ${maxRetries} attempts: ${lastError?.message}`);
  }

  async fetchReviews(limit: number = 50): Promise<ETrustedReview[]> {
    const token = await this.getAccessToken();

    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await axios.get(`${ETRUSTED_API_BASE}/reviews`, {
          headers: { Authorization: `Bearer ${token}` },
          params: {
            count: limit,
            channelId: this.channelId,
            sort: "-createdAt",
          },
        });

        return response.data.items || [];
      } catch (error) {
        lastError = error instanceof AxiosError ? new Error(error.message) : (error instanceof Error ? error : new Error(String(error)));
        if (attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt - 1) * 1000));
        }
      }
    }

    throw new Error(`Failed to fetch eTrusted reviews after ${maxRetries} attempts: ${lastError?.message}`);
  }

  async postReply(reviewId: string, replyText: string): Promise<{ success: boolean; responseId?: string }> {
    const token = await this.getAccessToken();

    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await axios.post(
          `${ETRUSTED_API_BASE}/reviews/${reviewId}/reply`,
          { comment: replyText, sendNotification: false },
          { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
        );

        return { success: true, responseId: response.data.id };
      } catch (error) {
        lastError = error instanceof AxiosError ? new Error(error.message) : (error instanceof Error ? error : new Error(String(error)));
        if (attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt - 1) * 1000));
        }
      }
    }

    throw new Error(`Failed to post reply after ${maxRetries} attempts: ${lastError?.message}`);
  }
