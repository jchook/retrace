import fs from "fs";
import { z } from "zod";
import { App } from "../app";
import { config, ConfigSchema } from "../app/config";
import { db } from "../db";
import { accesses, captures, documents, items, marks, users } from "../db/schema";
import { getVersionString } from "../app/meta";
import {
  Binary,
  Document,
  ErrorResponse,
  IdParam,
  Item,
  ItemPost,
  ItemPut,
  Mark,
  MarkPost,
  MarkWithAccessesAndCaptures,
  OkResponse,
  UuidParam,
  User,
  UserPost,
} from "./schema";
import { asc, desc, eq } from "drizzle-orm";
import { enqueueMarkIngestion } from "../utils/queue";
import { saveDocumentFile } from "../utils/documents";

export function withDemo(app: App) {
  // Users (concept only, no auth)
  app.route({
    method: "POST",
    url: "/users",
    schema: {
      description: "Create a user (no auth)",
      tags: ["Users"],
      body: UserPost,
      response: { 201: User },
    },
    handler: async (req, res) => {
      const [created] = await db.insert(users).values(req.body).returning();
      return res.status(201).send(created);
    },
  });

  app.route({
    method: "GET",
    url: "/users",
    schema: {
      description: "List users",
      tags: ["Users"],
      response: { 200: z.array(User) },
    },
    handler: async () => {
      return db.query.users.findMany({ orderBy: asc(users.createdAt), limit: 200 });
    },
  });

  app.route({
    method: "GET",
    url: "/users/:id",
    schema: {
      description: "Get user by id",
      tags: ["Users"],
      params: z.object({ id: UuidParam }),
      response: { 200: User, 404: ErrorResponse },
    },
    handler: async (req, res) => {
      const user = await db.query.users.findFirst({ where: eq(users.id, req.params.id) });
      if (!user) return res.status(404).send({ error: "User not found" });
      return user;
    },
  });

  app.route({
    method: "GET",
    url: "/users/:id/marks",
    schema: {
      description: "List marks for a user",
      tags: ["Users", "Marks"],
      params: z.object({ id: UuidParam }),
      response: { 200: z.array(Mark) },
    },
    handler: async (req) => {
      return db.query.marks.findMany({
        where: eq(marks.userId, req.params.id),
        orderBy: desc(marks.markedAt),
        limit: 100,
      });
    },
  });

  // Marks (PRD MVP)
  app.route({
    method: "POST",
    url: "/marks",
    schema: {
      description: "Create a new mark",
      tags: ["Marks"],
      body: MarkPost,
      response: { 201: Mark },
    },
    handler: async (req, res) => {
      const [created] = await db.insert(marks).values(req.body).returning();
      await enqueueMarkIngestion(created.id, req.log);
      return res.status(201).send(created);
    },
  });

  // Trigger re-capture/ingestion for existing mark (creates a new access)
  app.route({
    method: "POST",
    url: "/marks/:id/ingest",
    schema: {
      description: "Queue ingestion to create a new access",
      tags: ["Marks", "Accesses"],
      params: z.object({ id: UuidParam }),
      response: { 202: OkResponse, 404: ErrorResponse },
    },
    handler: async (req, res) => {
      const mark = await db.query.marks.findFirst({ where: eq(marks.id, req.params.id) });
      if (!mark) return res.status(404).send({ error: "Mark not found" });
      await enqueueMarkIngestion(mark.id, req.log);
      return res.status(202).send({ ok: true });
    },
  });

  app.route({
    method: "GET",
    url: "/marks",
    schema: {
      description: "List marks (latest first)",
      tags: ["Marks"],
      querystring: z.object({ userId: z.string().uuid().optional() }),
      response: { 200: z.array(Mark) },
    },
    handler: async (req) => {
      const q = req.query.userId
        ? { where: eq(marks.userId, req.query.userId), orderBy: desc(marks.markedAt), limit: 100 }
        : { orderBy: desc(marks.markedAt), limit: 100 };
      return db.query.marks.findMany(q as any);
    },
  });

  app.route({
    method: "GET",
    url: "/marks/:id",
    schema: {
      description: "Fetch one mark with nested accesses/captures",
      tags: ["Marks"],
      params: z.object({ id: UuidParam }),
      response: { 200: MarkWithAccessesAndCaptures, 404: ErrorResponse },
    },
    handler: async (req, res) => {
      const mark = await db.query.marks.findFirst({
        where: eq(marks.id, req.params.id),
        with: {
          accesses: {
            orderBy: desc(accesses.accessedAt),
            with: {
              captures: {
                orderBy: asc(captures.order),
              },
            },
          },
        },
      });
      if (!mark) return res.status(404).send({ error: "Mark not found" });
      return mark as any;
    },
  });

  // Items CRUD
  app.route({
    method: "POST",
    url: "/items",
    schema: {
      description: "Create a new item",
      tags: ["Items"],
      body: ItemPost,
      response: { 201: Item },
    },
    handler: async (req, res) => {
      const [created] = await db.insert(items).values(req.body).returning();
      return res.status(201).send(created);
    },
  });

  app.route({
    method: "GET",
    url: "/items",
    schema: {
      description: "Get a list of recent items",
      tags: ["Items"],
      response: { 200: z.array(Item) },
    },
    handler: async () => {
      return db.query.items.findMany({ orderBy: desc(items.id), limit: 50 });
    },
  });

  app.route({
    method: "GET",
    url: "/items/:id",
    schema: {
      description: "Get an item by ID",
      tags: ["Items"],
      params: z.object({ id: IdParam }),
      response: { 200: Item, 404: ErrorResponse },
    },
    handler: async (req, res) => {
      const item = await db.query.items.findFirst({ where: eq(items.id, req.params.id) });
      if (!item) return res.status(404).send({ error: "Item not found" });
      return item;
    },
  });

  app.route({
    method: "GET",
    url: "/items/:id/documents",
    schema: {
      description: "List documents for an item",
      tags: ["Documents"],
      params: z.object({ id: IdParam }),
      response: { 200: z.array(Document) },
    },
    handler: async (req) => {
      return db.query.documents.findMany({
        where: eq(documents.itemId, req.params.id),
        orderBy: desc(documents.id),
        limit: 100,
      });
    },
  });

  app.route({
    method: "PUT",
    url: "/items/:id",
    schema: {
      description: "Update an item",
      tags: ["Items"],
      params: z.object({ id: IdParam }),
      body: ItemPut,
      response: { 200: Item, 404: ErrorResponse },
    },
    handler: async (req, res) => {
      const [updated] = await db
        .update(items)
        .set(req.body)
        .where(eq(items.id, req.params.id))
        .returning();
      if (!updated) return res.status(404).send({ error: "Item not found" });
      return updated;
    },
  });

  app.route({
    method: "DELETE",
    url: "/items/:id",
    schema: {
      description: "Delete an item",
      tags: ["Items"],
      params: z.object({ id: IdParam }),
      response: { 200: OkResponse },
    },
    handler: async (req) => {
      await db.delete(items).where(eq(items.id, req.params.id));
      return { ok: true };
    },
  });

  app.route({
    method: "POST",
    url: "/documents",
    schema: {
      description: "Upload documents for an item",
      tags: ["Documents"],
      querystring: z.object({ itemId: z.coerce.number().int().positive() }),
      response: {
        200: z.object({
          message: z.string(),
          documents: z.array(Document),
        }),
      },
    },
    handler: async (req, res) => {
      const itemId = req.query.itemId;
      const parts = req.parts();
      const insertedDocs: any[] = [];

      for await (const part of parts) {
        if (part.type === "file") {
          part.file.on("error", (err) => req.log.error({ err }, "File stream error"));
          const stored = await saveDocumentFile(part, itemId, config.storage);
          const [inserted] = await db
            .insert(documents)
            .values({
              itemId,
              filename: stored.originalName,
              mimetype: stored.mimetype,
              size: stored.size,
              storagePath: stored.storagePath,
              storageType: "local",
            })
            .returning();
          insertedDocs.push(inserted);
        } else {
          req.log.info({ field: part.fieldname, value: part.value }, "Received form field");
        }
      }

      return res.status(200).send({
        message: "Documents uploaded",
        documents: insertedDocs,
      });
    },
  });

  app.route({
    method: "GET",
    url: "/documents/:id/file",
    schema: {
      description: "Download a document file",
      tags: ["Documents"],
      params: z.object({ id: IdParam }),
      response: {
        200: {
          description: "Raw file bytes",
          content: {
            "application/octet-stream": {
              schema: Binary,
            },
          },
        },
        404: ErrorResponse.openapi({
          example: { error: "Document not found" },
        }),
      },
    },
    handler: async (req, res) => {
      const document = await db.query.documents.findFirst({
        where: eq(documents.id, req.params.id),
      });

      if (!document) {
        return res.status(404).send({ error: "Document not found" });
      }

      try {
        await fs.promises.access(document.storagePath);
      } catch (err) {
        return res.status(404).send({ error: "File not found" });
      }

      res.header("Content-Type", document.mimetype || "application/octet-stream");
      res.header("Content-Disposition", `inline; filename="${document.filename}"`);
      if (document.size) {
        res.header("Content-Length", document.size.toString());
      }

      return res.send(fs.createReadStream(document.storagePath));
    },
  });

  app.route({
    method: "GET",
    url: "/meta/docs/json",
    schema: {
      description: "Get this API's OpenAPI specification in JSON format",
      tags: ["Meta"],
    },
    handler: async () => {
      return app.swagger();
    },
  });

  ["/meta/info", "/"].forEach((route) => {
    app.route({
      method: "GET",
      url: route,
      schema: {
        description: "Get this API's version and other meta information",
        tags: ["Meta"],
        response: {
          200: ConfigSchema,
        },
      },
      handler: async () => {
        if (!config.version) {
          config.version = await getVersionString();
        }
        return config;
      },
    });
  });
}
