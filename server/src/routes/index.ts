import fs from "fs";
import path from "path";
import { createHash } from "node:crypto";
import { pipeline, Transform } from "node:stream";
import { promisify } from "node:util";
import { z } from "zod";
import { getVersionString } from "../app/meta";
import { Binary, Document, ErrorResponse, IdParam, Item, ItemPost, ItemPut } from "./schema";
import { config, ConfigSchema } from "../app/config";
import { App } from "../app";
import { db } from "../db";
import { documents, items } from "../db/schema";
import { desc, eq } from "drizzle-orm";

const pipelineAsync = promisify(pipeline);

export function withV1(app: App) {
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
      response: { 200: Item },
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
      response: { 200: Item },
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
      response: { 200: z.object({ ok: z.boolean() }) },
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
          part.file.on("error", (err) => {
            req.log.error({ err }, "File stream error");
          });
          const originalName = part.filename ?? "unnamed";
          const hash = createHash("sha256");
          const ext = path.extname(originalName);
          const base = path.basename(originalName, ext);
          const tmpPath = path.join(
            config.documentStore,
            `tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          );
          const tmpFile = fs.createWriteStream(tmpPath);

          let totalBytes = 0;

          await pipelineAsync(
            part.file,
            new Transform({
              transform(chunk, _enc, cb) {
                hash.update(chunk);
                totalBytes += chunk.length;
                cb(null, chunk);
              },
            }),
            tmpFile,
          );

          const digest = hash.digest("hex").slice(0, 12);
          const prefix = `${digest}_`;
          const maxBaseLength = 255 - prefix.length - ext.length;

          const safeBase = base.slice(0, maxBaseLength);
          const safeFilename = `${prefix}${safeBase}${ext}`;
          const itemDir = path.join(config.documentStore, itemId.toString());
          await fs.promises.mkdir(itemDir, { recursive: true });
          const finalPath = path.join(itemDir, safeFilename);

          const [inserted] = await db
            .insert(documents)
            .values({
              itemId,
              filename: originalName,
              mimetype: part.mimetype || null,
              size: totalBytes,
              storagePath: finalPath,
              storageType: "local",
            })
            .returning();

          await fs.promises.rename(tmpPath, finalPath);
          insertedDocs.push(inserted);
        } else {
          req.log.info("Received field:", part.fieldname, part.value);
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

      // Check if file exists based on storage type
      try {
        await fs.promises.access(document.storagePath);
      } catch (err) {
        return res.status(404).send({ error: "File not found" });
      }

      // Set appropriate headers
      res.header(
        "Content-Type",
        document.mimetype || "application/octet-stream",
      );
      res.header(
        "Content-Disposition",
        `inline; filename="${document.filename}"`,
      );
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
