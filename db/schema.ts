import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

// A single published document. Revision checks prevent editors overwriting
// changes saved by a second browser or tab.
export const cmsDocuments = sqliteTable("cms_documents", {
  id: integer("id").primaryKey(),
  data: text("data").notNull(),
  revision: integer("revision").notNull().default(1),
  updatedAt: text("updated_at").notNull(),
  updatedBy: text("updated_by").notNull(),
});

export const cmsAdminSessions = sqliteTable("cms_admin_sessions", {
  tokenHash: text("token_hash").primaryKey(),
  userId: text("user_id").notNull(),
  credentialVersion: text("credential_version").notNull(),
  createdAt: integer("created_at").notNull(),
  expiresAt: integer("expires_at").notNull(),
}, (table) => [index("cms_admin_sessions_expires_idx").on(table.expiresAt)]);

export const cmsLoginAttempts = sqliteTable("cms_login_attempts", {
  key: text("key").primaryKey(),
  attempts: integer("attempts").notNull(),
  expiresAt: integer("expires_at").notNull(),
}, (table) => [index("cms_login_attempts_expires_idx").on(table.expiresAt)]);
