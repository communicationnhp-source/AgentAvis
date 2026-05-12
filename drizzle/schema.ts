import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, json, uniqueIndex } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Google Business Profile credentials - encrypted storage for OAuth tokens
 * One per user (admin only)
 */
export const googleCredentials = mysqlTable("google_credentials", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  clientId: text("clientId").notNull(),
  clientSecret: text("clientSecret").notNull(),
  refreshToken: text("refreshToken").notNull(),
  businessProfileId: varchar("businessProfileId", { length: 255 }).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type GoogleCredentials = typeof googleCredentials.$inferSelect;
export type InsertGoogleCredentials = typeof googleCredentials.$inferInsert;

/**
 * Google reviews fetched from the API
 * Stores review data to track which ones we've already responded to
 * Unique constraint on (userId, googleReviewId) to prevent duplicates
 */
export const reviews = mysqlTable(
  "reviews",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    googleReviewId: varchar("googleReviewId", { length: 255 }).notNull(),
    authorName: varchar("authorName", { length: 255 }).notNull(),
    rating: int("rating").notNull(), // 1-5
    reviewText: text("reviewText").notNull(),
    reviewDate: timestamp("reviewDate").notNull(),
    hasResponse: boolean("hasResponse").default(false).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    userReviewUnique: uniqueIndex("user_review_unique").on(table.userId, table.googleReviewId),
  })
);

export type Review = typeof reviews.$inferSelect;
export type InsertReview = typeof reviews.$inferInsert;

/**
 * Auto-generated responses to reviews
 * Tracks what we've published and when
 */
export const responses = mysqlTable("responses", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  reviewId: int("reviewId").notNull(),
  googleResponseId: varchar("googleResponseId", { length: 255 }),
  responseText: text("responseText").notNull(),
  status: mysqlEnum("status", ["draft", "published", "failed"]).default("draft").notNull(),
  errorMessage: text("errorMessage"),
  publishedAt: timestamp("publishedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Response = typeof responses.$inferSelect;
export type InsertResponse = typeof responses.$inferInsert;
/**
 * TrustedShop (eTrusted) credentials - encrypted storage for API tokens
 * One per user (admin only)
 */
export const trustedshopCredentials = mysqlTable("trustedshop_credentials", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  clientId: text("clientId").notNull(),
  clientSecret: text("clientSecret").notNull(),
  channelId: varchar("channelId", { length: 255 }).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TrustedshopCredentials = typeof trustedshopCredentials.$inferSelect;
export type InsertTrustedshopCredentials = typeof trustedshopCredentials.$inferInsert;

/**
 * TrustedShop reviews fetched from the API
 * Stores review data to track which ones we've already responded to
 * Unique constraint on (userId, trustedshopReviewId) to prevent duplicates
 */
export const trustedshopReviews = mysqlTable(
  "trustedshop_reviews",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    trustedshopReviewId: varchar("trustedshopReviewId", { length: 255 }).notNull(),
    authorName: varchar("authorName", { length: 255 }).notNull(),
    rating: int("rating").notNull(),
    reviewText: text("reviewText").notNull(),
    reviewDate: timestamp("reviewDate").notNull(),
    hasResponse: boolean("hasResponse").default(false).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    userReviewUnique: uniqueIndex("user_trustedshop_review_unique").on(table.userId, table.trustedshopReviewId),
  })
);

export type TrustedshopReview = typeof trustedshopReviews.$inferSelect;
export type InsertTrustedshopReview = typeof trustedshopReviews.$inferInsert;

/**
 * TrustedShop auto-generated responses to reviews
 * Tracks what we've published and when
 */
export const trustedshopResponses = mysqlTable("trustedshop_responses", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  reviewId: int("reviewId").notNull(),
  trustedshopResponseId: varchar("trustedshopResponseId", { length: 255 }),
  responseText: text("responseText").notNull(),
  status: mysqlEnum("ts_status", ["draft", "published", "failed"]).default("draft").notNull(),
  errorMessage: text("errorMessage"),
  publishedAt: timestamp("publishedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TrustedshopResponse = typeof trustedshopResponses.$inferSelect;
export type InsertTrustedshopResponse = typeof trustedshopResponses.$inferInsert;
