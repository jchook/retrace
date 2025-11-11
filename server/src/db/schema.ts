import { pgTable, serial, varchar, integer, timestamp, text, pgEnum, uuid } from "drizzle-orm/pg-core";
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

// Tables
export const users = pgTable("users", {
  id: uuid().primaryKey().default(sql`uuid_generate_v7()`),
  name: text().notNull(),
  email: text(),
  createdAt: timestamp({ withTimezone: true }).defaultNow(),
  updatedAt: timestamp({ withTimezone: true }).defaultNow(),
});

export const marks = pgTable("marks", {
  id: uuid().primaryKey().default(sql`uuid_generate_v7()`),
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
});

export const accesses = pgTable("accesses", {
  id: uuid().primaryKey().default(sql`uuid_generate_v7()`),
  markId: uuid()
    .notNull()
    .references(() => marks.id, { onDelete: "cascade" }),

  accessedAt: timestamp({ withTimezone: true }).defaultNow(),
  statusCode: integer(),
  mimeType: text(),
  etag: text(),
  contentLength: integer(),
  headers: text(),
  error: text(),
});

export const captures = pgTable("captures", {
  id: uuid().primaryKey().default(sql`uuid_generate_v7()`),
  accessId: uuid()
    .notNull()
    .references(() => accesses.id, { onDelete: "cascade" }),

  order: integer().notNull().default(0),
  role: captureRoleEnum().notNull(),
  mimeType: text(),
  storageKey: text().notNull(),
  bytesSize: integer(),
  checksum: text(),

  createdAt: timestamp({ withTimezone: true }).defaultNow(),
});
