# 🧭 **Retrace MVP – Product Requirements Document**

## 1. Purpose

Retrace is a local-first, small-data archiving tool that allows users to **save (“mark”)** online content such as links, tweets, or videos for later reference and re-capture.

The MVP’s goal is to provide a minimal but *correctly modeled* backend pipeline that allows:

* Users (or bots) to add URLs or text snippets via API or CLI.
* The ingestion worker to process these marks, record accesses, and create captures.
* The data to be stored relationally and easily searchable.

No front-end UI, search UX, or analytics is in scope for the MVP.

---

## 2. Core Concepts

| Concept     | Description                                                   | MVP Scope                          |
| ----------- | ------------------------------------------------------------- | ---------------------------------- |
| **Mark**    | A saved unit representing something the user decided to keep. | ✅ Primary entity                   |
| **Access**  | A single retrieval of a Mark’s resource.                      | ✅ Implemented                      |
| **Capture** | One or more files extracted from an Access.                   | ✅ Implemented                      |
| **Retrace** | The act of searching and re-finding marks.                    | 🚫 Out of scope (future analytics) |

---

## 3. User Stories

### 3.1. Core

1. **As a user**, I can mark a URL via API or CLI command (`retrace mark <url>`).
2. **As a worker**, I can fetch that URL, store access metadata, and save one or more capture files.
3. **As a user**, I can list my marks in reverse chronological order.
4. **As a system**, I can re-capture a mark later to detect changes over time.

### 3.2. Non-Goals

* No authentication or multi-user session management (basic `userId` field only).
* No search, summarization, or AI tagging.
* No distributed queue infra beyond basic BullMQ placeholder.

---

## 4. Architecture Overview

### 4.1. Components

* **Fastify API**

  * Endpoints: `POST /marks`, `GET /marks`, `GET /marks/:id`
  * Validated via Zod; OpenAPI generated via `fastify-openapi`.
* **BullMQ Worker**

  * Queue: `mark_ingestion`
  * Jobs contain `{ markId }`
  * Worker performs HTTP fetch → inserts `access` + `captures` → updates timestamps; mark reaches `success` once and is never downgraded; failures are reflected per access/capture.
* **Postgres (via Drizzle)**

  * Schema: `users`, `marks`, `accesses`, `captures`
  * UUIDv7 primary keys.
* **Filesystem / object storage**

  * Captures stored locally under `<artifactStore>/marks/<markId>/<accessId>/`.

---

## 5. Data Model

### 5.1. Schema Summary

| Table      | Description                            |
| ---------- | -------------------------------------- |
| `users`    | Concept of a user (no auth)            |
| `marks`    | User’s saved items (“things I marked”) |
| `accesses` | Each retrieval of a mark’s resource (with status) |
| `captures` | Files and data produced from an access (with status) |

```typescript
import { pgTable, uuid, text, timestamp, integer, pgEnum, boolean } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ────────────────────────────────────────────────────────────────
// ENUMS
// ────────────────────────────────────────────────────────────────

// What kind of mark this is (web link, note, upload, etc.)
export const markKindEnum = pgEnum("mark_kind", [
  "url",      // a web resource
  "note",     // plain text or markdown
  "upload",   // local file upload
  "virtual",  // synthetic / placeholder
]);

// Processing status for the mark
export const markStatusEnum = pgEnum("mark_status", [
  "pending",
  "processing",
  "success",
  "failed",
]);

// Role of each capture file
export const captureRoleEnum = pgEnum("capture_role", [
  "primary",  // main representation (HTML, text, MHTML, etc.)
  "image",
  "video",
  "meta",
  "auxiliary", // e.g., extracted JSON, PDF, etc.
]);

// ────────────────────────────────────────────────────────────────
// MARKS — user-facing saved units ("I marked this thing")
// ────────────────────────────────────────────────────────────────

export const marks = pgTable("marks", {
  id: uuid().primaryKey().default(sql`uuid_generate_v7()`),
  userId: uuid().notNull(),

  kind: markKindEnum().notNull().default("url"),
  status: markStatusEnum().notNull().default("pending"),

  url: text(),             // canonical or shared URL
  canonicalUrl: text(),
  title: text(),
  summary: text(),
  sourceType: text(),      // e.g. 'twitter', 'youtube', 'web'
  tags: text().array(),    // optional, Postgres text[]

  // when the user first saved it
  markedAt: timestamp({ withTimezone: true }).defaultNow(),
  // when last captured or accessed
  lastAccessedAt: timestamp({ withTimezone: true }),
  lastCapturedAt: timestamp({ withTimezone: true }),

  error: text(),
  createdAt: timestamp({ withTimezone: true }).defaultNow(),
  updatedAt: timestamp({ withTimezone: true }).defaultNow(),
});

// ────────────────────────────────────────────────────────────────
// ACCESSES — each retrieval of a mark’s resource
// ────────────────────────────────────────────────────────────────

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
  headers: text(), // optional serialized JSON
  error: text(),
});

// ────────────────────────────────────────────────────────────────
// CAPTURES — the actual files or representations of a given access
// ────────────────────────────────────────────────────────────────

export const captures = pgTable("captures", {
  id: uuid().primaryKey().default(sql`uuid_generate_v7()`),
  accessId: uuid()
    .notNull()
    .references(() => accesses.id, { onDelete: "cascade" }),

  order: integer().notNull().default(0),
  role: captureRoleEnum().notNull(),
  mimeType: text(),
  storageKey: text().notNull(), // file path or S3 key
  bytesSize: integer(),
  checksum: text(),

  createdAt: timestamp({ withTimezone: true }).defaultNow(),
});

// ────────────────────────────────────────────────────────────────
// INDEX RECOMMENDATIONS
// ────────────────────────────────────────────────────────────────

/*
CREATE INDEX marks_userid_markedat_idx
  ON marks (user_id, marked_at DESC);

CREATE INDEX accesses_markid_accessedat_idx
  ON accesses (mark_id, accessed_at DESC);

CREATE INDEX captures_accessid_order_idx
  ON captures (access_id, "order");
*/
```


---

## 6. Relations

### **relations.ts (skeleton)**

```ts
// imports omitted for brevity (pgTable, relations, etc.)

export const marksRelations = relations(marks, ({ many }) => ({
  accesses: many(accesses),
}));

export const accessesRelations = relations(accesses, ({ one, many }) => ({
  mark: one(marks, {
    fields: [accesses.markId],
    references: [marks.id],
  }),
  captures: many(captures),
}));

export const capturesRelations = relations(captures, ({ one }) => ({
  access: one(accesses, {
    fields: [captures.accessId],
    references: [accesses.id],
  }),
}));
```

These relations allow:

```ts
db.query.marks.findMany({
  with: {
    accesses: { with: { captures: true } },
  },
});
```

---

## 7. API Contract (MVP)

| Method                  | Path                 | Description                                   | Auth |
| ----------------------- | -------------------- | --------------------------------------------- | ---- |
| `POST /users`           | /users               | Create a user (concept only)                  | —    |
| `GET /users`            | /users               | List users                                    | —    |
| `GET /users/:id`        | /users/:id           | Fetch user                                    | —    |
| `GET /users/:id/marks`  | /users/:id/marks     | List marks for a user                         | —    |
| `POST /marks`           | /marks               | Create a new mark and enqueue ingestion       | —    |
| `GET /marks`            | /marks               | List marks (optional ?userId filter)          | —    |
| `GET /marks/:id`        | /marks/:id           | Mark with nested accesses/captures            | —    |
| `POST /marks/:id/ingest`| /marks/:id/ingest    | Trigger ingestion (creates a new access)      | —    |

**Example:**

```json
POST /marks
{
  "url": "https://twitter.com/user/status/123",
  "tags": ["meme", "ai"]
}
```

Response:

```json
{
  "id": "018f...bcb8",
  "status": "pending",
  "markedAt": "2025-11-10T23:20:00Z"
}
```

---

## 8. Worker Contract

### Queue: `mark_ingestion`

**Job payload:**

```json
{ "markId": "018f...bcb8" }
```

**Worker steps:**

1. Fetch URL (with headers, redirect, etc.)
2. Insert into `accesses`
3. Store files under `data/marks/<markId>/<accessId>/`
4. Insert `captures`
5. Update timestamps. Mark reaches `success` once a capture succeeds and never downgrades on later failures. Failures are reflected at `accesses.status` / `captures.status`.

---

## 9. Filesystem Layout

```
data/
  marks/
    <markId>/
      <accessId>/
        capture_0.html
        capture_1.jpg
        meta.json
```

* JSON metadata per capture for debugging / rebuild.
* Later, `retrace search` or `retrace diff` can operate over these directories.

---

## 10. Future Extensions (not MVP)

| Feature                 | Description                                      |
| ----------------------- | ------------------------------------------------ |
| **Retrace events**      | Track user search patterns and fuzzy retrievals. |
| **Semantic tagging**    | AI analysis of mark content.                     |
| **Version diffs**       | Compare captures between accesses.               |
| **Browser integration** | Auto-mark from share sheet / extension.          |
| **Graph linking**       | Full trace reconstruction of discovery journeys. |

---

## 11. MVP Acceptance Criteria

✅ `POST /marks` creates a new mark and queues a job.
✅ Worker fetches the URL, inserts an access and capture(s). Successful capture marks the mark as `success`; later failures do not downgrade it.
✅ `GET /marks` lists marks sorted by `markedAt` (filterable by `userId`).
✅ `GET /marks/:id` returns nested accesses + captures.
✅ Schema and relations run cleanly in Drizzle with Postgres.
✅ Files stored locally in expected directory tree.

---

Would you like me to extend this PRD with the **Fastify route schema definitions** (`marks.route.ts` skeleton with Zod) so Codex can generate the OpenAPI spec next?
