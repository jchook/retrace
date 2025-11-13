import { and, desc, eq, gt } from "drizzle-orm";
import { z } from "zod";
import { App } from "../app";
import { db } from "../db";
import { authTokens, users } from "../db/schema";
import {
  ApiToken,
  AuthApiTokenCreateRequest,
  AuthApiTokenCreateResponse,
  AuthEmailOtpRequest,
  AuthOkResponse,
  AuthSession,
  AuthVerifyOtpRequest,
  ErrorResponse,
  UuidParam,
} from "./schema";
import { daysFromNow, minutesFromNow } from "../utils/time";
import {
  generateBearerToken,
  generateOtpCode,
  hashApiToken,
  hashOtp,
  normalizeEmail,
  sanitizeApiToken,
} from "../utils/auth";
import { requireAuth } from "../middleware/auth";

type UserRow = typeof users.$inferSelect;

const OTP_EXPIRATION_MINUTES = 10;
const SESSION_TOKEN_TTL_MINUTES = 60 * 24;
const API_TOKEN_TTL_DAYS = 90;

const buildApiTokenInsert = (
  userId: string,
  opts: { name: string | null; expiresAt: Date; scope?: string[] | null },
) => {
  const rawToken = generateBearerToken();
  return {
    rawToken,
    values: {
      userId,
      kind: "api" as const,
      name: opts.name,
      scope: opts.scope ?? null,
      expiresAt: opts.expiresAt,
      tokenHash: hashApiToken(rawToken),
    },
  };
};

async function findOrCreateUserByEmail(email: string): Promise<UserRow> {
  const normalized = normalizeEmail(email);
  const existing = await db.query.users.findFirst({ where: eq(users.email, normalized) });
  if (existing) return existing;
  const [created] = await db.insert(users).values({ email: normalized }).returning();
  return created;
}

export async function v1Auth(app: App) {
  app.route({
    method: "POST",
    url: "/auth/email-otp",
    schema: {
      description: "Request a login OTP",
      tags: ["Auth"],
      body: AuthEmailOtpRequest,
      response: { 200: AuthOkResponse, 500: ErrorResponse },
    },
    handler: async (req, res) => {
      const user = await findOrCreateUserByEmail(req.body.email);

      await db
        .delete(authTokens)
        .where(and(eq(authTokens.userId, user.id), eq(authTokens.kind, "login")));

      const code = generateOtpCode();
      await db.insert(authTokens).values({
        userId: user.id,
        kind: "login",
        tokenHash: hashOtp(user.id, code),
        expiresAt: minutesFromNow(OTP_EXPIRATION_MINUTES),
      });

      try {
        await req.server.mailer.sendOtpEmail({ to: user.email, code });
      } catch (err) {
        req.log.error({ err, email: user.email }, "Failed to dispatch OTP email");
        return res.status(500).send({ error: "Unable to send verification code" });
      }

      req.log.info({ userId: user.id, email: user.email }, "OTP dispatched");
      return { ok: true };
    },
  });

  app.route({
    method: "POST",
    url: "/auth/login",
    schema: {
      description: "Verify OTP and establish a session token",
      tags: ["Auth"],
      body: AuthVerifyOtpRequest,
      response: { 200: AuthSession, 400: ErrorResponse },
    },
    handler: async (req, res) => {
      const email = normalizeEmail(req.body.email);
      const user = await db.query.users.findFirst({ where: eq(users.email, email) });
      if (!user) return res.status(400).send({ error: "Invalid code" });

      const tokenHash = hashOtp(user.id, req.body.code);
      const now = new Date();
      const loginToken = await db.query.authTokens.findFirst({
        where: and(
          eq(authTokens.userId, user.id),
          eq(authTokens.kind, "login"),
          eq(authTokens.tokenHash, tokenHash),
          eq(authTokens.revoked, false),
          gt(authTokens.expiresAt, now),
        ),
      });
      if (!loginToken) return res.status(400).send({ error: "Invalid code" });

      const session = await db.transaction(async (tx) => {
        await tx.delete(authTokens).where(eq(authTokens.id, loginToken.id));
        const payload = buildApiTokenInsert(user.id, {
          name: "Session",
          scope: ["session"],
          expiresAt: minutesFromNow(SESSION_TOKEN_TTL_MINUTES),
        });
        const [record] = await tx.insert(authTokens).values(payload.values).returning();
        return { rawToken: payload.rawToken, record };
      });

      return res.status(200).send({ token: session.rawToken, user });
    },
  });

  app.route({
    method: "POST",
    url: "/auth/api-tokens",
    schema: {
      description: "Create a long-lived API token",
      tags: ["Auth"],
      security: [{ bearerAuth: [] }],
      body: AuthApiTokenCreateRequest,
      response: { 201: AuthApiTokenCreateResponse, 401: ErrorResponse },
    },
    preHandler: requireAuth,
    handler: async (req, res) => {
      if (!req.auth) return;
      const payload = buildApiTokenInsert(req.auth.user.id, {
        name: req.body.name ?? null,
        scope: null,
        expiresAt: daysFromNow(API_TOKEN_TTL_DAYS),
      });
      const [record] = await db.insert(authTokens).values(payload.values).returning();
      return res.status(201).send({ token: payload.rawToken, apiToken: sanitizeApiToken(record) });
    },
  });

  app.route({
    method: "GET",
    url: "/auth/api-tokens",
    schema: {
      description: "List API tokens for the authenticated user",
      tags: ["Auth"],
      security: [{ bearerAuth: [] }],
      response: { 200: z.array(ApiToken), 401: ErrorResponse },
    },
    preHandler: requireAuth,
    handler: async (req, res) => {
      if (!req.auth) return;
      const tokens = await db.query.authTokens.findMany({
        where: and(eq(authTokens.userId, req.auth.user.id), eq(authTokens.kind, "api")),
        orderBy: desc(authTokens.createdAt),
        limit: 100,
      });
      return tokens.map(sanitizeApiToken);
    },
  });

  app.route({
    method: "DELETE",
    url: "/auth/api-tokens/:id",
    schema: {
      description: "Revoke an API token",
      tags: ["Auth"],
      security: [{ bearerAuth: [] }],
      params: z.object({ id: UuidParam }),
      response: { 200: AuthOkResponse, 401: ErrorResponse, 404: ErrorResponse },
    },
    preHandler: requireAuth,
    handler: async (req, res) => {
      if (!req.auth) return;
      const [updated] = await db
        .update(authTokens)
        .set({ revoked: true, revokedAt: new Date() })
        .where(
          and(
            eq(authTokens.id, req.params.id),
            eq(authTokens.userId, req.auth.user.id),
            eq(authTokens.kind, "api"),
          ),
        )
        .returning();
      if (!updated) return res.status(404).send({ error: "Token not found" });
      return { ok: true };
    },
  });
}
