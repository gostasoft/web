import { env } from "cloudflare:workers";
import { authorizeCmsAdmin, type CmsAdmin } from "./cms-security";
import { CmsInputError, type CmsDocument } from "./cms-validation";
import { readStoredCmsDocument, saveStoredCmsDocument, type CmsSnapshot } from "./cms-store";
import { cmsCredentialVersion, cmsLoginConfigured, cmsSessionToken, hasCmsSession } from "./cms-auth";

export function cmsJson(value: unknown, status = 200): Response {
  return Response.json(value, { status, headers: {
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "Vary": "Cookie",
  } });
}

export function cmsError(error: unknown): Response {
  if (error instanceof CmsInputError) return cmsJson({ error: error.message }, error.status);
  // Do not disclose storage details, identity configuration or source errors.
  console.error("CMS operation failed", error instanceof Error ? error.message : "unknown error");
  return cmsJson({ error: "İşlem tamamlanamadı. Lütfen yeniden dene." }, 503);
}

export async function getCmsAdmin(request: Request): Promise<CmsAdmin> {
  const admin = authorizeCmsAdmin(request.headers, env.CMS_ADMIN_EMAIL);
  if (!cmsLoginConfigured(env.CMS_LOGIN_EMAIL, env.CMS_PASSWORD_HASH)) {
    throw new CmsInputError("Yönetici oturumu gerekli. Lütfen yeniden giriş yap.", 401);
  }
  const credentialVersion = await cmsCredentialVersion(env.CMS_LOGIN_EMAIL!, env.CMS_PASSWORD_HASH!);
  const token = cmsSessionToken(request);
  if (!await hasCmsSession(cmsDb(), token, admin.id, credentialVersion)) {
    throw new CmsInputError("Yönetici oturumu gerekli. Lütfen yeniden giriş yap.", 401);
  }
  return admin;
}

export function cmsDb(): D1Database {
  if (!env.DB) throw new CmsInputError("İçerik deposu henüz hazır değil.", 503);
  return env.DB;
}

export function cmsBucket(): R2Bucket {
  if (!env.BUCKET) throw new CmsInputError("Görsel deposu henüz hazır değil.", 503);
  return env.BUCKET;
}

export async function readCmsDocument(): Promise<CmsSnapshot> {
  return readStoredCmsDocument(cmsDb());
}

export async function saveCmsDocument(data: CmsDocument, revision: number, userId: string): Promise<number | null> {
  return saveStoredCmsDocument(cmsDb(), data, revision, userId);
}
