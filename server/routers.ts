import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import {
  getGoogleCredentialsByUserId,
  upsertGoogleCredentials,
  getReviewsByUserId,
  getResponsesByUserId,
  getTrustedshopCredentialsByUserId,
  upsertTrustedshopCredentials,
  getTrustedshopResponsesByUserId,
} from "./db";

// Admin-only procedure
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  }
  return next({ ctx });
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // Google Reviews — credentials (admin only)
  googleCredentials: router({
    get: adminProcedure.query(async ({ ctx }) => {
      const creds = await getGoogleCredentialsByUserId(ctx.user.id);
      if (!creds) return null;
      // Ne pas renvoyer les secrets au frontend
      return {
        id: creds.id,
        businessProfileId: creds.businessProfileId,
        isActive: creds.isActive,
        createdAt: creds.createdAt,
        updatedAt: creds.updatedAt,
      };
    }),
    save: adminProcedure
      .input((val: any) => ({
        clientId: val.clientId as string,
        clientSecret: val.clientSecret as string,
        refreshToken: val.refreshToken as string,
        businessProfileId: val.businessProfileId as string,
      }))
      .mutation(async ({ ctx, input }) => {
        if (
          !input.clientId?.trim() ||
          !input.clientSecret?.trim() ||
          !input.refreshToken?.trim() ||
          !input.businessProfileId?.trim()
        ) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Tous les champs sont obligatoires" });
        }
        await upsertGoogleCredentials({
          userId: ctx.user.id,
          clientId: input.clientId.trim(),
          clientSecret: input.clientSecret.trim(),
          refreshToken: input.refreshToken.trim(),
          businessProfileId: input.businessProfileId.trim(),
          isActive: true,
        });
        return { success: true };
      }),
  }),

  // Google Reviews — liste des avis
  reviews: router({
    list: adminProcedure
      .input((val: any) => ({
        limit: val.limit as number | undefined,
        offset: val.offset as number | undefined,
      }))
      .query(async ({ ctx, input }) => {
        return await getReviewsByUserId(ctx.user.id, input.limit || 50, input.offset || 0);
      }),
  }),

  // Google Reviews — liste des réponses générées
  responses: router({
    list: adminProcedure
      .input((val: any) => ({
        limit: val.limit as number | undefined,
        offset: val.offset as number | undefined,
      }))
      .query(async ({ ctx, input }) => {
        return await getResponsesByUserId(ctx.user.id, input.limit || 50, input.offset || 0);
      }),
  }),

  // Google Reviews — actions manuelles
  googleReviews: router({
    // Déclenche manuellement le traitement des avis (depuis le dashboard)
    testFetch: adminProcedure.mutation(async ({ ctx }) => {
      const { processReviewsForUser } = await import("./review-processor");
      try {
        const result = await processReviewsForUser(ctx.user.id);
        return { success: true, result };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }),
  }),

  // TrustedShop — credentials
  trustedshop: router({
    getCredentials: adminProcedure.query(async ({ ctx }) => {
      const creds = await getTrustedshopCredentialsByUserId(ctx.user.id);
      if (!creds) return null;
      return {
        id: creds.id,
        channelId: creds.channelId,
        isActive: creds.isActive,
        createdAt: creds.createdAt,
        updatedAt: creds.updatedAt,
      };
    }),
    saveCredentials: adminProcedure
      .input((val: any) => ({
        clientId: val.clientId as string,
        clientSecret: val.clientSecret as string,
        channelId: val.channelId as string,
      }))
      .mutation(async ({ ctx, input }) => {
        if (!input.clientId?.trim() || !input.clientSecret?.trim() || !input.channelId?.trim()) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Tous les champs sont obligatoires" });
        }
        await upsertTrustedshopCredentials({
          userId: ctx.user.id,
          clientId: input.clientId.trim(),
          clientSecret: input.clientSecret.trim(),
          channelId: input.channelId.trim(),
          isActive: true,
        });
        return { success: true };
      }),
    listResponses: adminProcedure
      .input((val: any) => ({
        limit: val.limit as number | undefined,
        offset: val.offset as number | undefined,
      }))
      .query(async ({ ctx, input }) => {
        return await getTrustedshopResponsesByUserId(ctx.user.id, input.limit || 50, input.offset || 0);
      }),
  }),
});

export type AppRouter = typeof appRouter;
