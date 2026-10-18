import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import { pbkdf2Sync, randomBytes } from "node:crypto";
import { DatabaseSync } from "node:sqlite";

const source = (file) => readFileSync(new URL(file, import.meta.url), "utf8");
const moduleUrl = (code) => `data:text/javascript;base64,${Buffer.from(stripTypeScriptTypes(code)).toString("base64")}`;
const validationUrl = moduleUrl(source("./cms-validation.ts"));
const securityUrl = moduleUrl(source("./cms-security.ts").replace('"./cms-validation"', JSON.stringify(validationUrl)));
const storeUrl = moduleUrl(source("./cms-store.ts"));
const authUrl = moduleUrl(source("./cms-auth.ts").replace('"./cms-validation"', JSON.stringify(validationUrl)));
const auth = await import(authUrl);
const testEnv = {};
globalThis.__cmsAuthTestEnvironment = testEnv;

function wireServer(code) {
  return code.replace('import { env } from "cloudflare:workers";', "const env = globalThis.__cmsAuthTestEnvironment;")
    .replaceAll('"./cms-security"', JSON.stringify(securityUrl))
    .replaceAll('"@/lib/cms-security"', JSON.stringify(securityUrl))
    .replaceAll('"./cms-validation"', JSON.stringify(validationUrl))
    .replaceAll('"@/lib/cms-validation"', JSON.stringify(validationUrl))
    .replaceAll('"./cms-store"', JSON.stringify(storeUrl))
    .replaceAll('"./cms-auth"', JSON.stringify(authUrl))
    .replaceAll('"@/lib/cms-auth"', JSON.stringify(authUrl));
}
const serverUrl = moduleUrl(wireServer(source("./cms-server.ts")));
const { getCmsAdmin } = await import(serverUrl);
const { POST: login } = await import(moduleUrl(wireServer(source("../app/api/auth/login/route.ts")).replace('"@/lib/cms-server"', JSON.stringify(serverUrl))));
const { POST: logout } = await import(moduleUrl(wireServer(source("../app/api/auth/logout/route.ts")).replace('"@/lib/cms-server"', JSON.stringify(serverUrl))));

function database() {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec(source("../drizzle/0001_true_sharon_carter.sql"));
  const db = { prepare(sql) {
    const statement = sqlite.prepare(sql);
    let args = [];
    const query = {
      bind(...values) { args = values; return query; },
      async first() { return statement.get(...args) ?? null; },
      async run() { return statement.run(...args); },
    };
    return query;
  }, async batch(statements) {
    sqlite.exec("BEGIN");
    try { const results = []; for (const statement of statements) results.push(await statement.run()); sqlite.exec("COMMIT"); return results; }
    catch (error) { sqlite.exec("ROLLBACK"); throw error; }
  } };
  return { sqlite, db };
}

const fixturePassword = "synthetic test password only";
const salt = randomBytes(32);
const passwordHash = `pbkdf2-sha256$100000$${salt.toString("base64")}$${pbkdf2Sync(fixturePassword, salt, 100000, 32, "sha256").toString("base64")}`;
function configure(db) {
  Object.assign(testEnv, { DB: db, CMS_ADMIN_EMAIL: "owner@example.test", CMS_LOGIN_EMAIL: "administrator@example.test", CMS_PASSWORD_HASH: passwordHash });
}
function request(path = "/api/auth/login", options = {}) {
  const headers = new Headers({ origin: "https://site.example", "oai-authenticated-user-id": "owner-stable-id", "oai-authenticated-user-email": "owner@example.test", "cf-connecting-ip": "192.0.2.1", ...options.headers });
  return new Request(`https://site.example${path}`, { method: options.method ?? "POST", headers, body: options.body });
}
function loginRequest(username, password, headers = {}) {
  return request("/api/auth/login", { headers: { "content-type": "application/json", ...headers }, body: JSON.stringify({ username, password }) });
}

test("production PBKDF2 verifier matches Node's decoded-salt SHA-256 derivation and fails closed", async () => {
  assert.equal(await auth.verifyCmsPassword(fixturePassword, passwordHash), true);
  assert.equal(await auth.verifyCmsPassword("wrong", passwordHash), false);
  for (const invalid of [undefined, "", passwordHash.replace("100000", "1000"), "pbkdf2-sha256$100000$%%%$%%%", passwordHash.replace("pbkdf2-sha256", "sha256")]) {
    assert.equal(await auth.verifyCmsPassword(fixturePassword, invalid), false);
  }
  assert.equal(auth.cmsLoginConfigured("administrator@example.test", passwordHash), true);
  assert.equal(auth.cmsLoginConfigured("", passwordHash), false);
});

test("opaque sessions store only hashes, bind owner and credential version, expire absolutely and revoke", async () => {
  const { sqlite, db } = database();
  const version = await auth.cmsCredentialVersion("administrator@example.test", passwordHash);
  const token = await auth.createCmsSession(db, "owner-stable-id", version, 1000);
  const second = await auth.createCmsSession(db, "owner-stable-id", version, 1000);
  assert.match(token, /^[A-Za-z0-9_-]{43}$/);
  assert.notEqual(token, second);
  const stored = sqlite.prepare("SELECT * FROM cms_admin_sessions WHERE token_hash = ?").get(await auth.sha256Cms(token));
  assert.notEqual(stored.token_hash, token);
  assert.equal(stored.expires_at, 1000 + 8 * 60 * 60 * 1000);
  assert.equal(await auth.hasCmsSession(db, token, "owner-stable-id", version, stored.expires_at - 1), true);
  assert.equal(await auth.hasCmsSession(db, token, "owner-stable-id", version, stored.expires_at), false);
  assert.equal(await auth.hasCmsSession(db, token, "different-owner-id", version, 1000), false);
  assert.equal(await auth.hasCmsSession(db, token, "owner-stable-id", "rotated-credentials", 1000), false);
  await auth.revokeCmsSession(db, token, "different-owner-id");
  assert.equal(await auth.hasCmsSession(db, token, "owner-stable-id", version, 1000), true);
  await auth.revokeCmsSession(db, token, "owner-stable-id");
  assert.equal(await auth.hasCmsSession(db, token, "owner-stable-id", version, 1000), false);
  sqlite.close();
});

test("session cookie is host-only Secure HttpOnly Strict and rejects duplicate or malformed tokens", () => {
  const token = "a".repeat(43);
  const cookie = auth.cmsSessionCookie(token);
  for (const attribute of ["__Host-m3_admin=", "Path=/", "Max-Age=28800", "Secure", "HttpOnly", "SameSite=Strict"]) assert.ok(cookie.includes(attribute));
  assert.equal(cookie.includes("Domain="), false);
  assert.match(auth.clearCmsSessionCookie(), /Max-Age=0/);
  assert.equal(auth.cmsSessionToken(request("/", { headers: { cookie: `__Host-m3_admin=${token}` } })), token);
  assert.equal(auth.cmsSessionToken(request("/", { headers: { cookie: `__Host-m3_admin=${token}; __Host-m3_admin=${token}` } })), null);
  assert.equal(auth.cmsSessionToken(request("/", { headers: { cookie: "__Host-m3_admin=invalid" } })), null);
});

test("atomic login limit admits exactly ten racing attempts and resets only after window expiry", async () => {
  const { sqlite, db } = database();
  const attempts = await Promise.all(Array.from({ length: 30 }, () => auth.consumeCmsLoginAttempt(db, "trusted-key", 1000)));
  assert.equal(attempts.filter((attempt) => attempt.allowed).length, 10);
  assert.equal(sqlite.prepare("SELECT attempts FROM cms_login_attempts").get().attempts, 10);
  const stale = await auth.consumeCmsLoginAttempt(db, "trusted-key", 1000 + auth.CMS_LOGIN_WINDOW_MS - 1);
  assert.deepEqual(stale, { allowed: false, retryAfter: 1 });
  assert.equal((await auth.consumeCmsLoginAttempt(db, "trusted-key", 1000 + auth.CMS_LOGIN_WINDOW_MS)).allowed, true);
  assert.equal(sqlite.prepare("SELECT attempts FROM cms_login_attempts").get().attempts, 1);
  const first = request();
  const changedHost = new Request("https://another.example/api/auth/login", { headers: first.headers });
  assert.equal(await auth.cmsRateLimitKey(first), await auth.cmsRateLimitKey(changedHost));
  const changedIp = request("/", { headers: { "cf-connecting-ip": "192.0.2.2" } });
  assert.notEqual(await auth.cmsRateLimitKey(first), await auth.cmsRateLimitKey(changedIp));
  assert.equal(await auth.cmsIdentityRateLimitKey(first), await auth.cmsIdentityRateLimitKey(changedIp));
  sqlite.close();
});

test("expired-row cleanup is bounded to 100 per table and preserves active rows", async () => {
  const { sqlite, db } = database();
  for (let index = 0; index < 150; index++) {
    sqlite.prepare("INSERT INTO cms_login_attempts VALUES (?, 10, 1)").run(`expired-${index}`);
    sqlite.prepare("INSERT INTO cms_admin_sessions VALUES (?, 'owner', 'version', 0, 1)").run(`expired-${index}`);
  }
  sqlite.prepare("INSERT INTO cms_login_attempts VALUES ('active', 1, 99999)").run();
  await auth.cleanupCmsAuth(db, 1000);
  assert.equal(sqlite.prepare("SELECT COUNT(*) AS count FROM cms_login_attempts").get().count, 51);
  assert.equal(sqlite.prepare("SELECT COUNT(*) AS count FROM cms_admin_sessions").get().count, 50);
  assert.ok(sqlite.prepare("SELECT * FROM cms_login_attempts WHERE key = 'active'").get());
  sqlite.close();
});

test("production login and admin gate require both owner identity and correct custom credentials", async () => {
  const { sqlite, db } = database(); configure(db);
  await assert.rejects(getCmsAdmin(request()), (error) => error.status === 401);
  const failures = [];
  for (const [username, password, headers] of [
    ["incorrect@example.test", fixturePassword, {}],
    ["administrator@example.test", "incorrect", {}],
    ["administrator@example.test", fixturePassword, { "oai-authenticated-user-email": "stranger@example.test" }],
    ["administrator@example.test", fixturePassword, { "oai-authenticated-user-id": "" }],
  ]) {
    const response = await login(loginRequest(username, password, headers));
    assert.equal(response.status, 401);
    assert.equal(response.headers.get("set-cookie"), null);
    failures.push(await response.json());
  }
  assert.ok(failures.every((failure) => JSON.stringify(failure) === JSON.stringify(failures[0])));
  const response = await login(loginRequest(" Administrator@Example.Test ", fixturePassword));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { authenticated: true, redirect: "/admin" });
  const cookie = response.headers.get("set-cookie").split(";")[0];
  assert.equal((await getCmsAdmin(request("/", { headers: { cookie } }))).id, "owner-stable-id");
  await assert.rejects(getCmsAdmin(request("/", { headers: { cookie, "oai-authenticated-user-id": "another-stable-id" } })), (error) => error.status === 401);
  await assert.rejects(getCmsAdmin(request("/", { headers: { cookie, "oai-authenticated-user-email": "another@example.test" } })), (error) => error.status === 403);
  testEnv.CMS_PASSWORD_HASH = passwordHash.replace(salt.toString("base64"), randomBytes(32).toString("base64"));
  await assert.rejects(getCmsAdmin(request("/", { headers: { cookie } })), (error) => error.status === 401);
  testEnv.CMS_PASSWORD_HASH = undefined;
  await assert.rejects(getCmsAdmin(request("/", { headers: { cookie } })), (error) => error.status === 401);
  sqlite.close();
});

test("login throttles generic failures and rejects cross-origin requests before creating sessions", async () => {
  const { sqlite, db } = database(); configure(db);
  assert.equal((await login(loginRequest("administrator@example.test", fixturePassword, { origin: "https://evil.example" }))).status, 403);
  for (let index = 0; index < 10; index++) assert.equal((await login(loginRequest("administrator@example.test", "incorrect"))).status, 401);
  const response = await login(loginRequest("administrator@example.test", fixturePassword, { "cf-connecting-ip": "192.0.2.250" }));
  assert.equal(response.status, 429);
  assert.ok(Number(response.headers.get("retry-after")) > 0);
  assert.equal(sqlite.prepare("SELECT COUNT(*) AS count FROM cms_admin_sessions").get().count, 0);
  sqlite.close();
});

test("production logout enforces owner and origin, revokes DB session and expires cookie", async () => {
  const { sqlite, db } = database(); configure(db);
  const loggedIn = await login(loginRequest("administrator@example.test", fixturePassword));
  const cookie = loggedIn.headers.get("set-cookie").split(";")[0];
  assert.equal((await logout(request("/api/auth/logout", { headers: { cookie, origin: "https://evil.example" } }))).status, 403);
  assert.equal((await logout(request("/api/auth/logout", { headers: { cookie, "oai-authenticated-user-email": "another@example.test" } }))).status, 403);
  assert.equal((await getCmsAdmin(request("/", { headers: { cookie } }))).id, "owner-stable-id");
  const response = await logout(request("/api/auth/logout", { headers: { cookie } }));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { authenticated: false, redirect: "/#giris" });
  assert.match(response.headers.get("set-cookie"), /Max-Age=0/);
  await assert.rejects(getCmsAdmin(request("/", { headers: { cookie } })), (error) => error.status === 401);
  assert.equal(sqlite.prepare("SELECT COUNT(*) AS count FROM cms_admin_sessions").get().count, 0);
  sqlite.close();
});
