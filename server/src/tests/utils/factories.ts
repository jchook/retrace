import { randomUUID } from "node:crypto";
import { db } from "../../db";
import { authTokens, users } from "../../db/schema";
import { daysFromNow } from "../../utils/time";
import { generateBearerToken, hashApiToken, normalizeEmail } from "../../utils/auth";
import { getTestContext, namespacedLabel } from "./testContext";

type UserInsert = typeof users.$inferInsert;

export async function createTestUser(overrides: Partial<UserInsert> = {}) {
  const ctx = getTestContext();
  const email =
    overrides.email ??
    `${namespacedLabel("user")}+${randomUUID().slice(0, 8)}@integration.dc`;
  const [user] = await db
    .insert(users)
    .values({
      email: normalizeEmail(email),
      name: overrides.name ?? `Integration ${ctx.namespace}`,
    })
    .returning();
  return user;
}

export async function createApiToken(userId: string, opts?: { name?: string }) {
  const rawToken = generateBearerToken();
  const [record] = await db
    .insert(authTokens)
    .values({
      userId,
      kind: "api",
      name: opts?.name ?? "integration",
      scope: null,
      expiresAt: daysFromNow(7),
      tokenHash: hashApiToken(rawToken),
    })
    .returning();
  return { token: rawToken, record };
}
