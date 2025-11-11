import { pgTable, serial, varchar, integer, timestamp, text, pgEnum, uuid, bigint, index, uniqueIndex, boolean } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// Example entity: Items
export const items = pgTable("items", {
  id: serial().primaryKey(),
  title: varchar({ length: 255 }).notNull(),
  description: text(),
  createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
});

// Uploaded documents
export const storageType = pgEnum("storage_type", ["local", "s3"]);

export const documents = pgTable("documents", {
  id: serial().primaryKey(),
  itemId: integer()
    .references(() => items.id)
    .notNull(),
  filename: varchar({ length: 255 }).notNull(),
  mimetype: varchar({ length: 127 }),
  size: integer(), // in bytes
  uploadedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  storagePath: varchar({ length: 2048 }).notNull(),
  storageType: storageType().default("local").notNull(),
});

// ────────────────────────────────────────────────────────────────
// Retrace PRD schema
// ────────────────────────────────────────────────────────────────

// Enums
export const markKindEnum = pgEnum("mark_kind", ["url", "note", "upload", "virtual"]);
export const markStatusEnum = pgEnum("mark_status", ["pending", "processing", "success", "failed"]);
export const captureRoleEnum = pgEnum("capture_role", ["primary", "image", "video", "meta", "auxiliary"]);
export const accessStatusEnum = pgEnum("access_status", ["pending", "success", "failed", "incomplete"]);
export const captureStatusEnum = pgEnum("capture_status", ["pending", "success", "failed", "incomplete"]);

// Tables
export const users = pgTable("users", {
  id: uuid().primaryKey().default(sql`uuidv7()`),
  name: text(),
  email: text().notNull(),
  createdAt: timestamp({ withTimezone: true }).defaultNow(),
  updatedAt: timestamp({ withTimezone: true }).defaultNow(),
}, (t) => [
  uniqueIndex("users_email_idx").on(t.email),
]);

// Unified auth tokens (login OTPs and API tokens)
export const authTokenKind = pgEnum("auth_token_kind", ["login", "api"]);

export const authTokens = pgTable("auth_tokens", {
  id: uuid().primaryKey().default(sql`uuidv7()`),
  userId: uuid().notNull().references(() => users.id, { onDelete: "cascade" }),
  kind: authTokenKind().notNull(),

  tokenHash: text().notNull(),
  name: text(),
  scope: text().array(),

  expiresAt: timestamp({ withTimezone: true }).notNull(),
  lastUsedAt: timestamp({ withTimezone: true }),
  revoked: boolean().notNull().default(false),
  createdAt: timestamp({ withTimezone: true }).defaultNow(),
}, (t) => [
  uniqueIndex("auth_tokens_token_hash_idx").on(t.tokenHash),
  index("auth_tokens_user_idx").on(t.userId),
  index("auth_tokens_user_expires_idx").on(t.userId, t.expiresAt),
]);

export const marks = pgTable("marks", {
  id: uuid().primaryKey().default(sql`uuidv7()`),
  userId: uuid()
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),

  kind: markKindEnum().notNull().default("url"),
  status: markStatusEnum().notNull().default("pending"),

  url: text(),
  canonicalUrl: text(),
  title: text(),
  summary: text(),
  sourceType: text(),
  tags: text().array(),

  markedAt: timestamp({ withTimezone: true }).defaultNow(),
  lastAccessedAt: timestamp({ withTimezone: true }),
  lastCapturedAt: timestamp({ withTimezone: true }),

  error: text(),
  createdAt: timestamp({ withTimezone: true }).defaultNow(),
  updatedAt: timestamp({ withTimezone: true }).defaultNow(),
}, (t) => [
  index("marks_user_marked_at_idx").on(t.userId, t.markedAt),
]);

export const accesses = pgTable("accesses", {
  id: uuid().primaryKey().default(sql`uuidv7()`),
  markId: uuid()
    .notNull()
    .references(() => marks.id, { onDelete: "cascade" }),

  status: accessStatusEnum().notNull().default("pending"),
  accessedAt: timestamp({ withTimezone: true }).defaultNow(),
  statusCode: integer(),
  mimeType: text(),
  etag: text(),
  contentLength: bigint({ mode: "number" }),
  headers: text(),
  error: text(),
}, (t) => [
  index("accesses_mark_accessed_at_idx").on(t.markId, t.accessedAt),
]);

export const captures = pgTable("captures", {
  id: uuid().primaryKey().default(sql`uuidv7()`),
  accessId: uuid()
    .notNull()
    .references(() => accesses.id, { onDelete: "cascade" }),

  order: integer().notNull().default(0),
  role: captureRoleEnum().notNull(),
  status: captureStatusEnum().notNull().default("pending"),
  mimeType: text(),
  storageKey: text().notNull(),
  bytesSize: bigint({ mode: "number" }),
  checksum: text(),

  createdAt: timestamp({ withTimezone: true }).defaultNow(),
}, (t) => [
  index("captures_access_order_idx").on(t.accessId, t.order),
]);
