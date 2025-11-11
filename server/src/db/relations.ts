import { relations } from "drizzle-orm";
import { documents, items, marks, accesses, captures, users } from "./schema";

export const itemRelations = relations(items, ({ many }) => ({
  documents: many(documents),
}));

export const documentRelations = relations(documents, ({ one }) => ({
  item: one(items, {
    fields: [documents.itemId],
    references: [items.id],
  }),
}));

export const marksRelations = relations(marks, ({ one, many }) => ({
  accesses: many(accesses),
  user: one(users, {
    fields: [marks.userId],
    references: [users.id],
  }),
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

export const usersRelations = relations(users, ({ many }) => ({
  marks: many(marks),
}));
