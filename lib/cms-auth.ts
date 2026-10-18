import { CmsInputError } from "./cms-validation";

export const CMS_SESSION_COOKIE = "__Host-m3_admin";
export const CMS_SESSION_SECONDS = 8 * 60 * 60;
export const CMS_LOGIN_WINDOW_MS = 15 * 60 * 1000;
export const CMS_LOGIN_MAX_ATTEMPTS = 10;
export const CMS_LOGIN_FAILURE = "Kullanıcı adı veya şifre hatalı.";
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

function base64Bytes(value: string): Uint8Array<ArrayBuffer> | null {
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(value) || value.length % 4 !== 0) return null;
  try { return Uint8Array.from(atob(value), (character) => character.charCodeAt(0)); }
  catch { return null; }
}

export function parseCmsPasswordHash(encoded: unknown): { salt: Uint8Array<ArrayBuffer>; digest: Uint8Array<ArrayBuffer> } | null {
  if (typeof encoded !== "string" || encoded.length > 512) return null;
  const parts = encoded.split("$");
  if (parts.length !== 4 || parts[0] !== "pbkdf2-sha256" || parts[1] !== "100000") return null;
  const salt = base64Bytes(parts[2]);
  const digest = base64Bytes(parts[3]);
  if (!salt || salt.length < 16 || salt.length > 64 || !digest || digest.length !== 32) return null;
  return { salt, digest };
}

export function cmsLoginConfigured(username: unknown, hash: unknown): boolean {
  return typeof username === "string" && username.trim().length > 0 && username.trim().length <= 320 &&
    !/[\u0000-\u001f\u007f]/.test(username) && parseCmsPasswordHash(hash) !== null;
}

export async function verifyCmsPassword(password: string, encoded: unknown): Promise<boolean> {
  const parsed = parseCmsPasswordHash(encoded);
  if (!parsed || typeof password !== "string" || password.length > 1024) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const actual = new Uint8Array(await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", iterations: 100000, salt: parsed.salt }, key, 256));
  let difference = 0;
  for (let index = 0; index < 32; index++) difference |= actual[index] ^ parsed.digest[index];
  return difference === 0;
}

export async function sha256Cms(value: string): Promise<string> {
  const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function cmsCredentialVersion(username: string, hash: string): Promise<string> {
  // Changing either runtime credential invalidates existing sessions.
  return sha256Cms(`${username.trim().toLowerCase()}\n${hash}`);
}

export function cmsSessionToken(request: Request): string | null {
  const matches = (request.headers.get("cookie") ?? "").split(";").map((part) => part.trim())
    .filter((part) => part.startsWith(`${CMS_SESSION_COOKIE}=`));
  if (matches.length !== 1) return null;
  const value = matches[0].slice(CMS_SESSION_COOKIE.length + 1);
  return TOKEN_PATTERN.test(value) ? value : null;
}

export function cmsSessionCookie(token: string): string {
  if (!TOKEN_PATTERN.test(token)) throw new Error("Invalid CMS session token");
  return `${CMS_SESSION_COOKIE}=${token}; Path=/; Max-Age=${CMS_SESSION_SECONDS}; Secure; HttpOnly; SameSite=Strict`;
}

export function clearCmsSessionCookie(): string {
  return `${CMS_SESSION_COOKIE}=; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Secure; HttpOnly; SameSite=Strict`;
}

export async function createCmsSession(database: D1Database, userId: string, credentialVersion: string, now = Date.now()): Promise<string> {
  const random = crypto.getRandomValues(new Uint8Array(32));
  const token = btoa(String.fromCharCode(...random)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const hash = await sha256Cms(token);
  await database.prepare("INSERT INTO cms_admin_sessions (token_hash, user_id, credential_version, created_at, expires_at) VALUES (?, ?, ?, ?, ?)")
    .bind(hash, userId, credentialVersion, now, now + CMS_SESSION_SECONDS * 1000).run();
  return token;
}

export async function hasCmsSession(database: D1Database, token: string | null, userId: string, credentialVersion: string, now = Date.now()): Promise<boolean> {
  if (!token || !TOKEN_PATTERN.test(token)) return false;
  const row = await database.prepare("SELECT token_hash FROM cms_admin_sessions WHERE token_hash = ? AND user_id = ? AND credential_version = ? AND expires_at > ?")
    .bind(await sha256Cms(token), userId, credentialVersion, now).first<{ token_hash: string }>();
  return row !== null;
}

export async function revokeCmsSession(database: D1Database, token: string | null, userId: string): Promise<void> {
  if (!token || !TOKEN_PATTERN.test(token)) return;
  await database.prepare("DELETE FROM cms_admin_sessions WHERE token_hash = ? AND user_id = ?").bind(await sha256Cms(token), userId).run();
}

export async function cleanupCmsAuth(database: D1Database, now = Date.now()): Promise<void> {
  // Bounded work per login, using expiry indexes. Never rewrite migrations or
  // create tables in a request handler.
  await database.batch([
    database.prepare("DELETE FROM cms_admin_sessions WHERE token_hash IN (SELECT token_hash FROM cms_admin_sessions WHERE expires_at <= ? ORDER BY expires_at LIMIT 100)").bind(now),
    database.prepare("DELETE FROM cms_login_attempts WHERE key IN (SELECT key FROM cms_login_attempts WHERE expires_at <= ? ORDER BY expires_at LIMIT 100)").bind(now),
  ]);
}

export async function cmsRateLimitKey(request: Request): Promise<string> {
  // Sites supplies stable identity and Cloudflare supplies CF-Connecting-IP.
  // Forwarded-for and browser username fields are deliberately not trusted.
  const identity = request.headers.get("oai-authenticated-user-id")?.trim() || "anonymous";
  const address = request.headers.get("cf-connecting-ip")?.trim() || "unknown";
  // D1 is isolated to this Site; do not make a client-selected host or login
  // name part of the key, which could be rotated to evade the limit.
  return sha256Cms(`identity-ip\n${identity}\n${address}`);
}

export async function cmsIdentityRateLimitKey(request: Request): Promise<string | null> {
  const identity = request.headers.get("oai-authenticated-user-id")?.trim();
  // A second owner-identity bucket also limits attempts across IP changes.
  // Do not share an anonymous aggregate bucket between unrelated visitors.
  return identity ? sha256Cms(`identity\n${identity}`) : null;
}

export async function consumeCmsLoginAttempt(database: D1Database, key: string, now = Date.now()): Promise<{ allowed: boolean; retryAfter: number }> {
  // An atomic conditional UPSERT enforces the cap even when attempts race.
  const row = await database.prepare("INSERT INTO cms_login_attempts (key, attempts, expires_at) VALUES (?, 1, ?) ON CONFLICT(key) DO UPDATE SET attempts = CASE WHEN cms_login_attempts.expires_at <= ? THEN 1 ELSE cms_login_attempts.attempts + 1 END, expires_at = CASE WHEN cms_login_attempts.expires_at <= ? THEN ? ELSE cms_login_attempts.expires_at END WHERE cms_login_attempts.expires_at <= ? OR cms_login_attempts.attempts < ? RETURNING attempts, expires_at")
    .bind(key, now + CMS_LOGIN_WINDOW_MS, now, now, now + CMS_LOGIN_WINDOW_MS, now, CMS_LOGIN_MAX_ATTEMPTS)
    .first<{ attempts: number; expires_at: number }>();
  if (row) return { allowed: true, retryAfter: 0 };
  const current = await database.prepare("SELECT expires_at FROM cms_login_attempts WHERE key = ?").bind(key).first<{ expires_at: number }>();
  return { allowed: false, retryAfter: Math.max(1, Math.ceil(((current?.expires_at ?? now + CMS_LOGIN_WINDOW_MS) - now) / 1000)) };
}

export function parseCmsLoginPayload(value: unknown): { username: string; password: string } {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new CmsInputError(CMS_LOGIN_FAILURE, 401);
  const { username, password } = value as Record<string, unknown>;
  if (typeof username !== "string" || !username.trim() || username.length > 320 || /[\u0000-\u001f\u007f]/.test(username) ||
      typeof password !== "string" || !password || password.length > 1024 || password.includes("\0")) {
    throw new CmsInputError(CMS_LOGIN_FAILURE, 401);
  }
  return { username: username.trim().toLowerCase(), password };
}
