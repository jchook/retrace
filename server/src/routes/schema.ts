import { Readable } from "node:stream";
import { z } from "zod";
import { createSchemaFactory, createSelectSchema } from "drizzle-zod";
import { documents, items, marks, accesses, captures, users } from "../db/schema";

const { createInsertSchema } = createSchemaFactory({
  coerce: { date: true },
});

// Shared ID schemas
export const IdParam = z.coerce
  .number()
  .int()
  .positive()
  .max(2 ** 31 - 1)
  .describe("Entity ID")
  .openapi({ ref: "IdParam", description: "Entity ID" });

export const Id = z
  .number()
  .int()
  .positive()
  .max(2 ** 31 - 1)
  .openapi({ ref: "Id", description: "Entity ID" });

// Example date for docs
const ExampleDate = new Date("2025-05-01T08:46:40Z");

// Binary file response
type BinaryLike = Readable | Buffer;
export const Binary = z
  .custom<BinaryLike>(() => true)
  .openapi({ ref: "Binary", type: "string", format: "binary", description: "Raw file bytes" });

// Item schemas
export const Item = createSelectSchema(items)
  .extend({ id: Id })
  .openapi({
    ref: "Item",
    example: {
      id: 1,
      title: "Sample Item",
      description: "Optional description",
      createdAt: ExampleDate,
    },
  });

export const ItemPost = createInsertSchema(items).openapi({
  ref: "ItemPost",
  example: { title: "My First Item", description: "Hello world" },
});

export const ItemPut = ItemPost.partial().openapi({ ref: "ItemPut" });

// Document schemas
export const Document = createSelectSchema(documents)
  .extend({ id: Id })
  .openapi({
    ref: "Document",
    example: {
      id: 1,
      itemId: 1,
      filename: "Document_1.pdf",
      storageType: "local",
      storagePath: "/path/to/document",
      mimetype: "application/pdf",
      size: 123456,
      uploadedAt: ExampleDate,
    },
  });

export const ErrorResponse = z.object({ error: z.string() });

// ────────────────────────────────────────────────────────────────
// Retrace PRD route schemas — derived from Drizzle tables
// Single source of truth: server/src/db/schema.ts
// ────────────────────────────────────────────────────────────────

export const Uuid = z.string().uuid().openapi({ ref: "Uuid", description: "UUID" });
export const UuidParam = z.string().uuid().openapi({ ref: "UuidParam", description: "UUID path param" });

export const Capture = createSelectSchema(captures).openapi({
  ref: "Capture",
  example: {
    id: "018f0000-aaaa-bbbb-cccc-000000000001",
    accessId: "018f0000-aaaa-bbbb-cccc-000000000000",
    order: 0,
    role: "primary",
    mimeType: "text/html",
    storageKey: "marks/018f.../018f.../capture_0.html",
    bytesSize: "20480",
    checksum: "sha256:deadbeef",
    createdAt: ExampleDate,
  },
});

export const Access = createSelectSchema(accesses).openapi({
  ref: "Access",
  example: {
    id: "018f0000-aaaa-bbbb-cccc-000000000000",
    markId: "018f0000-aaaa-bbbb-cccc-111111111111",
    accessedAt: ExampleDate,
    statusCode: 200,
    mimeType: "text/html",
    etag: "\"1234abcd\"",
    contentLength: "20480",
    headers: "{\"content-type\":\"text/html\"}",
    error: null,
  },
});

export const Mark = createSelectSchema(marks).openapi({
  ref: "Mark",
  example: {
    id: "018f0000-aaaa-bbbb-cccc-111111111111",
    userId: "018f0000-aaaa-bbbb-cccc-222222222222",
    kind: "url",
    status: "pending",
    url: "https://example.com",
    canonicalUrl: "https://example.com",
    title: "Example",
    summary: "Short summary",
    sourceType: "web",
    tags: ["example", "test"],
    markedAt: ExampleDate,
    lastAccessedAt: ExampleDate,
    lastCapturedAt: ExampleDate,
    error: null,
    createdAt: ExampleDate,
    updatedAt: ExampleDate,
  },
});

export const MarkPost = createInsertSchema(marks).openapi({
  ref: "MarkPost",
  example: {
    userId: "018f0000-aaaa-bbbb-cccc-222222222222",
    url: "https://twitter.com/user/status/123",
    tags: ["meme", "ai"],
    kind: "url",
  },
});

export const User = createSelectSchema(users).openapi({
  ref: "User",
  example: {
    id: "018f0000-aaaa-bbbb-cccc-333333333333",
    name: "Ada Lovelace",
    email: "ada@example.com",
    createdAt: ExampleDate,
    updatedAt: ExampleDate,
  },
});

export const UserPost = createInsertSchema(users).openapi({
  ref: "UserPost",
  example: {
    name: "Ada Lovelace",
    email: "ada@example.com",
  },
});

export const AccessWithCaptures = Access.extend({ captures: z.array(Capture) }).openapi({ ref: "AccessWithCaptures" });
export const MarkWithAccesses = Mark.extend({ accesses: z.array(Access) }).openapi({ ref: "MarkWithAccesses" });
export const MarkWithAccessesAndCaptures = Mark.extend({
  accesses: z.array(AccessWithCaptures),
}).openapi({ ref: "MarkWithAccessesAndCaptures" });
