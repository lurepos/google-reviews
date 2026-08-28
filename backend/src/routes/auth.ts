import type { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { sendData } from '@lurepos/nude-http';
import { NudeError } from '@lurepos/nude-core';
import type { BackendDependencies } from '../dependencies.js';
import { account } from '../db/schema.js';

export default function createAuthRoutes(dependencies: BackendDependencies) {
  return async function authRoutes(fastify: FastifyInstance) {
    
    // GET /session
    fastify.get('/session', async (request, reply) => {
      const authenticatedUser = await dependencies.auth.getAuthenticatedUser(request);
      if (!authenticatedUser) {
        return sendData(reply, { authenticated: false });
      }
      return sendData(reply, {
        authenticated: true,
        user: {
          id: authenticatedUser.id,
          name: authenticatedUser.name,
          email: authenticatedUser.email,
        },
      });
    });

    // GET /auth/google/url
    fastify.get('/auth/google/url', async (request, reply) => {
      await dependencies.auth.requireAuthenticatedUser(request);
      const url = dependencies.googleApi.getAuthUrl();
      return sendData(reply, { url });
    });

    // POST /auth/google/callback
    fastify.post('/auth/google/callback', async (request, reply) => {
      const authenticatedUser = await dependencies.auth.requireAuthenticatedUser(request);
      const body = request.body as { code?: string };
      if (!body.code) {
        throw new NudeError({
          code: 'VALIDATION_ERROR',
          message: 'Authorization code is required',
          statusCode: 400,
        });
      }

      try {
        const tokens = await dependencies.googleApi.exchangeCode(body.code);
        
        // Find existing account or insert
        const existingAccounts = await dependencies.db.select().from(account).where(
          eq(account.userId, authenticatedUser.id)
        );

        if (existingAccounts.length > 0) {
          await dependencies.db.update(account).set({
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token ?? existingAccounts[0].refreshToken,
            expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
            updatedAt: new Date(),
          }).where(eq(account.id, existingAccounts[0].id));
        } else {
          await dependencies.db.insert(account).values({
            id: crypto.randomUUID(),
            userId: authenticatedUser.id,
            provider: 'google',
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token ?? null,
            expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
            scope: 'business.manage,spreadsheets',
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }

        return sendData(reply, { success: true });
      } catch (error) {
        throw new NudeError({
          code: 'UNAUTHORIZED',
          message: 'Failed to exchange Google OAuth code',
          statusCode: 400,
          cause: error,
        });
      }
    });

  };
}
