import type { FastifyReply, FastifyRequest } from "fastify";
import { and, eq, gt } from "drizzle-orm";
import { db } from "../db";
import { authTokens, users } from "../db/schema";
import { hashApiToken } from "../utils/auth";

type UserRow = typeof users.$inferSelect;
type AuthTokenRow = typeof authTokens.$inferSelect;

declare module "fastify" {
  interface FastifyRequest {
    auth?: {
      user: UserRow;
      token: AuthTokenRow;
    };
  }
}

export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  const header = request.headers.authorization;
  if (!header || !header.toLowerCase().startsWith("bearer ")) {
    reply.status(401).send({ error: "Missing bearer token" });
    return;
  }

  const rawToken = header.slice(7).trim();
  if (!rawToken) {
    reply.status(401).send({ error: "Missing bearer token" });
    return;
  }

  const tokenHash = hashApiToken(rawToken);
  const now = new Date();
  const token = await db.query.authTokens.findFirst({
    where: and(
      eq(authTokens.tokenHash, tokenHash),
      eq(authTokens.kind, "api"),
      eq(authTokens.revoked, false),
      gt(authTokens.expiresAt, now),
    ),
    with: { user: true },
  });

  if (!token || !token.user) {
    reply.status(401).send({ error: "Invalid token" });
    return;
  }

  await db.update(authTokens).set({ lastUsedAt: now }).where(eq(authTokens.id, token.id));
  request.auth = { user: token.user, token };
}
