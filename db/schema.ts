import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

// A single published document. Revision checks prevent editors overwriting
// changes saved by a second browser or tab.
export const cmsDocuments = sqliteTable("cms_documents", {
  id: integer("id").primaryKey(),
  data: text("data").notNull(),
  revision: integer("revision").notNull().default(1),
  updatedAt: text("updated_at").notNull(),
  updatedBy: text("updated_by").notNull(),
});
