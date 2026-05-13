import { eq, and, gte, lte, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, googleCredentials, reviews, responses, GoogleCredentials, InsertGoogleCredentials, Review, InsertReview, Response, InsertResponse, trustedshopCredentials, trustedshopReviews, trustedshopResponses, TrustedshopCredentials, InsertTrustedshopCredentials, TrustedshopReview, InsertTrustedshopReview, TrustedshopResponse, InsertTrustedshopResponse } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// Google Credentials queries
export async function getGoogleCredentialsByUserId(userId: number): Promise<GoogleCredentials | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(googleCredentials)
    .where(and(eq(googleCredentials.userId, userId), eq(googleCredentials.isActive, true)))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function upsertGoogleCredentials(data: InsertGoogleCredentials): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const existing = await db
    .select()
    .from(googleCredentials)
    .where(eq(googleCredentials.userId, data.userId))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(googleCredentials)
      .set(data)
      .where(eq(googleCredentials.userId, data.userId));
  } else {
    await db.insert(googleCredentials).values(data);
  }
}

// Reviews queries
export async function getReviewsByUserId(userId: number, limit: number = 50, offset: number = 0, filters?: { minRating?: number; maxRating?: number; startDate?: Date; endDate?: Date; hasResponse?: boolean }) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [eq(reviews.userId, userId)];

  if (filters?.minRating !== undefined) {
    conditions.push(gte(reviews.rating, filters.minRating));
  }
  if (filters?.maxRating !== undefined) {
    conditions.push(lte(reviews.rating, filters.maxRating));
  }
  if (filters?.startDate) {
    conditions.push(gte(reviews.reviewDate, filters.startDate));
  }
  if (filters?.endDate) {
    conditions.push(lte(reviews.reviewDate, filters.endDate));
  }
  if (filters?.hasResponse !== undefined) {
    conditions.push(eq(reviews.hasResponse, filters.hasResponse));
  }

  return await db
    .select()
    .from(reviews)
    .where(and(...conditions))
    .orderBy(desc(reviews.reviewDate))
    .limit(limit)
    .offset(offset);
}

export async function getReviewsWithoutResponse(userId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(reviews)
    .where(and(eq(reviews.userId, userId), eq(reviews.hasResponse, false)));
}

export async function upsertReview(data: InsertReview): Promise<Review | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const existing = await db
    .select()
    .from(reviews)
    .where(and(eq(reviews.userId, data.userId), eq(reviews.googleReviewId, data.googleReviewId)))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(reviews)
      .set(data)
      .where(eq(reviews.id, existing[0].id));
    return existing[0];
  } else {
    const result = await db.insert(reviews).values(data);
    return { ...data, id: result[0].insertId as number } as Review;
  }
}

// Responses queries
export async function getResponsesByUserId(userId: number, limit: number = 50, offset: number = 0, filters?: { status?: 'draft' | 'published' | 'failed'; startDate?: Date; endDate?: Date }) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [eq(responses.userId, userId)];

  if (filters?.status) {
    conditions.push(eq(responses.status, filters.status));
  }
  if (filters?.startDate) {
    conditions.push(gte(responses.createdAt, filters.startDate));
  }
  if (filters?.endDate) {
    conditions.push(lte(responses.createdAt, filters.endDate));
  }

  return await db
    .select()
    .from(responses)
    .where(and(...conditions))
    .orderBy(desc(responses.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function createResponse(data: InsertResponse): Promise<Response | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.insert(responses).values(data);
  return { ...data, id: result[0].insertId as number } as Response;
}

export async function updateResponseStatus(responseId: number, status: string, errorMessage?: string): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const updateData: any = { status, updatedAt: new Date() };
  if (status === "published") {
    updateData.publishedAt = new Date();
  }
  if (errorMessage) {
    updateData.errorMessage = errorMessage;
  }

  await db.update(responses).set(updateData).where(eq(responses.id, responseId));
}

export async function markReviewAsResponded(reviewId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.update(reviews).set({ hasResponse: true }).where(eq(reviews.id, reviewId));
}

// TrustedShop Credentials queries
export async function getTrustedshopCredentialsByUserId(userId: number): Promise<TrustedshopCredentials | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(trustedshopCredentials)
    .where(and(eq(trustedshopCredentials.userId, userId), eq(trustedshopCredentials.isActive, true)))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function upsertTrustedshopCredentials(data: InsertTrustedshopCredentials): Promise<TrustedshopCredentials | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const existing = await db
    .select()
    .from(trustedshopCredentials)
    .where(eq(trustedshopCredentials.userId, data.userId))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(trustedshopCredentials)
      .set(data)
      .where(eq(trustedshopCredentials.id, existing[0].id));
    return existing[0];
  } else {
    const result = await db.insert(trustedshopCredentials).values(data);
    return { ...data, id: result[0].insertId as number } as TrustedshopCredentials;
  }
}

// TrustedShop Reviews queries
export async function getTrustedshopReviewsByUserId(userId: number, limit: number = 50, offset: number = 0) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(trustedshopReviews)
    .where(eq(trustedshopReviews.userId, userId))
    .orderBy(desc(trustedshopReviews.reviewDate))
    .limit(limit)
    .offset(offset);
}

export async function upsertTrustedshopReview(data: InsertTrustedshopReview): Promise<TrustedshopReview | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const existing = await db
    .select()
    .from(trustedshopReviews)
    .where(and(eq(trustedshopReviews.userId, data.userId), eq(trustedshopReviews.trustedshopReviewId, data.trustedshopReviewId)))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(trustedshopReviews)
      .set(data)
      .where(eq(trustedshopReviews.id, existing[0].id));
    return existing[0];
  } else {
    const result = await db.insert(trustedshopReviews).values(data);
    return { ...data, id: result[0].insertId as number } as TrustedshopReview;
  }
}

// TrustedShop Responses queries
export async function getTrustedshopResponsesByUserId(userId: number, limit: number = 50, offset: number = 0) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(trustedshopResponses)
    .where(eq(trustedshopResponses.userId, userId))
    .orderBy(desc(trustedshopResponses.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function createTrustedshopResponse(data: InsertTrustedshopResponse): Promise<TrustedshopResponse | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.insert(trustedshopResponses).values(data);
  return { ...data, id: result[0].insertId as number } as TrustedshopResponse;
}

export async function updateTrustedshopResponseStatus(responseId: number, status: string, errorMessage?: string): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const updateData: any = { status, updatedAt: new Date() };
  if (status === "published") {
    updateData.publishedAt = new Date();
  }
  if (errorMessage) {
    updateData.errorMessage = errorMessage;
  }

  await db.update(trustedshopResponses).set(updateData).where(eq(trustedshopResponses.id, responseId));
}

export async function markTrustedshopReviewAsResponded(reviewId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.update(trustedshopReviews).set({ hasResponse: true }).where(eq(trustedshopReviews.id, reviewId));
}
