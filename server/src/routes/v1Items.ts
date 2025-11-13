import { z } from "zod";
import { desc, eq } from "drizzle-orm";
import { App } from "../app";
import { db } from "../db";
import { documents, items } from "../db/schema";
import { Document, ErrorResponse, IdParam, Item, ItemPost, ItemPut, OkResponse } from "./schema";

export async function v1Items(app: App) {
  // Demo Items CRUD
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
}

