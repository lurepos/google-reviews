import type { FastifyInstance } from 'fastify';
import { eq, and, desc } from 'drizzle-orm';
import { sendData } from '@lurepos/nude-http';
import { NudeError } from '@lurepos/nude-core';
import type { BackendDependencies } from '../dependencies.js';
import { reviews, locations, account } from '../db/schema.js';

export default function createReviewsRoutes(dependencies: BackendDependencies) {
  return async function reviewsRoutes(fastify: FastifyInstance) {

    // GET /reviews
    fastify.get('/reviews', async (request, reply) => {
      const user = await dependencies.auth.requireAuthenticatedUser(request);
      const query = request.query as { locationId?: string; status?: string };

      // Find user locations
      const userLocs = await dependencies.db.select().from(locations).where(
        eq(locations.userId, user.id)
      );

      const locationIds = userLocs.map(l => l.id);
      if (locationIds.length === 0) {
        return sendData(reply, { reviews: [] });
      }

      // Query reviews matching location ids
      let cond = and(eq(reviews.locationId, locationIds[0])); // base condition
      if (locationIds.length > 1) {
        // Build list condition or fallback to manually mapping if needed, but in Drizzle ORM we can filter by mapping/membership or in DB.
        // Let's filter on node or check if Drizzle supports "inArray".
        // Since we want standard compatibility, let's select all reviews for these locations.
      }

      // To keep it simple, select all reviews and filter or use Drizzle's direct queries
      const allReviews = await dependencies.db.select().from(reviews).orderBy(desc(reviews.createdAt));
      
      const filtered = allReviews.filter(r => {
        const matchesLoc = locationIds.includes(r.locationId);
        const matchesQueryLoc = query.locationId ? r.locationId === query.locationId : true;
        const matchesStatus = query.status ? r.status === query.status : true;
        return matchesLoc && matchesQueryLoc && matchesStatus;
      });

      return sendData(reply, { reviews: filtered });
    });

    // POST /reviews/sync
    fastify.post('/reviews/sync', async (request, reply) => {
      const user = await dependencies.auth.requireAuthenticatedUser(request);

      const userAccounts = await dependencies.db.select().from(account).where(
        and(eq(account.userId, user.id), eq(account.provider, 'google'))
      );

      if (userAccounts.length === 0 || !userAccounts[0].accessToken) {
        throw new NudeError({
          code: 'CONFIGURATION_ERROR',
          message: 'Google account is not connected',
          statusCode: 400,
        });
      }

      const accessToken = userAccounts[0].accessToken;
      const userLocs = await dependencies.db.select().from(locations).where(
        eq(locations.userId, user.id)
      );

      let syncedCount = 0;
      for (const loc of userLocs) {
        const googleReviews = await dependencies.googleApi.fetchReviews(accessToken, loc.googleLocationId);
        
        for (const gr of googleReviews) {
          // Check if review already exists
          const existing = await dependencies.db.select().from(reviews).where(
            and(eq(reviews.locationId, loc.id), eq(reviews.googleReviewId, gr.reviewId))
          );

          if (existing.length === 0) {
            const isNegative = await dependencies.llm.isNegativeSentiment(gr.comment);
            const sentiment = isNegative ? 'negative' : 'other';
            
            // Generate draft
            const draft = await dependencies.llm.generateResponse(gr.comment, gr.starRating, loc.tone, loc.language);
            
            // Determine initial status based on config
            // If negative, and autoReplyNegative is false, set status to pending
            // If positive/other, and autoReplyPositive is true, set status to approved or directly posted
            const autoReply = isNegative ? loc.autoReplyNegative : loc.autoReplyPositive;
            const status = autoReply ? 'approved' : 'pending';

            const [newReview] = await dependencies.db.insert(reviews).values({
              id: crypto.randomUUID(),
              locationId: loc.id,
              googleReviewId: gr.reviewId,
              reviewerName: gr.reviewerName,
              comment: gr.comment,
              rating: gr.starRating,
              sentiment: sentiment,
              aiDraftResponse: draft,
              finalResponse: draft,
              status: status,
              syncedToSheets: false,
              createdAt: new Date(),
              updatedAt: new Date(),
            }).returning();

            // If auto-reply is active, trigger immediate post
            if (status === 'approved') {
              try {
                await dependencies.googleApi.postReply(accessToken, loc.googleLocationId, gr.reviewId, draft);
                await dependencies.db.update(reviews).set({
                  status: 'posted',
                  updatedAt: new Date()
                }).where(eq(reviews.id, newReview.id));

                // Sync to sheets if configured
                if (loc.sheetId) {
                  await dependencies.googleApi.syncToSheets(
                    accessToken,
                    loc.sheetId,
                    loc.sheetRange || 'Reviews!A:D',
                    [gr.reviewId, gr.comment, gr.starRating, draft]
                  );
                  await dependencies.db.update(reviews).set({
                    syncedToSheets: true
                  }).where(eq(reviews.id, newReview.id));
                }
              } catch (e) {
                // If post fails, keep as approved for retry
              }
            }
            syncedCount++;
          }
        }
      }

      return sendData(reply, { syncedCount });
    });

    // POST /reviews/:id/draft
    fastify.post('/reviews/:id/draft', async (request, reply) => {
      const user = await dependencies.auth.requireAuthenticatedUser(request);
      const { id } = request.params as { id: string };

      const reviewList = await dependencies.db.select().from(reviews).where(eq(reviews.id, id));
      if (reviewList.length === 0) {
        throw new NudeError({
          code: 'NOT_FOUND',
          message: 'Review not found',
          statusCode: 404,
        });
      }

      const review = reviewList[0];
      const locList = await dependencies.db.select().from(locations).where(
        and(eq(locations.id, review.locationId), eq(locations.userId, user.id))
      );

      if (locList.length === 0) {
        throw new NudeError({
          code: 'FORBIDDEN',
          message: 'Access denied to this review location',
          statusCode: 403,
        });
      }

      const loc = locList[0];
      const newDraft = await dependencies.llm.generateResponse(review.comment, review.rating, loc.tone, loc.language);
      
      const [updated] = await dependencies.db.update(reviews).set({
        aiDraftResponse: newDraft,
        finalResponse: newDraft,
        updatedAt: new Date(),
      }).where(eq(reviews.id, id)).returning();

      return sendData(reply, { review: updated });
    });

    // POST /reviews/:id/approve
    fastify.post('/reviews/:id/approve', async (request, reply) => {
      const user = await dependencies.auth.requireAuthenticatedUser(request);
      const { id } = request.params as { id: string };
      const body = request.body as { response?: string };

      const reviewList = await dependencies.db.select().from(reviews).where(eq(reviews.id, id));
      if (reviewList.length === 0) {
        throw new NudeError({
          code: 'NOT_FOUND',
          message: 'Review not found',
          statusCode: 404,
        });
      }

      const review = reviewList[0];
      const locList = await dependencies.db.select().from(locations).where(
        and(eq(locations.id, review.locationId), eq(locations.userId, user.id))
      );

      if (locList.length === 0) {
        throw new NudeError({
          code: 'FORBIDDEN',
          message: 'Access denied to this review location',
          statusCode: 403,
        });
      }

      const loc = locList[0];
      const responseText = body.response || review.finalResponse || review.aiDraftResponse || '';

      if (!responseText) {
        throw new NudeError({
          code: 'VALIDATION_ERROR',
          message: 'Response text is required',
          statusCode: 400,
        });
      }

      // Get Google account access token
      const userAccounts = await dependencies.db.select().from(account).where(
        and(eq(account.userId, user.id), eq(account.provider, 'google'))
      );

      if (userAccounts.length === 0 || !userAccounts[0].accessToken) {
        throw new NudeError({
          code: 'CONFIGURATION_ERROR',
          message: 'Google account is not connected',
          statusCode: 400,
        });
      }

      // Publish to Google Business Profile Reviews API
      await dependencies.googleApi.postReply(
        userAccounts[0].accessToken,
        loc.googleLocationId,
        review.googleReviewId,
        responseText
      );

      const [updated] = await dependencies.db.update(reviews).set({
        finalResponse: responseText,
        status: 'posted',
        updatedAt: new Date(),
      }).where(eq(reviews.id, id)).returning();

      // Sync to Google Sheets if configured
      if (loc.sheetId) {
        try {
          await dependencies.googleApi.syncToSheets(
            userAccounts[0].accessToken,
            loc.sheetId,
            loc.sheetRange || 'Reviews!A:D',
            [review.googleReviewId, review.comment, review.rating, responseText]
          );
          await dependencies.db.update(reviews).set({
            syncedToSheets: true
          }).where(eq(reviews.id, id));
        } catch (e) {
          // sheets failed, but Google Reviews succeeded
        }
      }

      return sendData(reply, { review: updated });
    });

  };
}
