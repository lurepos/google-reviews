import type { FastifyInstance } from 'fastify';
import { eq, and } from 'drizzle-orm';
import { sendData } from '@lurepos/nude-http';
import { NudeError } from '@lurepos/nude-core';
import type { BackendDependencies } from '../dependencies.js';
import { locations, account } from '../db/schema.js';

export default function createLocationsRoutes(dependencies: BackendDependencies) {
  return async function locationsRoutes(fastify: FastifyInstance) {

    // GET /locations
    fastify.get('/locations', async (request, reply) => {
      const user = await dependencies.auth.requireAuthenticatedUser(request);

      // Get local configurations
      const localLocations = await dependencies.db.select().from(locations).where(
        eq(locations.userId, user.id)
      );

      // Try fetching active locations from Google API
      const userAccounts = await dependencies.db.select().from(account).where(
        and(eq(account.userId, user.id), eq(account.provider, 'google'))
      );

      let googleLocationsList: any[] = [];
      if (userAccounts.length > 0 && userAccounts[0].accessToken) {
        try {
          googleLocationsList = await dependencies.googleApi.getLocations(userAccounts[0].accessToken);
        } catch (e) {
          // Silent catch, fallback is fine
        }
      }

      return sendData(reply, {
        local: localLocations,
        google: googleLocationsList,
      });
    });

    // POST /locations
    fastify.post('/locations', async (request, reply) => {
      const user = await dependencies.auth.requireAuthenticatedUser(request);
      const body = request.body as { googleLocationId?: string; name?: string };

      if (!body.googleLocationId || !body.name) {
        throw new NudeError({
          code: 'VALIDATION_ERROR',
          message: 'googleLocationId and name are required',
          statusCode: 400,
        });
      }

      // Check if already registered
      const existing = await dependencies.db.select().from(locations).where(
        and(
          eq(locations.userId, user.id),
          eq(locations.googleLocationId, body.googleLocationId)
        )
      );

      if (existing.length > 0) {
        return sendData(reply, { location: existing[0] });
      }

      const [newLoc] = await dependencies.db.insert(locations).values({
        id: crypto.randomUUID(),
        userId: user.id,
        googleLocationId: body.googleLocationId,
        name: body.name,
        autoReplyPositive: true,
        autoReplyNegative: false,
        tone: 'professional',
        language: 'original',
        createdAt: new Date(),
        updatedAt: new Date(),
      }).returning();

      return sendData(reply, { location: newLoc });
    });

    // PATCH /locations/:id
    fastify.patch('/locations/:id', async (request, reply) => {
      const user = await dependencies.auth.requireAuthenticatedUser(request);
      const { id } = request.params as { id: string };
      const body = request.body as {
        autoReplyPositive?: boolean;
        autoReplyNegative?: boolean;
        tone?: string;
        language?: string;
        sheetId?: string | null;
        sheetRange?: string;
      };

      const existing = await dependencies.db.select().from(locations).where(
        and(eq(locations.id, id), eq(locations.userId, user.id))
      );

      if (existing.length === 0) {
        throw new NudeError({
          code: 'NOT_FOUND',
          message: 'Location not found',
          statusCode: 404,
        });
      }

      const [updated] = await dependencies.db.update(locations).set({
        autoReplyPositive: body.autoReplyPositive !== undefined ? body.autoReplyPositive : existing[0].autoReplyPositive,
        autoReplyNegative: body.autoReplyNegative !== undefined ? body.autoReplyNegative : existing[0].autoReplyNegative,
        tone: body.tone ?? existing[0].tone,
        language: body.language ?? existing[0].language,
        sheetId: body.sheetId !== undefined ? body.sheetId : existing[0].sheetId,
        sheetRange: body.sheetRange ?? existing[0].sheetRange,
        updatedAt: new Date(),
      }).where(eq(locations.id, id)).returning();

      return sendData(reply, { location: updated });
    });

  };
}
