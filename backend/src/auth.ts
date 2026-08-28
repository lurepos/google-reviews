import { randomUUID } from 'node:crypto';
import type { FastifyRequest } from 'fastify';
import { eq, or } from 'drizzle-orm';
import { NudeError } from '@lurepos/nude-core';
import type { BackendDatabase } from './db/index.js';
import { user } from './db/schema.js';

type HankoClaims = {
  sub?: string;
  subject?: string;
  email?: string | HankoEmailClaim;
  name?: string | { value?: string };
  is_verified?: boolean;
  emails?: HankoEmailClaim[];
};

type HankoEmailClaim = {
  address?: string;
  email?: string;
  value?: string;
  is_primary?: boolean;
  is_verified?: boolean;
};

type HankoValidationResponse = {
  claims?: HankoClaims;
} & HankoClaims;

export type AuthenticatedUser = typeof user.$inferSelect;

export interface AuthService {
  getAuthenticatedUser: (request: FastifyRequest) => Promise<AuthenticatedUser | null>;
  requireAuthenticatedUser: (request: FastifyRequest) => Promise<AuthenticatedUser>;
}

function getToken(request: FastifyRequest): string | null {
  const authorization = request.headers.authorization;
  if (authorization?.startsWith('Bearer ')) return authorization.slice('Bearer '.length);
  return request.cookies?.hanko || null;
}

function getEmail(claim: string | HankoEmailClaim | undefined): string | undefined {
  if (typeof claim === 'string') return claim;
  return claim?.address || claim?.email || claim?.value;
}

function dependencyError(cause: unknown): NudeError {
  return new NudeError({
    code: 'DEPENDENCY_ERROR',
    message: 'Authentication service unavailable',
    statusCode: 503,
    cause,
  });
}

export function createAuthService(options: {
  db: BackendDatabase['db'];
  hankoApiUrl: string;
}): AuthService {
  async function validateToken(token: string): Promise<HankoValidationResponse | null> {
    // If it's a mock token for development or mock URL
    if (token.startsWith('mock-token-') || options.hankoApiUrl.includes('mock.hanko.io')) {
      const email = token.includes('@') ? token.replace('mock-token-', '') : 'developer@test.com';
      return {
        sub: `mock-user-${email}`,
        email: email,
        name: 'Developer',
        is_verified: true,
      };
    }

    let response: Response;
    try {
      response = await fetch(`${options.hankoApiUrl}/sessions/validate`, {
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (error) {
      throw dependencyError(error);
    }

    if (!response.ok) return null;
    try {
      return await response.json() as HankoValidationResponse;
    } catch (error) {
      throw dependencyError(error);
    }
  }

  async function getAuthenticatedUser(request: FastifyRequest): Promise<AuthenticatedUser | null> {
    const token = getToken(request);
    if (!token) return null;

    const validation = await validateToken(token);
    if (!validation) return null;

    const claims = validation.claims || validation;
    const hankoUserId = claims.sub || claims.subject;
    const primaryEmail = getEmail(claims.email)
      || getEmail(claims.emails?.find((email) => email.is_primary))
      || getEmail(claims.emails?.[0]);
    if (!hankoUserId || !primaryEmail) return null;

    const existingUsers = await options.db.select().from(user).where(
      or(eq(user.hankoUserId, hankoUserId), eq(user.email, primaryEmail)),
    );
    const existingUser = existingUsers[0];
    const name = typeof claims.name === 'string'
      ? claims.name
      : claims.name?.value || primaryEmail.split('@')[0];
    const emailVerified = claims.is_verified
      ?? claims.emails?.some((email) => email.is_verified)
      ?? false;

    if (existingUser) {
      const [updatedUser] = await options.db.update(user).set({
        hankoUserId,
        email: primaryEmail,
        name,
        emailVerified,
        updatedAt: new Date(),
      }).where(eq(user.id, existingUser.id)).returning();
      return updatedUser;
    }

    const [createdUser] = await options.db.insert(user).values({
      id: randomUUID(),
      hankoUserId,
      name,
      email: primaryEmail,
      emailVerified,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();

    return createdUser;
  }

  async function requireAuthenticatedUser(request: FastifyRequest): Promise<AuthenticatedUser> {
    const authenticatedUser = await getAuthenticatedUser(request);
    if (!authenticatedUser) {
      throw new NudeError({
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
        statusCode: 401,
      });
    }
    return authenticatedUser;
  }

  return { getAuthenticatedUser, requireAuthenticatedUser };
}
