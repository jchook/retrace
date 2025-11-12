import { createHash, randomBytes, randomInt } from "node:crypto";
import { authTokens } from "../db/schema";

export type AuthTokenRow = typeof authTokens.$inferSelect;
export type SanitizedApiToken = Omit<AuthTokenRow, "tokenHash"> & { kind: "api" };

export const normalizeEmail = (email: string) => email.trim().toLowerCase();

export const hashValue = (value: string) => createHash("sha256").update(value).digest("hex");
export const hashOtp = (userId: string, code: string) => hashValue(`${userId}:${code}`);
export const hashApiToken = (token: string) => hashValue(token);

export const generateOtpCode = () => randomInt(0, 1_000_000).toString().padStart(6, "0");
export const generateBearerToken = () => randomBytes(32).toString("hex");

export const sanitizeApiToken = (token: AuthTokenRow): SanitizedApiToken => {
  if (token.kind !== "api") throw new Error("Expected API token");
  const { tokenHash, ...rest } = token;
  return { ...rest, kind: "api" };
};
