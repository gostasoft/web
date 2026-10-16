import type { CmsDocument } from "./cms-validation";

export type CmsSnapshot = { data: CmsDocument | null; revision: number };

export async function readStoredCmsDocument(database: D1Database): Promise<CmsSnapshot> {
  const row = await database.prepare("SELECT data, revision FROM cms_documents WHERE id = 1")
    .first<{ data: string; revision: number }>();
  return row ? { data: JSON.parse(row.data) as CmsDocument, revision: row.revision } : { data: null, revision: 0 };
}

export async function saveStoredCmsDocument(database: D1Database, data: CmsDocument, revision: number, userId: string): Promise<number | null> {
  const serialized = JSON.stringify(data);
  const timestamp = new Date().toISOString();
  // Each save uses one atomic statement. A concurrent first save cannot claim
  // an existing document, and an old revision cannot overwrite new content.
  const statement = revision === 0
    ? database.prepare("INSERT INTO cms_documents (id, data, revision, updated_at, updated_by) VALUES (1, ?, 1, ?, ?) ON CONFLICT(id) DO NOTHING RETURNING revision")
      .bind(serialized, timestamp, userId)
    : database.prepare("UPDATE cms_documents SET data = ?, revision = revision + 1, updated_at = ?, updated_by = ? WHERE id = 1 AND revision = ? RETURNING revision")
      .bind(serialized, timestamp, userId, revision);
  const row = await statement.first<{ revision: number }>();
  return row?.revision ?? null;
}
