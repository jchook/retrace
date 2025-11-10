import { relations } from "drizzle-orm";
import { documents, items, marks, accesses, captures } from "./schema";

export const itemRelations = relations(items, ({ many }) => ({
  documents: many(documents),
}));

export const documentRelations = relations(documents, ({ one }) => ({
  item: one(items, {
    fields: [documents.itemId],
    references: [items.id],
  }),
}));

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
